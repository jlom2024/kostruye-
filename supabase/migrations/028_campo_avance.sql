-- =================================================================================
-- Kostruye+ — Migración 028
-- Capa de Campo: Avance Diario y Producción
-- =================================================================================

-- Función utilitaria para actualizar updated_at
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Cabecera del Parte de Producción
CREATE TABLE IF NOT EXISTS public.daily_progress_logs (
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

-- 2. Detalle del Avance Físico (Metrado)
CREATE TABLE IF NOT EXISTS public.daily_progress_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID NOT NULL REFERENCES public.daily_progress_logs(id) ON DELETE CASCADE,
    budget_item_id UUID NOT NULL REFERENCES public.budget_items(id) ON DELETE CASCADE,
    executed_quantity NUMERIC(15,4) DEFAULT 0.0000,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(log_id, budget_item_id)
);

-- 3. Habilitar RLS
ALTER TABLE public.daily_progress_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_progress_entries ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para daily_progress_logs
CREATE POLICY "Users can view daily_progress_logs of their projects"
    ON public.daily_progress_logs FOR SELECT
    USING (
        project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage daily_progress_logs of their projects"
    ON public.daily_progress_logs FOR ALL
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

-- 5. Políticas RLS para daily_progress_entries
CREATE POLICY "Users can view daily_progress_entries of their projects"
    ON public.daily_progress_entries FOR SELECT
    USING (
        log_id IN (
            SELECT l.id FROM public.daily_progress_logs l
            JOIN public.projects p ON p.id = l.project_id
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage daily_progress_entries of their projects"
    ON public.daily_progress_entries FOR ALL
    USING (
        log_id IN (
            SELECT l.id FROM public.daily_progress_logs l
            JOIN public.projects p ON p.id = l.project_id
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()
        )
    )
    WITH CHECK (
        log_id IN (
            SELECT l.id FROM public.daily_progress_logs l
            JOIN public.projects p ON p.id = l.project_id
            JOIN public.organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

-- 6. Triggers para updated_at
CREATE TRIGGER set_daily_progress_logs_updated_at
    BEFORE UPDATE ON public.daily_progress_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();
