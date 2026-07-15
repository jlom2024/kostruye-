-- ── Generación de Valorizaciones (Lógica Core) ───────────────────────────

CREATE OR REPLACE FUNCTION public.fn_generate_valorization(
    p_project_id UUID,
    p_period_name TEXT,
    p_start_date DATE,
    p_end_date DATE,
    p_formula_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_val_id UUID;
    v_budget_id UUID;
    v_val_number INT;
    v_total_amount NUMERIC(15,2) := 0;
    v_factor_k NUMERIC(10,4) := 1.0000;
    v_reajuste NUMERIC(15,2) := 0;
    
    v_year INT := EXTRACT(YEAR FROM p_end_date);
    v_month INT := EXTRACT(MONTH FROM p_end_date);
BEGIN
    -- 1. Obtener el presupuesto activo del proyecto
    SELECT id INTO v_budget_id FROM public.budgets WHERE project_id = p_project_id LIMIT 1;
    IF v_budget_id IS NULL THEN
        RAISE EXCEPTION 'No active budget found for project %', p_project_id;
    END IF;

    -- 2. Determinar número de valorización
    SELECT COALESCE(MAX(val_number), 0) + 1 INTO v_val_number 
    FROM public.valorizaciones WHERE project_id = p_project_id;

    -- 3. Calcular Factor K si hay fórmula
    IF p_formula_id IS NOT NULL THEN
        v_factor_k := public.fn_calc_factor_k(p_formula_id, v_year, v_month);
    END IF;

    -- 4. Crear cabecera de Valorización
    INSERT INTO public.valorizaciones (
        project_id, val_number, period_name, start_date, end_date, 
        status, total_amount, reajuste_formula_id, factor_k, monto_reajuste
    ) VALUES (
        p_project_id, v_val_number, p_period_name, p_start_date, p_end_date, 
        'draft', 0, p_formula_id, v_factor_k, 0
    ) RETURNING id INTO v_val_id;

    -- 5. Insertar y Calcular Items
    -- Iteramos por cada partida del presupuesto
    -- Calculamos el avance previo (sumando las valorizaciones anteriores)
    -- Calculamos el avance del periodo actual desde los daily_progress_entries
    
    -- Usaremos un CTE para consolidar los montos de avance del mes
    WITH period_progress AS (
        SELECT 
            dpe.budget_item_id,
            COALESCE(SUM(dpe.executed_quantity), 0) as period_qty
        FROM public.daily_progress_entries dpe
        JOIN public.daily_progress_logs dpl ON dpe.log_id = dpl.id
        WHERE dpl.project_id = p_project_id
          AND dpl.date >= p_start_date 
          AND dpl.date <= p_end_date
          AND dpl.status = 'approved'
        GROUP BY dpe.budget_item_id
    ),
    prev_progress AS (
        SELECT 
            vi.budget_item_id,
            COALESCE(SUM(vi.period_amount), 0) as prev_qty
        FROM public.valorizacion_items vi
        JOIN public.valorizaciones v ON vi.valorizacion_id = v.id
        WHERE v.project_id = p_project_id
          AND v.val_number < v_val_number
          AND v.status != 'cancelled'
        GROUP BY vi.budget_item_id
    )
    INSERT INTO public.valorizacion_items (
        valorizacion_id, budget_item_id, 
        prev_percent, period_percent, cumul_percent, 
        item_total, period_amount, cumul_amount
    )
    SELECT 
        v_val_id,
        b.id,
        CASE WHEN b.quantity > 0 THEN COALESCE(prv.prev_qty, 0) / b.quantity ELSE 0 END,
        CASE WHEN b.quantity > 0 THEN COALESCE(per.period_qty, 0) / b.quantity ELSE 0 END,
        CASE WHEN b.quantity > 0 THEN (COALESCE(prv.prev_qty, 0) + COALESCE(per.period_qty, 0)) / b.quantity ELSE 0 END,
        COALESCE(per.period_qty, 0) * b.price, -- valorizado del mes
        COALESCE(per.period_qty, 0),          -- cantidad del mes
        COALESCE(prv.prev_qty, 0) + COALESCE(per.period_qty, 0) -- cantidad acumulada
    FROM public.budget_items b
    LEFT JOIN period_progress per ON b.id = per.budget_item_id
    LEFT JOIN prev_progress prv ON b.id = prv.budget_item_id
    WHERE b.budget_id = v_budget_id;

    -- 6. Actualizar totales en la cabecera
    SELECT COALESCE(SUM(item_total), 0) INTO v_total_amount
    FROM public.valorizacion_items
    WHERE valorizacion_id = v_val_id;

    -- Reajuste = Total del Mes * (Factor K - 1)
    v_reajuste := v_total_amount * (v_factor_k - 1);

    UPDATE public.valorizaciones
    SET total_amount = v_total_amount,
        monto_reajuste = v_reajuste
    WHERE id = v_val_id;

    RETURN v_val_id;
END;
$$;
