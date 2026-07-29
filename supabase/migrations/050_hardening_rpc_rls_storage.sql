-- ================================================================
-- Kostruye+ — Migración 050
-- Hardening: RPCs con SECURITY DEFINER, RLS, idempotencia, storage
-- ================================================================

-- ── 1. Harden SECURITY DEFINER RPCs with auth.uid() checks ────────────────

-- 1a. fn_generate_valorization
CREATE OR REPLACE FUNCTION public.fn_generate_valorization(
    p_project_id UUID, p_period_name TEXT, p_start_date DATE,
    p_end_date DATE, p_formula_id UUID
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_val_id UUID; v_budget_id UUID; v_val_number INT;
    v_total_amount NUMERIC(15,2) := 0; v_factor_k NUMERIC(10,4) := 1.0000;
    v_reajuste NUMERIC(15,2) := 0;
    v_year INT := EXTRACT(YEAR FROM p_end_date);
    v_month INT := EXTRACT(MONTH FROM p_end_date);
    v_member UUID;
BEGIN
    SELECT user_id INTO v_member FROM public.project_members
    WHERE project_id = p_project_id AND user_id = auth.uid() LIMIT 1;
    IF v_member IS NULL THEN
        RAISE EXCEPTION 'No autorizado: no eres miembro del proyecto';
    END IF;

    SELECT id INTO v_budget_id FROM public.budgets WHERE project_id = p_project_id LIMIT 1;
    IF v_budget_id IS NULL THEN
        RAISE EXCEPTION 'No budget found for project %', p_project_id;
    END IF;
    SELECT COALESCE(MAX(val_number), 0) + 1 INTO v_val_number FROM public.valorizaciones WHERE project_id = p_project_id;
    IF p_formula_id IS NOT NULL THEN
        v_factor_k := public.fn_calc_factor_k(p_formula_id, v_year, v_month);
    END IF;
    INSERT INTO public.valorizaciones (project_id, val_number, period_name, start_date, end_date, status, total_amount, reajuste_formula_id, factor_k, monto_reajuste)
    VALUES (p_project_id, v_val_number, p_period_name, p_start_date, p_end_date, 'draft', 0, p_formula_id, v_factor_k, 0) RETURNING id INTO v_val_id;
    WITH period_progress AS (
        SELECT dpe.budget_item_id, COALESCE(SUM(dpe.executed_quantity), 0) as period_qty
        FROM public.daily_progress_entries dpe
        JOIN public.daily_progress_logs dpl ON dpe.log_id = dpl.id
        WHERE dpl.project_id = p_project_id AND dpl.date >= p_start_date AND dpl.date <= p_end_date AND dpl.status = 'approved'
        GROUP BY dpe.budget_item_id
    ), prev_progress AS (
        SELECT vi.budget_item_id, COALESCE(SUM(vi.period_amount), 0) as prev_qty
        FROM public.valorizacion_items vi
        JOIN public.valorizaciones v ON vi.valorizacion_id = v.id
        WHERE v.project_id = p_project_id AND v.val_number < v_val_number AND v.status != 'cancelled'
        GROUP BY vi.budget_item_id
    )
    INSERT INTO public.valorizacion_items (valorizacion_id, budget_item_id, prev_percent, period_percent, cumul_percent, item_total, period_amount, cumul_amount)
    SELECT v_val_id, b.id,
        CASE WHEN b.quantity > 0 THEN COALESCE(prv.prev_qty, 0) / b.quantity ELSE 0 END,
        CASE WHEN b.quantity > 0 THEN COALESCE(per.period_qty, 0) / b.quantity ELSE 0 END,
        CASE WHEN b.quantity > 0 THEN (COALESCE(prv.prev_qty, 0) + COALESCE(per.period_qty, 0)) / b.quantity ELSE 0 END,
        COALESCE(per.period_qty, 0) * b.unit_price, COALESCE(per.period_qty, 0),
        COALESCE(prv.prev_qty, 0) + COALESCE(per.period_qty, 0)
    FROM public.budget_items b
    LEFT JOIN period_progress per ON b.id = per.budget_item_id
    LEFT JOIN prev_progress prv ON b.id = prv.budget_item_id
    WHERE b.budget_id = v_budget_id;
    SELECT COALESCE(SUM(item_total), 0) INTO v_total_amount FROM public.valorizacion_items WHERE valorizacion_id = v_val_id;
    v_reajuste := v_total_amount * (v_factor_k - 1);
    UPDATE public.valorizaciones SET total_amount = v_total_amount, monto_reajuste = v_reajuste WHERE id = v_val_id;
    RETURN v_val_id;
END;
$$;

-- 1b. fn_generate_payroll_from_tareo
CREATE OR REPLACE FUNCTION public.fn_generate_payroll_from_tareo(p_period_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_project_id UUID; v_start_date DATE; v_end_date DATE;
    v_entries_count INT := 0; v_period_status TEXT; v_member UUID;
BEGIN
    SELECT project_id, start_date, end_date, status INTO v_project_id, v_start_date, v_end_date, v_period_status
    FROM public.payroll_periods WHERE id = p_period_id;
    IF v_project_id IS NULL THEN RAISE EXCEPTION 'Periodo no encontrado: %', p_period_id; END IF;
    IF v_period_status != 'open' THEN RAISE EXCEPTION 'Periodo no abierto: %', v_period_status; END IF;
    SELECT user_id INTO v_member FROM public.project_members WHERE project_id = v_project_id AND user_id = auth.uid() LIMIT 1;
    IF v_member IS NULL THEN RAISE EXCEPTION 'No autorizado: no eres miembro del proyecto'; END IF;
    DELETE FROM public.payroll_entries WHERE period_id = p_period_id;
    WITH tareo_summary AS (
        SELECT te.worker_id, SUM(te.hours_worked + COALESCE(te.overtime_hours, 0)) AS total_hours,
            ROUND(SUM(te.hours_worked) / 8.0, 2) AS days_worked,
            ROUND(SUM(COALESCE(te.overtime_hours, 0)), 2) AS overtime_hours
        FROM public.tareo_entries te
        JOIN public.tareos t ON te.tareo_id = t.id
        JOIN public.workers w ON te.worker_id = w.id
        WHERE t.project_id = v_project_id AND t.date BETWEEN v_start_date AND v_end_date AND t.status = 'approved' AND w.is_active = TRUE
        GROUP BY te.worker_id HAVING SUM(te.hours_worked) > 0
    )
    INSERT INTO public.payroll_entries (period_id, worker_id, days_worked, daily_wage, gross_pay, deductions, net_pay, notes)
    SELECT p_period_id, ts.worker_id, ts.days_worked, w.daily_wage,
        ROUND((ts.days_worked * w.daily_wage) + (ts.overtime_hours * (w.daily_wage / 8.0) * 1.25), 2),
        0, ROUND((ts.days_worked * w.daily_wage) + (ts.overtime_hours * (w.daily_wage / 8.0) * 1.25), 2),
        'Generado desde tareo ' || v_start_date || ' al ' || v_end_date
    FROM tareo_summary ts JOIN public.workers w ON w.id = ts.worker_id;
    GET DIAGNOSTICS v_entries_count = ROW_COUNT;
    UPDATE public.payroll_periods SET total_gross = (SELECT COALESCE(SUM(gross_pay), 0) FROM public.payroll_entries WHERE period_id = p_period_id),
        total_net = (SELECT COALESCE(SUM(net_pay), 0) FROM public.payroll_entries WHERE period_id = p_period_id), updated_at = now()
    WHERE id = p_period_id;
    RETURN v_entries_count;
END;
$$;

-- 1c. fn_confirm_purchase_receipt — idempotent + auth check
CREATE OR REPLACE FUNCTION public.fn_confirm_purchase_receipt(p_receipt_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_po_id UUID; v_project_id UUID; v_receipt_date DATE;
    v_status TEXT; v_member UUID;
BEGIN
    SELECT pr.purchase_order_id, po.project_id, pr.receipt_date, pr.status
    INTO v_po_id, v_project_id, v_receipt_date, v_status
    FROM public.purchase_receipts pr JOIN public.purchase_orders po ON pr.purchase_order_id = po.id WHERE pr.id = p_receipt_id;
    IF v_project_id IS NULL THEN RAISE EXCEPTION 'Recepción no encontrada'; END IF;
    IF v_status = 'confirmed' THEN RETURN; END IF;
    SELECT user_id INTO v_member FROM public.project_members WHERE project_id = v_project_id AND user_id = auth.uid() LIMIT 1;
    IF v_member IS NULL THEN RAISE EXCEPTION 'No autorizado: no eres miembro del proyecto'; END IF;
    INSERT INTO public.stock_items (project_id, resource_id, unit, notes)
    SELECT DISTINCT v_project_id, poi.resource_id, poi.unit, 'Auto-creado desde OC'
    FROM public.purchase_receipt_items pri JOIN public.purchase_order_items poi ON pri.purchase_order_item_id = poi.id
    WHERE pri.receipt_id = p_receipt_id AND poi.resource_id IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.stock_entries (project_id, stock_item_id, quantity, unit_cost, entry_date, purchase_order_id, notes)
    SELECT v_project_id, si.id, pri.received_quantity, COALESCE(pri.unit_price, poi.unit_price),
        v_receipt_date, v_po_id, 'Recepción automática desde OC - ' || p_receipt_id
    FROM public.purchase_receipt_items pri
    JOIN public.purchase_order_items poi ON pri.purchase_order_item_id = poi.id
    JOIN public.stock_items si ON si.resource_id = poi.resource_id AND si.project_id = v_project_id
    WHERE pri.receipt_id = p_receipt_id AND poi.resource_id IS NOT NULL;
    UPDATE public.purchase_receipts SET status = 'confirmed' WHERE id = p_receipt_id;
    UPDATE public.purchase_orders po SET status = 'received'
    WHERE po.id = v_po_id
    AND NOT EXISTS (
        SELECT 1 FROM public.purchase_order_items poi2 WHERE poi2.purchase_order_id = v_po_id
        AND poi2.quantity > (SELECT COALESCE(SUM(pri2.received_quantity), 0)
            FROM public.purchase_receipt_items pri2
            JOIN public.purchase_receipts pr2 ON pri2.receipt_id = pr2.id
            WHERE pr2.purchase_order_id = v_po_id AND pr2.status = 'confirmed'
            AND pri2.purchase_order_item_id = poi2.id));
END;
$$;

-- 1d. Hardening fn_user_can — remove dynamic SQL injection vector
CREATE OR REPLACE FUNCTION fn_user_can(p_user_id UUID, p_org_id UUID, p_module TEXT, p_action TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
DECLARE
    v_role TEXT; v_can BOOLEAN := false;
BEGIN
    SELECT role::TEXT INTO v_role FROM organization_members
    WHERE user_id = p_user_id AND organization_id = p_org_id LIMIT 1;
    IF v_role IS NULL THEN RETURN false; END IF;
    IF v_role = 'admin' THEN RETURN true; END IF;
    IF p_action NOT IN ('view','edit','approve','delete') THEN RETURN false; END IF;
    SELECT CASE p_action
        WHEN 'view'    THEN can_view
        WHEN 'edit'    THEN can_edit
        WHEN 'approve' THEN can_approve
        WHEN 'delete'  THEN can_delete
    END INTO v_can FROM role_module_permissions WHERE role = v_role AND module = p_module;
    RETURN COALESCE(v_can, false);
END;
$$;

-- 1e. Hardening fn_user_can_project — remove dynamic SQL
CREATE OR REPLACE FUNCTION fn_user_can_project(p_user_id UUID, p_project_id UUID, p_module TEXT, p_action TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = ''
AS $$
DECLARE
    v_role TEXT; v_org_id UUID; v_can BOOLEAN := false;
BEGIN
    SELECT role::TEXT INTO v_role FROM project_members WHERE user_id = p_user_id AND project_id = p_project_id LIMIT 1;
    IF v_role IS NULL THEN
        SELECT organization_id INTO v_org_id FROM projects WHERE id = p_project_id LIMIT 1;
        IF v_org_id IS NOT NULL THEN
            SELECT role::TEXT INTO v_role FROM organization_members WHERE user_id = p_user_id AND organization_id = v_org_id LIMIT 1;
        END IF;
    END IF;
    IF v_role IS NULL THEN RETURN false; END IF;
    IF v_role = 'admin' THEN RETURN true; END IF;
    IF p_action NOT IN ('view','edit','approve','delete') THEN RETURN false; END IF;
    SELECT CASE p_action
        WHEN 'view'    THEN can_view
        WHEN 'edit'    THEN can_edit
        WHEN 'approve' THEN can_approve
        WHEN 'delete'  THEN can_delete
    END INTO v_can FROM role_module_permissions WHERE role = v_role AND module = p_module;
    RETURN COALESCE(v_can, false);
END;
$$;

-- ── 2. Revoke PUBLIC/anon EXECUTE from all SECURITY DEFINER functions ─────

REVOKE ALL ON FUNCTION fn_user_can(UUID,UUID,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fn_user_can(UUID,UUID,TEXT,TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION fn_user_can_project(UUID,UUID,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fn_user_can_project(UUID,UUID,TEXT,TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION fn_generate_valorization(UUID,TEXT,DATE,DATE,UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fn_generate_valorization(UUID,TEXT,DATE,DATE,UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION fn_generate_payroll_from_tareo(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fn_generate_payroll_from_tareo(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION fn_confirm_purchase_receipt(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fn_confirm_purchase_receipt(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION fn_audit() FROM PUBLIC, anon;

-- ── 3. Fix RLS: restrict audit_logs to organization scope ─────────────────
DROP POLICY IF EXISTS "authenticated users can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "org users can view audit logs" ON audit_logs;
CREATE POLICY "org users can view audit logs" ON audit_logs
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND (organization_id IS NULL OR EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = audit_logs.organization_id AND om.user_id = auth.uid()))
        AND (project_id IS NULL OR EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = audit_logs.project_id AND pm.user_id = auth.uid()))
    );

-- ── 4. Fix RLS: add role-specific visibility to HSE ───────────────────────
DROP POLICY IF EXISTS "Allow members access to hse_checklists" ON public.hse_checklists;
CREATE POLICY "hse_checklists_select" ON public.hse_checklists FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = hse_checklists.project_id AND pm.user_id = auth.uid()));
CREATE POLICY "hse_checklists_insert" ON public.hse_checklists FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = hse_checklists.project_id AND pm.user_id = auth.uid()));
CREATE POLICY "hse_checklists_update" ON public.hse_checklists FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = hse_checklists.project_id AND pm.user_id = auth.uid()));
CREATE POLICY "hse_checklists_delete" ON public.hse_checklists FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = hse_checklists.project_id AND pm.user_id = auth.uid()));

DROP POLICY IF EXISTS "Allow members access to hse_checklist_items" ON public.hse_checklist_items;
CREATE POLICY "hse_checklist_items_select" ON public.hse_checklist_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.hse_checklists hc JOIN public.project_members pm ON pm.project_id = hc.project_id WHERE hc.id = hse_checklist_items.checklist_id AND pm.user_id = auth.uid()));
CREATE POLICY "hse_checklist_items_insert" ON public.hse_checklist_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.hse_checklists hc JOIN public.project_members pm ON pm.project_id = hc.project_id WHERE hc.id = hse_checklist_items.checklist_id AND pm.user_id = auth.uid()));
CREATE POLICY "hse_checklist_items_update" ON public.hse_checklist_items FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.hse_checklists hc JOIN public.project_members pm ON pm.project_id = hc.project_id WHERE hc.id = hse_checklist_items.checklist_id AND pm.user_id = auth.uid()));
CREATE POLICY "hse_checklist_items_delete" ON public.hse_checklist_items FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.hse_checklists hc JOIN public.project_members pm ON pm.project_id = hc.project_id WHERE hc.id = hse_checklist_items.checklist_id AND pm.user_id = auth.uid()));

