-- =================================================================================
-- Kostruye+ — Migración 053
-- Modelo RBAC empresarial: aislamiento por obra + visibilidad transversal por rol
-- =================================================================================
--
-- Modelo de negocio (empresa constructora tipo Seatek):
--   • Cada obra tiene su propio personal: residentes, ingenieros de campo, obreros.
--     Un usuario asignado a una obra SOLO ve los datos de esa obra.
--   • El GERENTE (rol admin a nivel organización) ve TODAS las obras.
--   • El CONTADOR (rol contador a nivel organización) ve los módulos financieros
--     (presupuesto, compras, almacén, valorizaciones, nóminas, gastos, caja chica,
--     contabilidad, servicios, fideicomiso) de TODAS las obras.
--
-- Implementación:
--   Todas las políticas RLS de tablas project-scoped se unifican sobre
--   public.fn_user_can_project(auth.uid(), project_id, modulo, accion), que ya
--   implementa la precedencia: rol en project_members > rol en organization_members,
--   con admin siempre = true. La matriz de permisos vive en role_module_permissions.
--
--   Esto corrige DOS problemas a la vez:
--   1. Fugas cross-proyecto (miembros de org veían datos de obras ajenas).
--   2. Bloqueo inverso: contador/gerente org-level NO podían ver nóminas, compras,
--      valorizaciones ni caja chica de ninguna obra sin estar en project_members.
--
-- Módulos nuevos en la matriz: tareo, equipos, avance, hse, lean, gastos,
--   caja_chica, contabilidad, servicios, fideicomiso.
--
-- Idempotente: usa ON CONFLICT DO UPDATE y drop de políticas previas por tabla.

-- =================================================================================
-- 1. AMPLIAR CONSTRAINT DE MÓDULOS EN role_module_permissions
-- =================================================================================

ALTER TABLE public.role_module_permissions
  DROP CONSTRAINT IF EXISTS role_module_permissions_module_check;

ALTER TABLE public.role_module_permissions
  ADD CONSTRAINT role_module_permissions_module_check
  CHECK (module = ANY (ARRAY[
    'presupuesto','apu','compras','almacen','valorizaciones','nominas',
    'reportes','configuracion',
    'tareo','equipos','avance','hse','lean','gastos','caja_chica',
    'contabilidad','servicios','fideicomiso'
  ]));

-- Asegurar ejecutabilidad de la función de permisos
GRANT EXECUTE ON FUNCTION public.fn_user_can_project(UUID, UUID, TEXT, TEXT) TO authenticated, service_role;

-- =================================================================================
-- 2. MATRIZ DE PERMISOS (seed idempotente)
-- =================================================================================
-- Convención: (rol, módulo, can_view, can_edit, can_approve, can_delete)
-- can_delete se reserva a admin, consistente con la matriz pre-existente.

