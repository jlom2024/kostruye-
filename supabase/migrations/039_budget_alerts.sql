-- ── Tabla de Alertas y Desviaciones de Presupuesto ────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('overrun', 'low_stock', 'delay')),
    severity VARCHAR(20) NOT NULL DEFAULT 'warning' CHECK (severity IN ('warning', 'critical')),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.project_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members access to project_alerts" ON public.project_alerts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_alerts.project_id
            AND pm.user_id = auth.uid()
        )
    );

-- Función para auditar y disparar alertas al exceder presupuesto meta por más de 5%
CREATE OR REPLACE FUNCTION public.fn_check_budget_deviations()
RETURNS TRIGGER AS $$
DECLARE
    v_project_id UUID;
    v_category VARCHAR(50);
    v_total_spent NUMERIC(15,2);
    v_meta_allocated NUMERIC(15,2);
    v_alert_message TEXT;
    v_percent_over NUMERIC(5,2);
BEGIN
    -- Determinar el project_id y la categoría dependiendo del origen del trigger
    IF TG_TABLE_NAME = 'expenses' THEN
        v_project_id := NEW.project_id;
        v_category := NEW.category;
    ELSIF TG_TABLE_NAME = 'purchase_orders' THEN
        -- Solo auditar OCs aprobadas o entregadas
        IF NEW.status IN ('approved', 'received') THEN
            v_project_id := NEW.project_id;
            -- Por defecto compras se asocian a materiales
            v_category := 'material';
        ELSE
            RETURN NEW;
        END IF;
    ELSIF TG_TABLE_NAME = 'payroll_periods' THEN
        -- Solo auditar planillas cerradas o pagadas
        IF NEW.status IN ('closed', 'paid') THEN
            v_project_id := NEW.project_id;
            v_category := 'labor';
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    IF v_project_id IS NULL OR v_category IS NULL THEN
        RETURN NEW;
    END IF;

    -- 1. Calcular el total gastado en esta categoría del proyecto
    -- Sumarizar gastos de caja chica / misceláneos
    SELECT COALESCE(SUM(amount), 0) INTO v_total_spent
    FROM public.expenses
    WHERE project_id = v_project_id AND category = v_category;

    -- Sumarizar compras asociadas a la categoría de materiales
    IF v_category = 'material' THEN
        v_total_spent := v_total_spent + COALESCE((
            SELECT SUM(total) FROM public.purchase_orders 
            WHERE project_id = v_project_id AND status IN ('approved', 'received')
        ), 0);
    END IF;

    -- Sumarizar nóminas asociadas a la categoría de mano de obra
    IF v_category = 'labor' THEN
        v_total_spent := v_total_spent + COALESCE((
            SELECT SUM(total_gross) FROM public.payroll_periods 
            WHERE project_id = v_project_id AND status IN ('closed', 'paid')
        ), 0);
    END IF;

    -- 2. Obtener el presupuesto meta asignado para esta categoría del proyecto
    -- Se asume una relación lógica entre categorías y cuentas de presupuesto
    SELECT COALESCE(total, 0) INTO v_meta_allocated
    FROM public.budgets
    WHERE project_id = v_project_id AND budget_type = 'meta';

    -- Si no hay presupuesto meta definido, no procedemos
    IF v_meta_allocated = 0 THEN
        RETURN NEW;
    END IF;

    -- Dividir el presupuesto meta en proporciones para cada rubro o auditar contra el presupuesto meta total
    -- Para fines de control, auditamos el rubro proporcional o directamente el gasto total directo vs presupuesto meta total.
    -- Vamos a auditar si el gasto total directo de la categoría o global excede una porción típica o el presupuesto meta total.
    -- Una buena aproximación peruana es auditar el gasto total incurrido acumulado vs el presupuesto meta total.
    -- Si el gasto total acumulado supera el presupuesto meta de la obra
    IF v_total_spent > (v_meta_allocated * 1.05) THEN
        v_percent_over := ROUND(((v_total_spent / v_meta_allocated) - 1.0) * 100, 1);
        v_alert_message := FORMAT('Alerta de Desviación: El gasto acumulado en el rubro %s supera el Presupuesto Meta en %s%%.', v_category, v_percent_over);
        
        -- Insertar alerta si no se ha generado una idéntica recientemente (evitar spam)
        INSERT INTO public.project_alerts (project_id, alert_type, severity, message)
        SELECT v_project_id, 'overrun', 'critical', v_alert_message
        WHERE NOT EXISTS (
            SELECT 1 FROM public.project_alerts 
            WHERE project_id = v_project_id 
              AND alert_type = 'overrun' 
              AND message = v_alert_message 
              AND created_at > now() - INTERVAL '12 hours'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers en las 3 tablas de egresos
CREATE OR REPLACE TRIGGER trg_audit_expenses_deviation
AFTER INSERT OR UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.fn_check_budget_deviations();

CREATE OR REPLACE TRIGGER trg_audit_po_deviation
AFTER INSERT OR UPDATE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.fn_check_budget_deviations();

CREATE OR REPLACE TRIGGER trg_audit_payroll_deviation
AFTER INSERT OR UPDATE ON public.payroll_periods
FOR EACH ROW EXECUTE FUNCTION public.fn_check_budget_deviations();
