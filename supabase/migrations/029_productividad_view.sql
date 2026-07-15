-- =================================================================================
-- Kostruye+ — Migración 029
-- Capa de Campo: Vista de Productividad (KPIs)
-- =================================================================================

-- Vista SQL que consolida las métricas reales de Campo cruzando:
-- 1. Avance Diario (Productividad física)
-- 2. Tareos (Horas Hombre reales)
-- 3. Partes de Equipos (Horas Máquina reales)

-- Usamos `security_invoker = on` para asegurar que se respeten las políticas RLS
-- de las tablas subyacentes cuando el frontend (Supabase Client) consulte la vista.

CREATE OR REPLACE VIEW public.vw_productivity_kpi WITH (security_invoker = on) AS
SELECT 
    bi.id AS budget_item_id,
    b.project_id,
    bi.item_code,
    bi.description AS item_name,
    bi.unit,
    bi.quantity AS theoretical_quantity,
    bi.unit_price AS theoretical_price,
    COALESCE(av.total_executed, 0) AS total_executed_quantity,
    COALESCE(hh.total_hh, 0) AS total_hh_used,
    COALESCE(hm.total_hm, 0) AS total_hm_used
FROM public.budget_items bi
JOIN public.budgets b ON bi.budget_id = b.id
LEFT JOIN (
    SELECT 
        e.budget_item_id,
        SUM(e.executed_quantity) AS total_executed
    FROM public.daily_progress_entries e
    JOIN public.daily_progress_logs l ON e.log_id = l.id
    -- Solo sumamos los partes aprobados (opcional, por ahora sumamos todos)
    -- WHERE l.status = 'approved'
    GROUP BY e.budget_item_id
) av ON av.budget_item_id = bi.id
LEFT JOIN (
    SELECT 
        te.budget_item_id,
        SUM(te.hours_worked) AS total_hh
    FROM public.tareo_entries te
    JOIN public.tareos t ON te.tareo_id = t.id
    -- Solo sumamos los tareos aprobados
    -- WHERE t.status = 'approved'
    GROUP BY te.budget_item_id
) hh ON hh.budget_item_id = bi.id
LEFT JOIN (
    SELECT 
        eq.budget_item_id,
        SUM(eq.worked_hours) AS total_hm
    FROM public.equipment_log_entries eq
    JOIN public.equipment_logs el ON eq.equipment_log_id = el.id
    -- Solo sumamos los partes de equipos aprobados
    -- WHERE el.status = 'approved'
    GROUP BY eq.budget_item_id
) hm ON hm.budget_item_id = bi.id;

-- Damos permisos de lectura a los usuarios autenticados y anonimos si fuera necesario
GRANT SELECT ON public.vw_productivity_kpi TO authenticated;
GRANT SELECT ON public.vw_productivity_kpi TO service_role;