INSERT INTO public.role_module_permissions (role, module, can_view, can_edit, can_approve, can_delete) VALUES

  -- ── Roles org-level faltantes en módulos existentes ──────────────────────────
  -- CONTADOR: visibilidad financiera transversal a todas las obras
  ('contador','presupuesto',    true, true,  false, false),
  ('contador','apu',            true, true,  false, false),
  ('contador','compras',        true, true,  true,  false),
  ('contador','almacen',        true, false, false, false),
  ('contador','valorizaciones', true, true,  true,  false),
  ('contador','nominas',        true, true,  true,  false),
  ('contador','reportes',       true, false, false, false),
  ('contador','configuracion',  false,false, false, false),
  -- USER: personal de obra (campo + almacén)
  ('user','presupuesto',        true, false, false, false),
  ('user','apu',                true, false, false, false),
  ('user','compras',            false,false, false, false),
  ('user','almacen',            true, true,  false, false),
  ('user','valorizaciones',     false,false, false, false),
  ('user','nominas',            false,false, false, false),
  ('user','reportes',           true, false, false, false),
  ('user','configuracion',      false,false, false, false),

  -- ── Ajustes sobre filas existentes (preservan capacidades ya vigentes) ──────
  -- purchasing podía crear solicitudes de salida de almacén (requester)
  ('purchasing','almacen',      true, true,  false, false),
  -- warehouse y project_manager podían aprobar solicitudes de salida (approver)
  ('warehouse','almacen',       true, true,  true,  false),
  ('project_manager','almacen', true, true,  true,  false),

  -- ── Módulo TAREO (asistencia + personal de obra) ────────────────────────────
  ('admin','tareo',           true, true,  true,  true),
  ('contador','tareo',        true, false, false, false),  -- insumo de nóminas
  ('project_manager','tareo', true, true,  true,  false),
  ('field_engineer','tareo',  true, true,  false, false),
  ('purchasing','tareo',      false,false, false, false),
  ('warehouse','tareo',       false,false, false, false),
  ('hr','tareo',              true, true,  false, false),  -- RRHH gestiona personal
  ('readonly','tareo',        true, false, false, false),
  ('user','tareo',            true, true,  false, false),

  -- ── Módulo EQUIPOS (parte de equipos y maquinaria) ──────────────────────────
  ('admin','equipos',           true, true,  true,  true),
  ('contador','equipos',        true, false, false, false),  -- costos de equipos
  ('project_manager','equipos', true, true,  true,  false),
  ('field_engineer','equipos',  true, true,  false, false),
  ('purchasing','equipos',      true, false, false, false),  -- alquileres/compras
  ('warehouse','equipos',       true, false, false, false),
  ('hr','equipos',              false,false, false, false),
  ('readonly','equipos',        true, false, false, false),
  ('user','equipos',            true, true,  false, false),

  -- ── Módulo AVANCE (avance diario + cuaderno de obra) ────────────────────────
  ('admin','avance',           true, true,  true,  true),
  ('contador','avance',        true, false, false, false),  -- insumo valorizaciones
  ('project_manager','avance', true, true,  true,  false),
  ('field_engineer','avance',  true, true,  false, false),
  ('purchasing','avance',      false,false, false, false),
  ('warehouse','avance',       false,false, false, false),
  ('hr','avance',              false,false, false, false),
  ('readonly','avance',        true, false, false, false),
  ('user','avance',            true, true,  false, false),

  -- ── Módulo HSE (seguridad y salud ocupacional) ──────────────────────────────
  ('admin','hse',           true, true,  true,  true),
  ('contador','hse',        false,false, false, false),
  ('project_manager','hse', true, true,  true,  false),
  ('field_engineer','hse',  true, true,  false, false),
  ('purchasing','hse',      false,false, false, false),
  ('warehouse','hse',       false,false, false, false),
  ('hr','hse',              true, false, false, false),  -- incidentes de personal
  ('readonly','hse',        true, false, false, false),
  ('user','hse',            true, true,  false, false),

  -- ── Módulo LEAN / LPS ───────────────────────────────────────────────────────
  ('admin','lean',           true, true,  true,  true),
  ('contador','lean',        false,false, false, false),
  ('project_manager','lean', true, true,  true,  false),
  ('field_engineer','lean',  true, true,  false, false),
  ('purchasing','lean',      true, false, false, false),  -- restricciones de materiales
  ('warehouse','lean',       true, false, false, false),  -- disponibilidad de stock
  ('hr','lean',              false,false, false, false),
  ('readonly','lean',        true, false, false, false),
  ('user','lean',            true, true,  false, false),

  -- ── Módulo GASTOS (egresos de obra) ─────────────────────────────────────────
  ('admin','gastos',           true, true,  true,  true),
  ('contador','gastos',        true, true,  true,  false),
  ('project_manager','gastos', true, true,  false, false),
  ('field_engineer','gastos',  true, true,  false, false),  -- gastos de campo
  ('purchasing','gastos',      true, false, false, false),
  ('warehouse','gastos',       false,false, false, false),
  ('hr','gastos',              false,false, false, false),
  ('readonly','gastos',        true, false, false, false),
  ('user','gastos',            true, true,  false, false),  -- rendiciones de campo

  -- ── Módulo CAJA CHICA ───────────────────────────────────────────────────────
  ('admin','caja_chica',           true, true,  true,  true),
  ('contador','caja_chica',        true, true,  true,  false),
  ('project_manager','caja_chica', true, true,  true,  false),
  ('field_engineer','caja_chica',  true, true,  false, false),
  ('purchasing','caja_chica',      false,false, false, false),
  ('warehouse','caja_chica',       false,false, false, false),
  ('hr','caja_chica',              false,false, false, false),
  ('readonly','caja_chica',        true, false, false, false),
  ('user','caja_chica',            true, true,  false, false),

  -- ── Módulo CONTABILIDAD (facturación electrónica SUNAT) ─────────────────────
  ('admin','contabilidad',           true, true,  true,  true),
  ('contador','contabilidad',        true, true,  true,  false),
  ('project_manager','contabilidad', true, false, false, false),
  ('field_engineer','contabilidad',  false,false, false, false),
  ('purchasing','contabilidad',      false,false, false, false),
  ('warehouse','contabilidad',       false,false, false, false),
  ('hr','contabilidad',              false,false, false, false),
  ('readonly','contabilidad',        true, false, false, false),
  ('user','contabilidad',            false,false, false, false),

  -- ── Módulo SERVICIOS (órdenes de servicio y adelantos) ──────────────────────
  ('admin','servicios',           true, true,  true,  true),
  ('contador','servicios',        true, true,  false, false),  -- pago a subcontratas
  ('project_manager','servicios', true, true,  true,  false),
  ('field_engineer','servicios',  true, false, false, false),  -- recepción conforme
  ('purchasing','servicios',      true, true,  false, false),  -- gestiona contratos
  ('warehouse','servicios',       false,false, false, false),
  ('hr','servicios',              false,false, false, false),
  ('readonly','servicios',        true, false, false, false),
  ('user','servicios',            false,false, false, false),

  -- ── Módulo FIDEICOMISO ──────────────────────────────────────────────────────
  ('admin','fideicomiso',           true, true,  true,  true),
  ('contador','fideicomiso',        true, true,  true,  false),
  ('project_manager','fideicomiso', true, false, false, false),
  ('field_engineer','fideicomiso',  false,false, false, false),
  ('purchasing','fideicomiso',      false,false, false, false),
  ('warehouse','fideicomiso',       false,false, false, false),
  ('hr','fideicomiso',              false,false, false, false),
  ('readonly','fideicomiso',        true, false, false, false),
  ('user','fideicomiso',            false,false, false, false)

