-- =================================================================================
-- Kostruye+ — Migración 052
-- Aislamiento estricto de datos de Campo a nivel de proyecto
-- =================================================================================
--
-- Problema: los módulos de campo (Tareo, Equipos, Avance) y la tabla workers
-- tenían políticas RLS que permitían ver/manipular datos de CUALQUIER proyecto
-- de la organización, siempre que el usuario fuera miembro de la organización.
--
-- Fix: restringir el acceso a project_members, de modo que un usuario solo vea
-- datos de los proyectos a los que está asignado. Esto alinea Tareo, Equipos,
-- Avance y Workers con el resto de módulos endurecidos (HSE, adicionales,
-- cuaderno de obra, fideicomisos, caja chica, alertas, snapshots).
--
-- Nota: los service_role / SERVER-SIDE bypassan RLS por definición. Los
-- administradores de organización que no figuren en project_members de un
-- proyecto específico dejarán de ver esos datos hasta que se agreguen al
-- proyecto — este es el comportamiento deseado y consistente con las
-- migraciones 030–040 y 050.

-- =================================================================================
-- 1. WORKERS — Habilitar RLS y aislar por proyecto
-- =================================================================================

ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- Limpiar cualquier política previa de workers (nombres desconocidos / creadas manualmente)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workers' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.workers', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "workers_select_project"
    ON public.workers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = workers.project_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "workers_insert_project"
    ON public.workers FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = workers.project_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "workers_update_project"
    ON public.workers FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = workers.project_id AND pm.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = workers.project_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "workers_delete_project"
    ON public.workers FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = workers.project_id AND pm.user_id = auth.uid()
        )
    );

-- =================================================================================
-- 2. TAREOS — Reemplazar RLS a nivel de proyecto
-- =================================================================================

DROP POLICY IF EXISTS "Users can view tareos of their projects" ON public.tareos;
DROP POLICY IF EXISTS "Users can insert tareos to their projects" ON public.tareos;
DROP POLICY IF EXISTS "Users can update tareos of their projects" ON public.tareos;
DROP POLICY IF EXISTS "Users can delete tareos of their projects" ON public.tareos;

CREATE POLICY "tareos_select_project"
    ON public.tareos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = tareos.project_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "tareos_insert_project"
    ON public.tareos FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = tareos.project_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "tareos_update_project"
    ON public.tareos FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = tareos.project_id AND pm.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = tareos.project_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "tareos_delete_project"
    ON public.tareos FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = tareos.project_id AND pm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view tareo_entries of their projects" ON public.tareo_entries;
DROP POLICY IF EXISTS "Users can insert tareo_entries" ON public.tareo_entries;
DROP POLICY IF EXISTS "Users can update tareo_entries" ON public.tareo_entries;
DROP POLICY IF EXISTS "Users can delete tareo_entries" ON public.tareo_entries;

CREATE POLICY "tareo_entries_select_project"
    ON public.tareo_entries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tareos t
            JOIN public.project_members pm ON pm.project_id = t.project_id
            WHERE t.id = tareo_entries.tareo_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "tareo_entries_insert_project"
    ON public.tareo_entries FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tareos t
            JOIN public.project_members pm ON pm.project_id = t.project_id
            WHERE t.id = tareo_entries.tareo_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "tareo_entries_update_project"
    ON public.tareo_entries FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.tareos t
            JOIN public.project_members pm ON pm.project_id = t.project_id
            WHERE t.id = tareo_entries.tareo_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "tareo_entries_delete_project"
    ON public.tareo_entries FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.tareos t
            JOIN public.project_members pm ON pm.project_id = t.project_id
            WHERE t.id = tareo_entries.tareo_id AND pm.user_id = auth.uid()
        )
    );

-- =================================================================================
-- 3. EQUIPOS — Reemplazar RLS a nivel de proyecto
-- =================================================================================

DROP POLICY IF EXISTS "Users can view equipments of their projects" ON public.equipments;
DROP POLICY IF EXISTS "Users can manage equipments of their projects" ON public.equipments;

CREATE POLICY "equipments_select_project"
    ON public.equipments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = equipments.project_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "equipments_insert_project"
    ON public.equipments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = equipments.project_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "equipments_update_project"
    ON public.equipments FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = equipments.project_id AND pm.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = equipments.project_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "equipments_delete_project"
    ON public.equipments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = equipments.project_id AND pm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view equipment_logs of their projects" ON public.equipment_logs;
DROP POLICY IF EXISTS "Users can manage equipment_logs of their projects" ON public.equipment_logs;

CREATE POLICY "equipment_logs_select_project"
    ON public.equipment_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = equipment_logs.project_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "equipment_logs_insert_project"
    ON public.equipment_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = equipment_logs.project_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "equipment_logs_update_project"
    ON public.equipment_logs FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = equipment_logs.project_id AND pm.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = equipment_logs.project_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "equipment_logs_delete_project"
    ON public.equipment_logs FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = equipment_logs.project_id AND pm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view equipment_log_entries of their projects" ON public.equipment_log_entries;
DROP POLICY IF EXISTS "Users can manage equipment_log_entries" ON public.equipment_log_entries;

