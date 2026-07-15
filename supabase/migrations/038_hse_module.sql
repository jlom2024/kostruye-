-- ── Módulo de Seguridad y Salud en el Trabajo (HSE) ─────────────────────────

-- Checklists de Seguridad
CREATE TABLE IF NOT EXISTS public.hse_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    checklist_type VARCHAR(50) NOT NULL CHECK (checklist_type IN ('trabajo_altura', 'excavaciones', 'EPP_basico', 'equipos_electricos')),
    inspector_user_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.hse_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members access to hse_checklists" ON public.hse_checklists
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = hse_checklists.project_id
            AND pm.user_id = auth.uid()
        )
    );

-- Items de Checklists
CREATE TABLE IF NOT EXISTS public.hse_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID NOT NULL REFERENCES public.hse_checklists(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('pass', 'fail', 'na')),
    notes TEXT,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.hse_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members access to hse_checklist_items" ON public.hse_checklist_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.hse_checklists hc
            JOIN public.project_members pm ON pm.project_id = hc.project_id
            WHERE hc.id = hse_checklist_items.checklist_id
            AND pm.user_id = auth.uid()
        )
    );

-- Registro de Incidentes
CREATE TABLE IF NOT EXISTS public.hse_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    location VARCHAR(200) NOT NULL, -- Geolocalización o frente
    action_required TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.hse_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members access to hse_incidents" ON public.hse_incidents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = hse_incidents.project_id
            AND pm.user_id = auth.uid()
        )
    );