ON CONFLICT (role, module) DO UPDATE SET
  can_view    = EXCLUDED.can_view,
  can_edit    = EXCLUDED.can_edit,
  can_approve = EXCLUDED.can_approve,
  can_delete  = EXCLUDED.can_delete;

-- =================================================================================
-- 3. HELPER TEMPORAL: reescribe las 4 políticas RLS de una tabla
-- =================================================================================
-- p_project_expr: expresión SQL que resuelve el project_id de la fila
-- ('project_id' para tablas directas; subconsulta correlacionada para hijas).

CREATE OR REPLACE FUNCTION public._tmp_rbac_rewrite(p_table TEXT, p_module TEXT, p_project_expr TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = p_table
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, p_table);
  END LOOP;

  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR SELECT USING (public.fn_user_can_project(auth.uid(), %s, %L, %L))',
    p_table || '_rbac_select', p_table, p_project_expr, p_module, 'view');

  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (public.fn_user_can_project(auth.uid(), %s, %L, %L))',
    p_table || '_rbac_insert', p_table, p_project_expr, p_module, 'edit');

  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR UPDATE USING (public.fn_user_can_project(auth.uid(), %s, %L, %L)) WITH CHECK (public.fn_user_can_project(auth.uid(), %s, %L, %L))',
    p_table || '_rbac_update', p_table, p_project_expr, p_module, 'edit', p_project_expr, p_module, 'edit');

  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR DELETE USING (public.fn_user_can_project(auth.uid(), %s, %L, %L))',
    p_table || '_rbac_delete', p_table, p_project_expr, p_module, 'delete');
END;
$$;

-- =================================================================================
-- 4. TABLAS CON project_id DIRECTO
-- =================================================================================

-- Campo
SELECT public._tmp_rbac_rewrite('workers',             'tareo',   'project_id');
SELECT public._tmp_rbac_rewrite('tareos',              'tareo',   'project_id');
SELECT public._tmp_rbac_rewrite('equipments',          'equipos', 'project_id');
SELECT public._tmp_rbac_rewrite('equipment_logs',      'equipos', 'project_id');
SELECT public._tmp_rbac_rewrite('daily_progress_logs', 'avance',  'project_id');
SELECT public._tmp_rbac_rewrite('hse_checklists',      'hse',     'project_id');
SELECT public._tmp_rbac_rewrite('hse_incidents',       'hse',     'project_id');
SELECT public._tmp_rbac_rewrite('lean_constraints',    'lean',    'project_id');
SELECT public._tmp_rbac_rewrite('lean_tasks',          'lean',    'project_id');
SELECT public._tmp_rbac_rewrite('lean_weeks',          'lean',    'project_id');

