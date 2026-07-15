-- ── Órdenes de Cambio (Adicionales / Deductivos) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.change_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Borrador' CHECK (status IN ('Borrador', 'Aprobado', 'Rechazado')),
    type TEXT NOT NULL CHECK (type IN ('Adicional', 'Deductivo', 'Ampliación Plazo')),
    approved_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id, code)
);

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.change_orders
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- RLS
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view change_orders of their projects"
ON public.change_orders FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.project_members pm 
        WHERE pm.project_id = change_orders.project_id 
        AND pm.user_id = auth.uid()
    )
);

CREATE POLICY "Admins and Contadores can insert change_orders"
ON public.change_orders FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.project_members pm 
        WHERE pm.project_id = change_orders.project_id 
        AND pm.user_id = auth.uid()
        AND pm.role IN ('admin', 'contador')
    )
);

CREATE POLICY "Admins and Contadores can update change_orders"
ON public.change_orders FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.project_members pm 
        WHERE pm.project_id = change_orders.project_id 
        AND pm.user_id = auth.uid()
        AND pm.role IN ('admin', 'contador')
    )
);

CREATE POLICY "Admins can delete change_orders"
ON public.change_orders FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.project_members pm 
        WHERE pm.project_id = change_orders.project_id 
        AND pm.user_id = auth.uid()
        AND pm.role = 'admin'
    )
);
