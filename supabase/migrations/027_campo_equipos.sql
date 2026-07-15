-- =================================================================================
-- Kostruye+ — Migración 027
-- Capa de Campo: Parte Diario de Equipos y Maquinaria
-- =================================================================================

-- Función utilitaria para actualizar updated_at
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Catálogo físico de Equipos y Maquinaria
CREATE TABLE IF NOT EXISTS public.equipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('propio', 'alquilado')) DEFAULT 'alquilado',
    status TEXT NOT NULL CHECK (status IN ('activo', 'inactivo', 'mantenimiento')) DEFAULT 'activo',
    hourly_cost NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id, code)
);

-- 2. Cabecera del Parte Diario
CREATE TABLE IF NOT EXISTS public.equipment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'approved')) DEFAULT 'draft',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id, date)
);

-- 3. Detalle del Parte Diario
CREATE TABLE IF NOT EXISTS public.equipment_log_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_log_id UUID NOT NULL REFERENCES public.equipment_logs(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES public.equipments(id) ON DELETE CASCADE,
    budget_item_id UUID REFERENCES public.budget_items(id) ON DELETE SET NULL,
    worked_hours NUMERIC(5,2) DEFAULT 0.00,
    standby_hours NUMERIC(5,2) DEFAULT 0.00,
    maintenance_hours NUMERIC(5,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(equipment_log_id, equipment_id)
);

-- 4. Habilitar RLS
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_log_entries ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para equipments
CREATE POLICY "Users can view equipments of their projects"
    ON public.equipments FOR SELECT
    USING (
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage equipments of their projects"
    ON public.equipments FOR ALL
    USING (
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()
        )
    )
    WITH CHECK (
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

-- 6. Políticas RLS para equipment_logs
CREATE POLICY "Users can view equipment_logs of their projects"
    ON public.equipment_logs FOR SELECT
    USING (
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage equipment_logs of their projects"
    ON public.equipment_logs FOR ALL
    USING (
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()
        )
    )
    WITH CHECK (
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

-- 7. Políticas RLS para equipment_log_entries
CREATE POLICY "Users can view equipment_log_entries of their projects"
    ON public.equipment_log_entries FOR SELECT
    USING (
        equipment_log_id IN (
            SELECT el.id FROM public.equipment_logs el
            JOIN public.projects p ON p.id = el.project_id
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage equipment_log_entries"
    ON public.equipment_log_entries FOR ALL
    USING (
        equipment_log_id IN (
            SELECT el.id FROM public.equipment_logs el
            JOIN public.projects p ON p.id = el.project_id
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()
        )
    )
    WITH CHECK (
        equipment_log_id IN (
            SELECT el.id FROM public.equipment_logs el
            JOIN public.projects p ON p.id = el.project_id
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

-- 8. Triggers para updated_at
CREATE TRIGGER set_equipments_updated_at
    BEFORE UPDATE ON public.equipments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_equipment_logs_updated_at
    BEFORE UPDATE ON public.equipment_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();
