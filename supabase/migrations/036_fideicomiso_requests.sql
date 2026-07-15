-- ── Tabla: Solicitudes de Fideicomiso CORFID ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.fideicomiso_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    request_number VARCHAR(50) NOT NULL,
    valorizacion_id UUID REFERENCES public.valorizaciones(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.fideicomiso_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members access to fideicomiso_requests" ON public.fideicomiso_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = fideicomiso_requests.project_id
            AND pm.user_id = auth.uid()
        )
    );

CREATE TABLE IF NOT EXISTS public.fideicomiso_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.fideicomiso_requests(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('invoice', 'payroll', 'expense')),
    reference_id UUID NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.fideicomiso_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members access to fideicomiso_request_items" ON public.fideicomiso_request_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.fideicomiso_requests fr
            JOIN public.project_members pm ON pm.project_id = fr.project_id
            WHERE fr.id = fideicomiso_request_items.request_id
            AND pm.user_id = auth.uid()
        )
    );