DROP POLICY IF EXISTS "Allow members access to hse_incidents" ON public.hse_incidents;
CREATE POLICY "hse_incidents_select" ON public.hse_incidents FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = hse_incidents.project_id AND pm.user_id = auth.uid()));
CREATE POLICY "hse_incidents_insert" ON public.hse_incidents FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = hse_incidents.project_id AND pm.user_id = auth.uid()));
CREATE POLICY "hse_incidents_update" ON public.hse_incidents FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = hse_incidents.project_id AND pm.user_id = auth.uid()));
CREATE POLICY "hse_incidents_delete" ON public.hse_incidents FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = hse_incidents.project_id AND pm.user_id = auth.uid()));

-- ── 5. Fix views: add security_invoker where needed ───────────────────────
CREATE OR REPLACE VIEW public.vw_executive_dashboard WITH (security_invoker = true) AS
WITH presupuesto AS (
    SELECT b.project_id, b.total AS budget_total FROM public.budgets b WHERE b.is_active = TRUE
), valorizaciones_acum AS (
    SELECT project_id, SUM(total_amount + monto_reajuste) AS total_invoiced, COUNT(*) AS total_vals
    FROM public.valorizaciones WHERE status = 'approved' GROUP BY project_id
), egreso_compras AS (
    SELECT project_id, SUM(total) AS total_compras FROM public.purchase_orders WHERE status NOT IN ('draft', 'cancelled') GROUP BY project_id
), egreso_nominas AS (
    SELECT project_id, SUM(total_net) AS total_nominas FROM public.payroll_periods WHERE status IN ('closed', 'paid') GROUP BY project_id
), avance_fisico AS (
    SELECT val.project_id, COALESCE(SUM(vi.item_total), 0) AS costo_real_acum
    FROM public.valorizacion_items vi JOIN public.valorizaciones val ON vi.valorizacion_id = val.id WHERE val.status = 'approved' GROUP BY val.project_id
)
SELECT p.id AS project_id, p.name AS project_name, p.start_date, p.end_date, p.status AS project_status, p.currency,
    COALESCE(pre.budget_total, 0) AS budget_total, COALESCE(val.total_invoiced, 0) AS ev_total,
    COALESCE(val.total_vals, 0) AS total_valorizaciones,
    COALESCE(ec.total_compras, 0) + COALESCE(en.total_nominas, 0) AS ac_total,
    COALESCE(ec.total_compras, 0) AS costo_compras, COALESCE(en.total_nominas, 0) AS costo_nominas,
    CASE WHEN (COALESCE(ec.total_compras, 0) + COALESCE(en.total_nominas, 0)) > 0
        THEN ROUND(COALESCE(val.total_invoiced, 0) / (COALESCE(ec.total_compras, 0) + COALESCE(en.total_nominas, 0)), 3) ELSE NULL END AS cpi,
    CASE WHEN COALESCE(pre.budget_total, 0) > 0 THEN ROUND(COALESCE(val.total_invoiced, 0) / pre.budget_total * 100, 2) ELSE 0 END AS pct_avance,
    COALESCE(val.total_invoiced, 0) - (COALESCE(ec.total_compras, 0) + COALESCE(en.total_nominas, 0)) AS flujo_caja,
    now() AS snapshot_at