-- Finanzas / administración
SELECT public._tmp_rbac_rewrite('expenses',             'gastos',         'project_id');
SELECT public._tmp_rbac_rewrite('petty_cash_boxes',     'caja_chica',     'project_id');
SELECT public._tmp_rbac_rewrite('stock_items',          'almacen',        'project_id');
SELECT public._tmp_rbac_rewrite('stock_entries',        'almacen',        'project_id');
SELECT public._tmp_rbac_rewrite('stock_withdrawals',    'almacen',        'project_id');
SELECT public._tmp_rbac_rewrite('budgets',              'presupuesto',    'project_id');
SELECT public._tmp_rbac_rewrite('change_orders',        'presupuesto',    'project_id');
SELECT public._tmp_rbac_rewrite('purchase_orders',      'compras',        'project_id');
SELECT public._tmp_rbac_rewrite('service_orders',       'servicios',      'project_id');
SELECT public._tmp_rbac_rewrite('electronic_invoices',  'contabilidad',   'project_id');
SELECT public._tmp_rbac_rewrite('valorizaciones',       'valorizaciones', 'project_id');
SELECT public._tmp_rbac_rewrite('reajuste_formulas',    'valorizaciones', 'project_id');
SELECT public._tmp_rbac_rewrite('payroll_periods',      'nominas',        'project_id');
SELECT public._tmp_rbac_rewrite('fideicomiso_requests', 'fideicomiso',    'project_id');

-- Tablero / alertas (lectura transversal informativa)
SELECT public._tmp_rbac_rewrite('project_alerts',          'reportes', 'project_id');
SELECT public._tmp_rbac_rewrite('project_daily_snapshots', 'reportes', 'project_id');

-- =================================================================================
-- 5. TABLAS HIJAS (project_id resuelto vía padre)
-- =================================================================================

-- Campo
SELECT public._tmp_rbac_rewrite('tareo_entries', 'tareo',
  '(SELECT t.project_id FROM public.tareos t WHERE t.id = tareo_entries.tareo_id)');
SELECT public._tmp_rbac_rewrite('equipment_log_entries', 'equipos',
  '(SELECT el.project_id FROM public.equipment_logs el WHERE el.id = equipment_log_entries.equipment_log_id)');
SELECT public._tmp_rbac_rewrite('daily_progress_entries', 'avance',
  '(SELECT l.project_id FROM public.daily_progress_logs l WHERE l.id = daily_progress_entries.log_id)');
SELECT public._tmp_rbac_rewrite('hse_checklist_items', 'hse',
  '(SELECT hc.project_id FROM public.hse_checklists hc WHERE hc.id = hse_checklist_items.checklist_id)');

-- Finanzas / administración
SELECT public._tmp_rbac_rewrite('petty_cash_transactions', 'caja_chica',
  '(SELECT pcb.project_id FROM public.petty_cash_boxes pcb WHERE pcb.id = petty_cash_transactions.box_id)');
SELECT public._tmp_rbac_rewrite('budget_chapters', 'presupuesto',
  '(SELECT b.project_id FROM public.budgets b WHERE b.id = budget_chapters.budget_id)');
SELECT public._tmp_rbac_rewrite('budget_items', 'presupuesto',
  '(SELECT b.project_id FROM public.budgets b WHERE b.id = budget_items.budget_id)');
SELECT public._tmp_rbac_rewrite('apu_lines', 'presupuesto',
  '(SELECT b.project_id FROM public.budget_items bi JOIN public.budgets b ON b.id = bi.budget_id WHERE bi.id = apu_lines.budget_item_id)');
SELECT public._tmp_rbac_rewrite('purchase_order_items', 'compras',
  '(SELECT po.project_id FROM public.purchase_orders po WHERE po.id = purchase_order_items.purchase_order_id)');
SELECT public._tmp_rbac_rewrite('purchase_receipts', 'compras',
  '(SELECT po.project_id FROM public.purchase_orders po WHERE po.id = purchase_receipts.purchase_order_id)');
SELECT public._tmp_rbac_rewrite('purchase_receipt_items', 'compras',
  '(SELECT po.project_id FROM public.purchase_receipts pr JOIN public.purchase_orders po ON po.id = pr.purchase_order_id WHERE pr.id = purchase_receipt_items.receipt_id)');
