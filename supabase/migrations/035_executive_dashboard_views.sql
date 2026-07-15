-- ── Vista: Dashboard Ejecutivo EVM + Flujo de Caja ────────────────────────────
-- Consolida datos de valorizaciones, compras y nóminas para el dashboard gerencial

CREATE OR REPLACE VIEW public.vw_executive_dashboard AS
WITH 
-- Presupuesto Meta del proyecto (activo)
presupuesto AS (
    SELECT 
        b.project_id,
        b.total AS budget_total
    FROM public.budgets b
    WHERE b.is_active = TRUE
),

-- Valorizaciones aprobadas acumuladas (ingresos reales)
valorizaciones_acum AS (
    SELECT 
        project_id,
        SUM(total_amount + monto_reajuste) AS total_invoiced,
        COUNT(*) AS total_vals
    FROM public.valorizaciones
    WHERE status = 'approved'
    GROUP BY project_id
),

-- Compras aprobadas/recibidas (egreso material)
egreso_compras AS (
    SELECT 
        project_id,
        SUM(total) AS total_compras
    FROM public.purchase_orders
    WHERE status NOT IN ('draft', 'cancelled')
    GROUP BY project_id
),

-- Nóminas pagadas (egreso mano de obra)
egreso_nominas AS (
    SELECT 
        project_id,
        SUM(total_net) AS total_nominas
    FROM public.payroll_periods
    WHERE status IN ('closed', 'paid')
    GROUP BY project_id
),

-- Avance físico real acumulado (suma de valorizacion_items)
avance_fisico AS (
    SELECT 
        val.project_id,
        COALESCE(SUM(vi.item_total), 0) AS costo_real_acum
    FROM public.valorizacion_items vi
    JOIN public.valorizaciones val ON vi.valorizacion_id = val.id
    WHERE val.status = 'approved'
    GROUP BY val.project_id
)

SELECT 
    p.id AS project_id,
    p.name AS project_name,
    p.start_date,
    p.end_date,
    p.status AS project_status,
    p.currency,

    -- Presupuesto
    COALESCE(pre.budget_total, 0) AS budget_total,

    -- Earned Value (EV) = Valor Ganado = Valorizado aprobado sin reajuste
    COALESCE(val.total_invoiced, 0) AS ev_total,
    COALESCE(val.total_vals, 0) AS total_valorizaciones,

    -- Costo Real (AC) = Actual Cost = Compras + Nóminas
    COALESCE(ec.total_compras, 0) + COALESCE(en.total_nominas, 0) AS ac_total,
    COALESCE(ec.total_compras, 0) AS costo_compras,
    COALESCE(en.total_nominas, 0) AS costo_nominas,

    -- CPI = EV / AC (> 1 = Bajo presupuesto, < 1 = Sobre presupuesto)
    CASE 
        WHEN (COALESCE(ec.total_compras, 0) + COALESCE(en.total_nominas, 0)) > 0 
        THEN ROUND(COALESCE(val.total_invoiced, 0) / (COALESCE(ec.total_compras, 0) + COALESCE(en.total_nominas, 0)), 3)
        ELSE NULL
    END AS cpi,

    -- Porcentaje de avance económico sobre presupuesto
    CASE 
        WHEN COALESCE(pre.budget_total, 0) > 0 
        THEN ROUND(COALESCE(val.total_invoiced, 0) / pre.budget_total * 100, 2)
        ELSE 0
    END AS pct_avance,

    -- Flujo de Caja: Ingresos - Egresos
    COALESCE(val.total_invoiced, 0) - (COALESCE(ec.total_compras, 0) + COALESCE(en.total_nominas, 0)) AS flujo_caja,

    -- Fecha de generación del snapshot
    now() AS snapshot_at

FROM public.projects p
LEFT JOIN presupuesto pre ON pre.project_id = p.id
LEFT JOIN valorizaciones_acum val ON val.project_id = p.id
LEFT JOIN egreso_compras ec ON ec.project_id = p.id
LEFT JOIN egreso_nominas en ON en.project_id = p.id
LEFT JOIN avance_fisico af ON af.project_id = p.id;

-- ── Vista: Curva S — Avance Mensual Acumulado ──────────────────────────────────
CREATE OR REPLACE VIEW public.vw_curva_s AS
SELECT 
    val.project_id,
    EXTRACT(YEAR FROM val.end_date)::INT AS anio,
    EXTRACT(MONTH FROM val.end_date)::INT AS mes,
    TO_CHAR(val.end_date, 'Mon YYYY') AS periodo_label,
    val.val_number,
    SUM(val.total_amount) OVER (
        PARTITION BY val.project_id 
        ORDER BY val.val_number
    ) AS monto_acumulado,
    SUM(val.total_amount + val.monto_reajuste) OVER (
        PARTITION BY val.project_id 
        ORDER BY val.val_number
    ) AS monto_acumulado_con_reajuste,
    val.total_amount AS monto_mes,
    val.monto_reajuste AS reajuste_mes,
    val.factor_k,
    val.status
FROM public.valorizaciones val
WHERE val.status IN ('approved', 'submitted')
ORDER BY val.project_id, val.val_number;
