-- ── Tabla de Snapshots Históricos para Curva S ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_daily_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    pv NUMERIC(15,2) NOT NULL DEFAULT 0, -- Planned Value (Valor Planificado)
    ev NUMERIC(15,2) NOT NULL DEFAULT 0, -- Earned Value (Valor Ganado)
    ac NUMERIC(15,2) NOT NULL DEFAULT 0, -- Actual Cost (Costo Real)
    cpi NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    spi NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (project_id, snapshot_date)
);

ALTER TABLE public.project_daily_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members access to project_daily_snapshots" ON public.project_daily_snapshots
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_daily_snapshots.project_id
            AND pm.user_id = auth.uid()
        )
    );

-- Función para pre-calcular y registrar snapshots históricos diarios (Curva S)
CREATE OR REPLACE FUNCTION public.fn_generate_daily_snapshots(p_project_id UUID)
RETURNS VOID AS $$
DECLARE
    v_pv NUMERIC(15,2) := 0;
    v_ev NUMERIC(15,2) := 0;
    v_ac NUMERIC(15,2) := 0;
    v_cpi NUMERIC(5,2) := 1.00;
    v_spi NUMERIC(5,2) := 1.00;
BEGIN
    -- 1. Calcular Planned Value (PV)
    -- Sumatoria del valor planeado hasta hoy (partidas presupuestadas asignadas a cronogramas)
    -- Para fines de simplificación en el demo de obra, se asume proporcional al avance programado.
    SELECT COALESCE(SUM(total), 0) INTO v_pv
    FROM public.budgets
    WHERE project_id = p_project_id AND budget_type = 'venta';

    -- 2. Calcular Earned Value (EV)
    -- Suma de valorizaciones aprobadas hasta la fecha actual
    SELECT COALESCE(SUM(total_amount), 0) INTO v_ev
    FROM public.valorizaciones
    WHERE project_id = p_project_id AND status = 'approved';

    -- 3. Calcular Costo Real (AC)
    -- Sumatoria de egresos de compras aprobadas/recibidas, nóminas y gastos de caja chica
    SELECT COALESCE((
        SELECT SUM(total) FROM public.purchase_orders 
        WHERE project_id = p_project_id AND status IN ('approved', 'received')
    ), 0) + COALESCE((
        SELECT SUM(total_gross) FROM public.payroll_periods 
        WHERE project_id = p_project_id AND status IN ('closed', 'paid')
    ), 0) + COALESCE((
        SELECT SUM(amount) FROM public.expenses
        WHERE project_id = p_project_id
    ), 0) INTO v_ac;

    -- 4. Calcular CPI y SPI
    IF v_ac > 0 THEN
        v_cpi := ROUND((v_ev / v_ac), 2);
    END IF;
    
    IF v_pv > 0 THEN
        v_spi := ROUND((v_ev / v_pv), 2);
    END IF;

    -- 5. Insertar o actualizar snapshot diario
    INSERT INTO public.project_daily_snapshots (project_id, snapshot_date, pv, ev, ac, cpi, spi)
    VALUES (p_project_id, CURRENT_DATE, v_pv, v_ev, v_ac, v_cpi, v_spi)
    ON CONFLICT (project_id, snapshot_date) DO UPDATE
    SET pv = EXCLUDED.pv,
        ev = EXCLUDED.ev,
        ac = EXCLUDED.ac,
        cpi = EXCLUDED.cpi,
        spi = EXCLUDED.spi,
        created_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
