-- ================================================================
-- Kostruye+ — Migración 023
-- Performance: Índices compuestos, Vistas Materializadas y pg_cron
-- 2026-07-14 | KREO IA Studio — Houston (Gemini)
-- ================================================================

-- ── 1. ÍNDICES COMPUESTOS EN TABLAS HEAVY ─────────────────────────

-- Warehouse movements: filtro por proyecto + fecha + tipo
-- Query típico: "movimientos del almacén de obra X en el mes Y"
CREATE INDEX IF NOT EXISTS idx_warehouse_mvmt_project_date_type
  ON warehouse_movements (project_id, created_at DESC, movement_type);

CREATE INDEX IF NOT EXISTS idx_warehouse_mvmt_product_project
  ON warehouse_movements (product_id, project_id, created_at DESC);

-- Purchase orders: filtro por proyecto + estado + proveedor
-- Query típico: "órdenes de compra pendientes de aprobación en obra X"
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project_status_supplier
  ON purchase_orders (project_id, status, supplier_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_project_date
  ON purchase_orders (project_id, created_at DESC);

-- Purchase order items: para cálculos de costo por partida
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_project
  ON purchase_order_items (project_id, budget_item_id);

-- Service orders: mismo patrón que compras
CREATE INDEX IF NOT EXISTS idx_service_orders_project_status
  ON service_orders (project_id, status, created_at DESC);

-- Payroll entries: filtro por proyecto + período
-- Query típico: "nómina de obra X en el período de enero 2026"
CREATE INDEX IF NOT EXISTS idx_payroll_entries_project_period
  ON payroll_entries (project_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_payroll_workers_project
  ON payroll_workers (project_id);

-- Valorizaciones: filtro por proyecto + estado + período
-- Query típico: "valorizaciones aprobadas de obra X en 2026"
CREATE INDEX IF NOT EXISTS idx_valorizaciones_project_status_period
  ON valorizaciones (project_id, status, period_year DESC, period_month DESC);

-- Electronic invoices: filtro por org + proyecto + fecha
CREATE INDEX IF NOT EXISTS idx_einvoices_org_project_date
  ON electronic_invoices (organization_id, project_id, fecha_emision DESC);

CREATE INDEX IF NOT EXISTS idx_einvoices_org_estado
  ON electronic_invoices (organization_id, estado_sunat)
  WHERE estado_sunat IN ('pendiente', 'enviado');

-- Budget items: filtro por presupuesto + capítulo (roll-ups y control de costos)
CREATE INDEX IF NOT EXISTS idx_budget_items_budget_chapter
  ON budget_items (budget_id, chapter_id);

CREATE INDEX IF NOT EXISTS idx_budget_items_project
  ON budget_items (project_id)
  WHERE project_id IS NOT NULL;

-- APU lines: para roll-up y cálculos de costo unitario
CREATE INDEX IF NOT EXISTS idx_apu_lines_budget_item
  ON apu_lines (budget_item_id);

-- Audit logs: filtro por org + tabla + fecha (módulo auditoría)
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_date
  ON audit_logs (org_id, changed_at DESC)
  WHERE org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_date
  ON audit_logs (table_name, changed_at DESC);

-- INEI indices: ya tiene idx_inei_code_period desde migración 016
-- Agregar índice por año para consultas de historial completo
CREATE INDEX IF NOT EXISTS idx_inei_year_month
  ON inei_indices (period_year DESC, period_month DESC);

-- Suppliers / Clients: búsquedas por nombre y RUC
CREATE INDEX IF NOT EXISTS idx_suppliers_org_name
  ON suppliers (organization_id, name);

CREATE INDEX IF NOT EXISTS idx_clients_org_name
  ON clients (organization_id, name);


-- ── 2. VISTA MATERIALIZADA: project_cost_snapshot ─────────────────
-- Agrega los costos ejecutados por proyecto por día.
-- Fuente: purchase_order_items (compras) + service_orders (servicios) 
--         + payroll_entries (nóminas) + warehouse_movements salida.
-- Se refresca cada noche vía pg_cron (ver sección 3).

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_project_cost_snapshot AS
WITH daily_compras AS (
  SELECT
    poi.project_id,
    date_trunc('day', po.created_at)::date AS snapshot_date,
    SUM(poi.quantity * poi.unit_price)     AS cost_compras
  FROM purchase_order_items poi
  JOIN purchase_orders po ON po.id = poi.purchase_order_id
  WHERE po.status NOT IN ('cancelled', 'rejected')
    AND poi.project_id IS NOT NULL
  GROUP BY poi.project_id, snapshot_date
),
daily_servicios AS (
  SELECT
    project_id,
    date_trunc('day', created_at)::date AS snapshot_date,
    SUM(total_amount)                   AS cost_servicios
  FROM service_orders
  WHERE status NOT IN ('cancelled')
    AND project_id IS NOT NULL
  GROUP BY project_id, snapshot_date
),
daily_nominas AS (
  SELECT
    project_id,
    date_trunc('day', period_start)::date AS snapshot_date,
    SUM(net_pay)                           AS cost_nominas
  FROM payroll_entries
  WHERE project_id IS NOT NULL
  GROUP BY project_id, snapshot_date
)
SELECT
  COALESCE(c.project_id, s.project_id, n.project_id)       AS project_id,
  COALESCE(c.snapshot_date, s.snapshot_date, n.snapshot_date) AS snapshot_date,
  COALESCE(c.cost_compras,  0)  AS cost_compras,
  COALESCE(s.cost_servicios, 0) AS cost_servicios,
  COALESCE(n.cost_nominas,  0)  AS cost_nominas,
  COALESCE(c.cost_compras, 0) + COALESCE(s.cost_servicios, 0) + COALESCE(n.cost_nominas, 0) AS cost_total,
  NOW() AS refreshed_at
FROM daily_compras c
FULL OUTER JOIN daily_servicios s
  ON s.project_id = c.project_id AND s.snapshot_date = c.snapshot_date
FULL OUTER JOIN daily_nominas n
  ON n.project_id = COALESCE(c.project_id, s.project_id)
  AND n.snapshot_date = COALESCE(c.snapshot_date, s.snapshot_date);

-- Índice único para REFRESH CONCURRENTLY (requiere clave única)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_cost_snapshot_pk
  ON mv_project_cost_snapshot (project_id, snapshot_date);

-- Índice para consultas de curva S (rango de fechas por proyecto)
CREATE INDEX IF NOT EXISTS idx_mv_cost_snapshot_project_date
  ON mv_project_cost_snapshot (project_id, snapshot_date ASC);

COMMENT ON MATERIALIZED VIEW mv_project_cost_snapshot IS
  'Snapshot diario de costos ejecutados por proyecto. '
  'Se refresca cada noche a las 02:00 AM por pg_cron. '
  'Usar para: Curvas S, Control de Costos, Earned Value, Dashboard Gerencial.';


-- ── 3. VISTA MATERIALIZADA: project_budget_summary ────────────────
-- Resumen presupuestario por proyecto: monto presupuestado vs ejecutado.
-- Base para el Control de Costos y el módulo de Análisis de Desviaciones.

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_project_budget_summary AS
SELECT
  b.project_id,
  b.id              AS budget_id,
  b.name            AS budget_name,
  b.type            AS budget_type,   -- 'venta' | 'meta'
  b.total           AS budget_total,
  COALESCE(snap.cost_total_accumulated, 0) AS executed_total,
  b.total - COALESCE(snap.cost_total_accumulated, 0) AS budget_remaining,
  CASE
    WHEN b.total > 0
    THEN ROUND((COALESCE(snap.cost_total_accumulated, 0) / b.total) * 100, 2)
    ELSE 0
  END               AS execution_pct,
  NOW()             AS refreshed_at
FROM budgets b
LEFT JOIN (
  SELECT project_id, SUM(cost_total) AS cost_total_accumulated
  FROM mv_project_cost_snapshot
  GROUP BY project_id
) snap ON snap.project_id = b.project_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_budget_summary_pk
  ON mv_project_budget_summary (budget_id);

CREATE INDEX IF NOT EXISTS idx_mv_budget_summary_project
  ON mv_project_budget_summary (project_id);

COMMENT ON MATERIALIZED VIEW mv_project_budget_summary IS
  'Resumen presupuestado vs ejecutado por presupuesto y proyecto. '
  'Depende de mv_project_cost_snapshot — refrescar en el mismo orden. '
  'Usar para: Control de Costos, Dashboard, Alertas de Sobregasto.';


-- ── 4. pg_cron: REFRESH AUTOMÁTICO NOCTURNO ───────────────────────
-- Requiere extensión pg_cron (disponible en Supabase Cloud).
-- El refresh se ejecuta en orden: primero cost_snapshot, luego budget_summary
-- (porque budget_summary depende de cost_snapshot).

-- Habilitar extensión si no está activa
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Job 1: Refresh cost snapshot a las 02:00 AM UTC (= 21:00 Lima / -05:00)
SELECT cron.schedule(
  'refresh-cost-snapshot',
  '0 7 * * *',  -- 02:00 Lima = 07:00 UTC
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_project_cost_snapshot$$
);

-- Job 2: Refresh budget summary a las 02:05 AM UTC (5 min después)
SELECT cron.schedule(
  'refresh-budget-summary',
  '5 7 * * *',  -- 02:05 Lima = 07:05 UTC
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_project_budget_summary$$
);

COMMENT ON EXTENSION pg_cron IS
  'Scheduler de cron jobs dentro de PostgreSQL. '
  'Ver jobs activos: SELECT * FROM cron.job;';


-- ── 5. FUNCIÓN HELPER: REFRESH MANUAL ─────────────────────────────
-- Para forzar un refresh desde el Admin panel o después de importaciones grandes.

CREATE OR REPLACE FUNCTION fn_refresh_all_mvs()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_project_cost_snapshot;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_project_budget_summary;
  RETURN 'Refreshed at ' || NOW()::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION fn_refresh_all_mvs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_refresh_all_mvs() TO service_role;

COMMENT ON FUNCTION fn_refresh_all_mvs IS
  'Fuerza el refresh de todas las MVs de performance. '
  'Solo ejecutable por service_role. '
  'Llamar después de importaciones S10 masivas o correcciones de datos.';


-- ── FIN MIGRACIÓN 023 ─────────────────────────────────────────────
