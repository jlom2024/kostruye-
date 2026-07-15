-- ── Función: Generar Nómina desde Tareo Diario ─────────────────────────────
-- Toma el rango de fechas de un periodo de nómina y suma las horas
-- de los tareo_entries de ese período para calcular los días trabajados.

CREATE OR REPLACE FUNCTION public.fn_generate_payroll_from_tareo(
    p_period_id UUID
)
RETURNS INTEGER  -- Retorna la cantidad de entradas generadas
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project_id UUID;
    v_start_date DATE;
    v_end_date DATE;
    v_entries_count INT := 0;
    v_period_status TEXT;
BEGIN
    -- 1. Validar que el periodo exista y esté abierto
    SELECT project_id, start_date, end_date, status 
    INTO v_project_id, v_start_date, v_end_date, v_period_status
    FROM public.payroll_periods
    WHERE id = p_period_id;

    IF v_project_id IS NULL THEN
        RAISE EXCEPTION 'Periodo de nómina no encontrado: %', p_period_id;
    END IF;

    IF v_period_status != 'open' THEN
        RAISE EXCEPTION 'El periodo de nómina no está abierto. Estado actual: %', v_period_status;
    END IF;

    -- 2. Borrar entradas previas del periodo (para recalcular limpiamente)
    DELETE FROM public.payroll_entries WHERE period_id = p_period_id;

    -- 3. Generar entradas para cada trabajador activo con tareo en el periodo
    -- Las horas trabajadas / 8 = días trabajados (jornada estándar)
    WITH tareo_summary AS (
        SELECT 
            te.worker_id,
            SUM(te.hours_worked + COALESCE(te.overtime_hours, 0)) AS total_hours,
            -- Días equivalentes (jornada de 8 horas normales)
            ROUND(SUM(te.hours_worked) / 8.0, 2) AS days_worked,
            ROUND(SUM(COALESCE(te.overtime_hours, 0)), 2) AS overtime_hours
        FROM public.tareo_entries te
        JOIN public.tareos t ON te.tareo_id = t.id
        JOIN public.workers w ON te.worker_id = w.id
        WHERE t.project_id = v_project_id
          AND t.date BETWEEN v_start_date AND v_end_date
          AND t.status = 'approved'
          AND w.is_active = TRUE
        GROUP BY te.worker_id
        HAVING SUM(te.hours_worked) > 0
    )
    INSERT INTO public.payroll_entries (
        period_id, worker_id, days_worked,
        daily_wage, gross_pay, deductions, net_pay, notes
    )
    SELECT 
        p_period_id,
        ts.worker_id,
        ts.days_worked,
        w.daily_wage,
        -- Pago bruto: (días × jornal) + (horas extras × jornal/8 × 1.25)
        ROUND((ts.days_worked * w.daily_wage) + (ts.overtime_hours * (w.daily_wage / 8.0) * 1.25), 2),
        -- Deducción por defecto 0 (se puede ajustar manualmente después)
        0,
        -- Neto = Bruto por ahora
        ROUND((ts.days_worked * w.daily_wage) + (ts.overtime_hours * (w.daily_wage / 8.0) * 1.25), 2),
        'Generado automáticamente desde tareo ' || v_start_date || ' al ' || v_end_date
    FROM tareo_summary ts
    JOIN public.workers w ON w.id = ts.worker_id;

    GET DIAGNOSTICS v_entries_count = ROW_COUNT;

    -- 4. Actualizar totales del periodo
    UPDATE public.payroll_periods
    SET 
        total_gross = (SELECT COALESCE(SUM(gross_pay), 0) FROM public.payroll_entries WHERE period_id = p_period_id),
        total_net   = (SELECT COALESCE(SUM(net_pay), 0) FROM public.payroll_entries WHERE period_id = p_period_id),
        updated_at  = now()
    WHERE id = p_period_id;

    RETURN v_entries_count;
END;
$$;