SELECT public._tmp_rbac_rewrite('service_order_advances', 'servicios',
  '(SELECT so.project_id FROM public.service_orders so WHERE so.id = service_order_advances.service_order_id)');
SELECT public._tmp_rbac_rewrite('valorizacion_items', 'valorizaciones',
  '(SELECT v.project_id FROM public.valorizaciones v WHERE v.id = valorizacion_items.valorizacion_id)');
SELECT public._tmp_rbac_rewrite('reajuste_monomios', 'valorizaciones',
  '(SELECT rf.project_id FROM public.reajuste_formulas rf WHERE rf.id = reajuste_monomios.formula_id)');
SELECT public._tmp_rbac_rewrite('payroll_entries', 'nominas',
  '(SELECT pp.project_id FROM public.payroll_periods pp WHERE pp.id = payroll_entries.period_id)');
SELECT public._tmp_rbac_rewrite('fideicomiso_request_items', 'fideicomiso',
  '(SELECT fr.project_id FROM public.fideicomiso_requests fr WHERE fr.id = fideicomiso_request_items.request_id)');

-- =================================================================================
-- 6. CASOS ESPECIALES
-- =================================================================================

-- ── 6.1 CUADERNO DE OBRA (site_diary_entries) ─────────────────────────────────
-- Preserva la semántica de negocio: solo se editan/eliminan entradas ABIERTAS.
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='site_diary_entries' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.site_diary_entries', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "site_diary_entries_rbac_select" ON public.site_diary_entries FOR SELECT
  USING (public.fn_user_can_project(auth.uid(), project_id, 'avance', 'view'));

CREATE POLICY "site_diary_entries_rbac_insert" ON public.site_diary_entries FOR INSERT
  WITH CHECK (public.fn_user_can_project(auth.uid(), project_id, 'avance', 'edit'));

CREATE POLICY "site_diary_entries_rbac_update" ON public.site_diary_entries FOR UPDATE
  USING (status = 'Abierto' AND public.fn_user_can_project(auth.uid(), project_id, 'avance', 'edit'))
  WITH CHECK (status = 'Abierto' AND public.fn_user_can_project(auth.uid(), project_id, 'avance', 'edit'));

CREATE POLICY "site_diary_entries_rbac_delete" ON public.site_diary_entries FOR DELETE
  USING (status = 'Abierto' AND public.fn_user_can_project(auth.uid(), project_id, 'avance', 'delete'));

-- ── 6.2 SOLICITUDES DE SALIDA DE ALMACÉN (stock_withdrawal_requests) ──────────
-- Preserva la semántica: quien solicita es el dueño (requested_by);
-- aprobar/rechazar requiere permiso de aprobación de almacén (warehouse/pm/admin).
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='stock_withdrawal_requests' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.stock_withdrawal_requests', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "stock_withdrawal_requests_rbac_select" ON public.stock_withdrawal_requests FOR SELECT
  USING (public.fn_user_can_project(auth.uid(), project_id, 'almacen', 'view'));

CREATE POLICY "stock_withdrawal_requests_rbac_insert" ON public.stock_withdrawal_requests FOR INSERT
  WITH CHECK (requested_by = auth.uid() AND public.fn_user_can_project(auth.uid(), project_id, 'almacen', 'edit'));

CREATE POLICY "stock_withdrawal_requests_rbac_update" ON public.stock_withdrawal_requests FOR UPDATE
  USING (public.fn_user_can_project(auth.uid(), project_id, 'almacen', 'approve'))
  WITH CHECK (public.fn_user_can_project(auth.uid(), project_id, 'almacen', 'approve'));

CREATE POLICY "stock_withdrawal_requests_rbac_delete" ON public.stock_withdrawal_requests FOR DELETE
  USING (public.fn_user_can_project(auth.uid(), project_id, 'almacen', 'delete'));

-- =================================================================================
-- 7. LIMPIEZA
-- =================================================================================

DROP FUNCTION public._tmp_rbac_rewrite(TEXT, TEXT, TEXT);

-- =================================================================================
-- RESULTADO
-- =================================================================================
-- • Residente/ingeniero de obra: ve y opera SOLO su obra (rol en project_members).
-- • Gerente (admin org): ve todo, siempre (fn_user_can_project → admin = true).
-- • Contador (org): ve finanzas de TODAS las obras sin estar en project_members.
-- • Cualquier rol org con permiso en la matriz accede transversalmente a su módulo.
-- • service_role (server-side) bypasea RLS como siempre.