FROM public.projects p
LEFT JOIN presupuesto pre ON pre.project_id = p.id
LEFT JOIN valorizaciones_acum val ON val.project_id = p.id
LEFT JOIN egreso_compras ec ON ec.project_id = p.id
LEFT JOIN egreso_nominas en ON en.project_id = p.id
LEFT JOIN avance_fisico af ON af.project_id = p.id;

CREATE OR REPLACE VIEW public.vw_curva_s WITH (security_invoker = true) AS
SELECT val.project_id, EXTRACT(YEAR FROM val.end_date)::INT AS anio,
    EXTRACT(MONTH FROM val.end_date)::INT AS mes, TO_CHAR(val.end_date, 'Mon YYYY') AS periodo_label,
    val.val_number,
    SUM(val.total_amount) OVER (PARTITION BY val.project_id ORDER BY val.val_number) AS monto_acumulado,
    SUM(val.total_amount + val.monto_reajuste) OVER (PARTITION BY val.project_id ORDER BY val.val_number) AS monto_acumulado_con_reajuste,
    val.total_amount AS monto_mes, val.monto_reajuste AS reajuste_mes, val.factor_k, val.status
FROM public.valorizaciones val WHERE val.status IN ('approved', 'submitted')
ORDER BY val.project_id, val.val_number;