CREATE POLICY "equipment_log_entries_select_project"
    ON public.equipment_log_entries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.equipment_logs el
            JOIN public.project_members pm ON pm.project_id = el.project_id
            WHERE el.id = equipment_log_entries.equipment_log_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "equipment_log_entries_insert_project"
    ON public.equipment_log_entries FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.equipment_logs el
            JOIN public.project_members pm ON pm.project_id = el.project_id
            WHERE el.id = equipment_log_entries.equipment_log_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "equipment_log_entries_update_project"
    ON public.equipment_log_entries FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.equipment_logs el
            JOIN public.project_members pm ON pm.project_id = el.project_id
            WHERE el.id = equipment_log_entries.equipment_log_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "equipment_log_entries_delete_project"
    ON public.equipment_log_entries FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.equipment_logs el
            JOIN public.project_members pm ON pm.project_id = el.project_id
            WHERE el.id = equipment_log_entries.equipment_log_id AND pm.user_id = auth.uid()
        )
    );

-- =================================================================================
-- 4. AVANCE DIARIO — Reemplazar RLS a nivel de proyecto
-- =================================================================================

DROP POLICY IF EXISTS "Users can view daily_progress_logs of their projects" ON public.daily_progress_logs;
DROP POLICY IF EXISTS "Users can manage daily_progress_logs of their projects" ON public.daily_progress_logs;

CREATE POLICY "daily_progress_logs_select_project"
    ON public.daily_progress_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = daily_progress_logs.project_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "daily_progress_logs_insert_project"
    ON public.daily_progress_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = daily_progress_logs.project_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "daily_progress_logs_update_project"
    ON public.daily_progress_logs FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = daily_progress_logs.project_id AND pm.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = daily_progress_logs.project_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "daily_progress_logs_delete_project"
    ON public.daily_progress_logs FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = daily_progress_logs.project_id AND pm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view daily_progress_entries of their projects" ON public.daily_progress_entries;
DROP POLICY IF EXISTS "Users can manage daily_progress_entries of their projects" ON public.daily_progress_entries;

CREATE POLICY "daily_progress_entries_select_project"
    ON public.daily_progress_entries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.daily_progress_logs l
            JOIN public.project_members pm ON pm.project_id = l.project_id
            WHERE l.id = daily_progress_entries.log_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "daily_progress_entries_insert_project"
    ON public.daily_progress_entries FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.daily_progress_logs l
            JOIN public.project_members pm ON pm.project_id = l.project_id
            WHERE l.id = daily_progress_entries.log_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "daily_progress_entries_update_project"
    ON public.daily_progress_entries FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.daily_progress_logs l
            JOIN public.project_members pm ON pm.project_id = l.project_id
            WHERE l.id = daily_progress_entries.log_id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "daily_progress_entries_delete_project"
    ON public.daily_progress_entries FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.daily_progress_logs l
            JOIN public.project_members pm ON pm.project_id = l.project_id
            WHERE l.id = daily_progress_entries.log_id AND pm.user_id = auth.uid()
        )
    );

-- =================================================================================
-- 5. VISTA DE PRODUCTIVIDAD — asegurar security_invoker
-- =================================================================================

-- security_invoker = on fuerza a que las consultas a esta vista respeten las
-- políticas RLS de las tablas subyacentes (budget_items, budgets, tareos,
-- daily_progress_logs, equipment_logs). Con las políticas corregidas arriba,
-- un usuario solo verá las partidas de sus proyectos asignados.
CREATE OR REPLACE VIEW public.vw_productivity_kpi WITH (security_invoker = on) AS
SELECT
    bi.id AS budget_item_id,
    b.project_id,
    bi.item_code,
    bi.description AS item_name,
    bi.unit,
    bi.quantity AS theoretical_quantity,
    bi.unit_price AS theoretical_price,
    COALESCE(av.total_executed, 0) AS total_executed_quantity,
    COALESCE(hh.total_hh, 0) AS total_hh_used,
    COALESCE(hm.total_hm, 0) AS total_hm_used
FROM public.budget_items bi
JOIN public.budgets b ON bi.budget_id = b.id
LEFT JOIN (
    SELECT
        e.budget_item_id,
        SUM(e.executed_quantity) AS total_executed
    FROM public.daily_progress_entries e
    JOIN public.daily_progress_logs l ON e.log_id = l.id
    GROUP BY e.budget_item_id
) av ON av.budget_item_id = bi.id
LEFT JOIN (
    SELECT
        te.budget_item_id,
        SUM(te.hours_worked) AS total_hh
    FROM public.tareo_entries te
    JOIN public.tareos t ON te.tareo_id = t.id
    GROUP BY te.budget_item_id
) hh ON hh.budget_item_id = bi.id
LEFT JOIN (
    SELECT
        eq.budget_item_id,
        SUM(eq.worked_hours) AS total_hm
    FROM public.equipment_log_entries eq
    JOIN public.equipment_logs el ON eq.equipment_log_id = el.id
    GROUP BY eq.budget_item_id
) hm ON hm.budget_item_id = bi.id;

GRANT SELECT ON public.vw_productivity_kpi TO authenticated;
GRANT SELECT ON public.vw_productivity_kpi TO service_role;
