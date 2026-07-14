-- ================================================================
-- Kostruye+ — Migración 023 (v3 DEFINITIVA)
-- Performance: Índices compuestos, Vistas Materializadas y pg_cron
-- Columnas verificadas directamente en el código fuente (insert payloads).
-- 2026-07-14 | KREO IA Studio — Houston (Gemini)
-- ================================================================

-- ── 1. ÍNDICES EN TABLAS VERIFICADAS ──────────────────────────────

-- stock_items: tiene project_id ✅
CREATE INDEX IF NOT EXISTS idx_stock_items_project_name
  ON stock_items (project_id, name);

-- stock_entries: tiene project_id, stock_item_id, entry_date ✅
CREATE INDEX IF NOT EXISTS idx_stock_entries_project_date
  ON stock_entries (project_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_stock_entries_item_project
  ON stock_entries (stock_item_id, project_id);

-- stock_withdrawals: tiene project_id, stock_item_id, budget_item_id, withdrawal_date ✅
CREATE INDEX IF NOT EXISTS idx_stock_withdrawals_project_date
  ON stock_withdrawals (project_id, withdrawal_date DESC);

CREATE INDEX IF NOT EXISTS idx_stock_withdrawals_budget_item
  ON stock_withdrawals (budget_item_id, project_id);

-- purchase_orders: tiene project_id, status, supplier_id ✅
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project_status
  ON purchase_orders (project_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_project_supplier
  ON purchase_orders (project_id, supplier_id)
  WHERE supplier_id IS NOT NULL;

-- purchase_order_items: columnas reales: purchase_order_id, description, unit,
--   quantity, unit_price, total, sort_order. Sin project_id ni budget_item_id.
CREATE INDEX IF NOT EXISTS idx_poi_purchase_order
  ON purchase_order_items (purchase_order_id);

-- service_orders: tiene project_id, organization_id, status, supplier_id ✅
CREATE INDEX IF NOT EXISTS idx_service_orders_project_status
  ON service_orders (project_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_orders_supplier
  ON service_orders (supplier_id)
  WHERE supplier_id IS NOT NULL;

-- payroll_periods: tiene project_id, status, start_date ✅
CREATE INDEX IF NOT EXISTS idx_payroll_periods_project_date
  ON payroll_periods (project_id, start_date DESC);

-- payroll_entries: NO tiene project_id — tiene period_id, worker_id ✅
CREATE INDEX IF NOT EXISTS idx_payroll_entries_period
  ON payroll_entries (period_id);

CREATE INDEX IF NOT EXISTS idx_payroll_entries_worker
  ON payroll_entries (worker_id, period_id);

-- workers: tiene project_id, is_active ✅
CREATE INDEX IF NOT EXISTS idx_workers_project_active
  ON workers (project_id, is_active);

-- valorizaciones: columnas reales: project_id, val_number, status, start_date, end_date ✅
CREATE INDEX IF NOT EXISTS idx_valorizaciones_project_status
  ON valorizaciones (project_id, status, start_date DESC);

-- electronic_invoices: tiene organization_id, project_id, estado_sunat, fecha_emision ✅
CREATE INDEX IF NOT EXISTS idx_einvoices_org_estado
  ON electronic_invoices (organization_id, estado_sunat)
  WHERE estado_sunat IN ('pendiente', 'enviado');

CREATE INDEX IF NOT EXISTS idx_einvoices_org_date
  ON electronic_invoices (organization_id, fecha_emision DESC);

-- budget_items: tiene budget_id, chapter_id ✅
CREATE INDEX IF NOT EXISTS idx_budget_items_budget_chapter
  ON budget_items (budget_id, chapter_id);

-- apu_lines: tiene budget_item_id ✅
CREATE INDEX IF NOT EXISTS idx_apu_lines_budget_item
  ON apu_lines (budget_item_id);

-- audit_logs: columnas reales: table_name, record_id, operation, changed_by, changed_at ✅
-- (ya existen idx_audit_table_record e idx_audit_changed_at desde migración 016)
-- Agregamos índice compuesto para el módulo Auditoría del dashboard:
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_changed_at
  ON audit_logs (table_name, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date
  ON audit_logs (changed_by, changed_at DESC)
  WHERE changed_by IS NOT NULL;

-- inei_indices: tiene period_year, period_month ✅
CREATE INDEX IF NOT EXISTS idx_inei_year_month
  ON inei_indices (period_year DESC, period_month DESC);

-- suppliers / clients: tienen organization_id ✅
CREATE INDEX IF NOT EXISTS idx_suppliers_org_name
  ON suppliers (organization_id, name);

CREATE INDEX IF NOT EXISTS idx_clients_org_name
  ON clients (organization_id, name);


-- ── 2. VISTA MATERIALIZADA: mv_project_cost_snapshot ──────────────
-- Costo ejecutado por proyecto por semana.
-- Fuentes verificadas: purchase_orders (total), service_orders (amount),
--                      payroll_periods (total_net).

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_project_cost_snapshot AS
WITH weekly_compras AS (
  SELECT
    project_id,
    date_trunc('week', created_at)::date AS snapshot_date,
    SUM(total)                           AS cost_compras
  FROM purchase_orders
  WHERE status NOT IN ('cancelled')
    AND project_id IS NOT NULL
  GROUP BY project_id, snapshot_date
),
weekly_servicios AS (
  SELECT
    project_id,
    date_trunc('week', created_at)::date AS snapshot_date,
    SUM(amount)                          AS cost_servicios
  FROM service_orders
  WHERE status NOT IN ('cancelled')
    AND project_id IS NOT NULL
  GROUP BY project_id, snapshot_date
),
weekly_nominas AS (
  SELECT
    project_id,
    date_trunc('week', start_date)::date AS snapshot_date,
    SUM(total_net)                        AS cost_nominas
  FROM payroll_periods
  WHERE project_id IS NOT NULL
  GROUP BY project_id, snapshot_date
)
SELECT
  COALESCE(c.project_id, s.project_id, n.project_id)           AS project_id,
  COALESCE(c.snapshot_date, s.snapshot_date, n.snapshot_date)  AS snapshot_date,
  COALESCE(c.cost_compras,   0)                                 AS cost_compras,
  COALESCE(s.cost_servicios, 0)                                 AS cost_servicios,
  COALESCE(n.cost_nominas,   0)                                 AS cost_nominas,
  COALESCE(c.cost_compras, 0)
    + COALESCE(s.cost_servicios, 0)
    + COALESCE(n.cost_nominas, 0)                               AS cost_total,
  NOW()                                                         AS refreshed_at
FROM weekly_compras c
FULL OUTER JOIN weekly_servicios s
  ON  s.project_id   = c.project_id
  AND s.snapshot_date = c.snapshot_date
FULL OUTER JOIN weekly_nominas n
  ON  n.project_id   = COALESCE(c.project_id, s.project_id)
  AND n.snapshot_date = COALESCE(c.snapshot_date, s.snapshot_date);

-- Índice único para REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_cost_snapshot_pk
  ON mv_project_cost_snapshot (project_id, snapshot_date);

CREATE INDEX IF NOT EXISTS idx_mv_cost_snapshot_project
  ON mv_project_cost_snapshot (project_id, snapshot_date ASC);

COMMENT ON MATERIALIZED VIEW mv_project_cost_snapshot IS
  'Snapshot semanal de costos ejecutados por proyecto. '
  'Fuentes: purchase_orders + service_orders + payroll_periods. '
  'Se refresca cada noche a las 02:00 Lima (07:00 UTC) por pg_cron. '
  'Usar para: Curvas S, Control de Costos, Dashboard Gerencial.';


-- ── 3. VISTA MATERIALIZADA: mv_project_budget_summary ─────────────
-- Presupuestado vs ejecutado por proyecto.

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_project_budget_summary AS
SELECT
  b.project_id,
  b.id             AS budget_id,
  b.name           AS budget_name,
  b.budget_type,
  b.total          AS budget_total,
  COALESCE(snap.cost_total_accum, 0)              AS executed_total,
  b.total - COALESCE(snap.cost_total_accum, 0)    AS budget_remaining,
  CASE
    WHEN b.total > 0
    THEN ROUND((COALESCE(snap.cost_total_accum, 0) / b.total) * 100, 2)
    ELSE 0
  END              AS execution_pct,
  NOW()            AS refreshed_at
FROM budgets b
LEFT JOIN (
  SELECT project_id, SUM(cost_total) AS cost_total_accum
  FROM mv_project_cost_snapshot
  GROUP BY project_id
) snap ON snap.project_id = b.project_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_budget_summary_pk
  ON mv_project_budget_summary (budget_id);

CREATE INDEX IF NOT EXISTS idx_mv_budget_summary_project
  ON mv_project_budget_summary (project_id);

COMMENT ON MATERIALIZED VIEW mv_project_budget_summary IS
  'Presupuestado vs ejecutado por presupuesto y proyecto. '
  'Depende de mv_project_cost_snapshot. '
  'Usar para: Control de Costos, Dashboard, Alertas de Sobregasto.';


-- ── 4. pg_cron: REFRESH AUTOMÁTICO NOCTURNO ───────────────────────
-- Si da error "extension already exists", omitir esta línea.
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'refresh-cost-snapshot',
  '0 7 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_project_cost_snapshot$$
);

SELECT cron.schedule(
  'refresh-budget-summary',
  '5 7 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_project_budget_summary$$
);


-- ── 5. FUNCIÓN HELPER: REFRESH MANUAL ─────────────────────────────
CREATE OR REPLACE FUNCTION fn_refresh_all_mvs()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_project_cost_snapshot;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_project_budget_summary;
  RETURN 'OK — Refreshed at ' || NOW()::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION fn_refresh_all_mvs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_refresh_all_mvs() TO service_role;


-- ── FIN MIGRACIÓN 023 (v3 DEFINITIVA) ────────────────────────────