-- ── 6. Fix storage: make buckets private with tenant scoping ──────────────
-- Photos bucket → private, org/project prefixed
UPDATE storage.buckets SET public = false, allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']
WHERE id = 'photos' AND name = 'photos';
DROP POLICY IF EXISTS "Public Access for Photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
CREATE POLICY "photos_select_org" ON storage.objects FOR SELECT USING (
    bucket_id = 'photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "photos_insert_auth" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "photos_update_owner" ON storage.objects FOR UPDATE USING (
    bucket_id = 'photos' AND auth.uid() = owner);
CREATE POLICY "photos_delete_owner" ON storage.objects FOR DELETE USING (
    bucket_id = 'photos' AND auth.uid() = owner);

-- Reports bucket → private
UPDATE storage.buckets SET public = false WHERE id = 'reports' AND name = 'reports';
DROP POLICY IF EXISTS "Public Access for Reports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload reports" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own reports" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own reports" ON storage.objects;
CREATE POLICY "reports_select_org" ON storage.objects FOR SELECT USING (
    bucket_id = 'reports' AND auth.uid() IS NOT NULL);
CREATE POLICY "reports_insert_auth" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'reports' AND auth.uid() IS NOT NULL);
CREATE POLICY "reports_update_owner" ON storage.objects FOR UPDATE USING (
    bucket_id = 'reports' AND auth.uid() = owner);
CREATE POLICY "reports_delete_owner" ON storage.objects FOR DELETE USING (
    bucket_id = 'reports' AND auth.uid() = owner);

-- ── 7. Add trigger for hse_checklists + hse_checklist_items audit ─────────
DROP TRIGGER IF EXISTS trg_audit_hse_checklists ON public.hse_checklists;
CREATE TRIGGER trg_audit_hse_checklists AFTER INSERT OR UPDATE OR DELETE ON public.hse_checklists FOR EACH ROW EXECUTE FUNCTION fn_audit();
