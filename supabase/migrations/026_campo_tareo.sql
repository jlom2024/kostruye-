-- =================================================================================
-- Kostruye+ — Migración 026
-- Capa de Campo: Tareos (Partes Diarios de Asistencia y Horas)
-- =================================================================================

-- Función utilitaria para actualizar updated_at
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Tabla de cabecera: tareos
CREATE TABLE IF NOT EXISTS public.tareos (
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

-- 2. Tabla detalle: tareo_entries
CREATE TABLE IF NOT EXISTS public.tareo_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tareo_id UUID NOT NULL REFERENCES public.tareos(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
    budget_item_id UUID REFERENCES public.budget_items(id) ON DELETE SET NULL,
    hours_worked NUMERIC(5,2) DEFAULT 8.00,
    overtime_hours NUMERIC(5,2) DEFAULT 0.00,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'medical')) DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tareo_id, worker_id)
);

-- 3. Habilitar RLS
ALTER TABLE public.tareos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareo_entries ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para tareos
CREATE POLICY "Users can view tareos of their projects"
    ON public.tareos FOR SELECT
    USING (
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert tareos to their projects"
    ON public.tareos FOR INSERT
    WITH CHECK (
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update tareos of their projects"
    ON public.tareos FOR UPDATE
    USING (
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete tareos of their projects"
    ON public.tareos FOR DELETE
    USING (
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

-- 5. Políticas RLS para tareo_entries
CREATE POLICY "Users can view tareo_entries of their projects"
    ON public.tareo_entries FOR SELECT
    USING (
        tareo_id IN (
            SELECT t.id FROM public.tareos t
            JOIN public.projects p ON p.id = t.project_id
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert tareo_entries"
    ON public.tareo_entries FOR INSERT
    WITH CHECK (
        tareo_id IN (
            SELECT t.id FROM public.tareos t
            JOIN public.projects p ON p.id = t.project_id
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update tareo_entries"
    ON public.tareo_entries FOR UPDATE
    USING (
        tareo_id IN (
            SELECT t.id FROM public.tareos t
            JOIN public.projects p ON p.id = t.project_id
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete tareo_entries"
    ON public.tareo_entries FOR DELETE
    USING (
        tareo_id IN (
            SELECT t.id FROM public.tareos t
            JOIN public.projects p ON p.id = t.project_id
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

-- 6. Trigger para updated_at en tareos
CREATE TRIGGER set_tareos_updated_at
    BEFORE UPDATE ON public.tareos
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();
