-- ── Cuaderno de Obra Digital ───────────────────────────
CREATE TABLE IF NOT EXISTS public.site_diary_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    entry_number SERIAL,
    entry_date DATE NOT NULL,
    author_id UUID NOT NULL REFERENCES auth.users(id),
    author_role TEXT NOT NULL CHECK (author_role IN ('Residente', 'Supervisor', 'Inspector')),
    content TEXT NOT NULL,
    weather TEXT CHECK (weather IN ('Soleado', 'Parcialmente Nublado', 'Nublado', 'Lluvia', 'Tormenta', 'Nevada')),
    status TEXT NOT NULL DEFAULT 'Abierto' CHECK (status IN ('Abierto', 'Cerrado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(project_id, entry_number)
);

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.site_diary_entries
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- RLS
ALTER TABLE public.site_diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view site_diary_entries of their projects"
ON public.site_diary_entries FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.project_members pm 
        WHERE pm.project_id = site_diary_entries.project_id 
        AND pm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert site_diary_entries"
ON public.site_diary_entries FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.project_members pm 
        WHERE pm.project_id = site_diary_entries.project_id 
        AND pm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update OPEN site_diary_entries"
ON public.site_diary_entries FOR UPDATE
USING (
    status = 'Abierto' AND
    EXISTS (
        SELECT 1 FROM public.project_members pm 
        WHERE pm.project_id = site_diary_entries.project_id 
        AND pm.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can delete OPEN site_diary_entries"
ON public.site_diary_entries FOR DELETE
USING (
    status = 'Abierto' AND
    EXISTS (
        SELECT 1 FROM public.project_members pm 
        WHERE pm.project_id = site_diary_entries.project_id 
        AND pm.user_id = auth.uid()
        AND pm.role = 'admin'
    )
);
