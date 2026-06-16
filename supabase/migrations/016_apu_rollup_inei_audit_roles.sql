-- ================================================================
-- Konstruye+ — Migración 016
-- APU Roll-up automático, fix fórmula subtotal, INEI, Fórmula
-- Polinómica, Unidades CAPECO, Roles granulares, Audit Log
-- 2026-06-16 | KREO IA Studio
-- ================================================================

-- ── 1. FIX: apu_lines.subtotal — incluir crew_size (fórmula S10) ─
-- La expresión actual es: COALESCE(quantity_per_unit,0) * unit_price
-- La fórmula S10 correcta es: crew_size * COALESCE(quantity_per_unit,0) * unit_price
-- apu_lines tiene 0 filas — safe to drop & recreate
ALTER TABLE apu_lines
  DROP COLUMN subtotal;

ALTER TABLE apu_lines
  ADD COLUMN subtotal NUMERIC
    GENERATED ALWAYS AS (
      crew_size * COALESCE(quantity_per_unit, 0) * unit_price
    ) STORED;

-- ── 2. APU ROLL-UP AUTOMÁTICO ─────────────────────────────────────
-- Cadena: apu_lines → budget_items.unit_price → (total GENERATED: qty×price)
--         → budget_chapters.total → budgets.total

-- Helper: suma de subtotales APU → unit_price de la partida
CREATE OR REPLACE FUNCTION fn_recalc_item_from_apu(p_item_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE budget_items
  SET unit_price = COALESCE((
    SELECT SUM(subtotal) FROM apu_lines WHERE budget_item_id = p_item_id
  ), 0),
  updated_at = NOW()
  WHERE id = p_item_id;
END;
$$;

-- Helper: suma de totales de partidas → total del capítulo
CREATE OR REPLACE FUNCTION fn_recalc_chapter_total(p_chapter_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE budget_chapters
  SET total = COALESCE((
    SELECT SUM(quantity * unit_price)
    FROM budget_items WHERE chapter_id = p_chapter_id
  ), 0)
  WHERE id = p_chapter_id;
END;
$$;

-- Helper: suma de totales de partidas → total del presupuesto
CREATE OR REPLACE FUNCTION fn_recalc_budget_total(p_budget_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE budgets
  SET total = COALESCE((
    SELECT SUM(quantity * unit_price)
    FROM budget_items WHERE budget_id = p_budget_id
  ), 0),
  updated_at = NOW()
  WHERE id = p_budget_id;
END;
$$;

-- Trigger en apu_lines → recalcula unit_price de la partida
-- budget_items.total (GENERATED) se recalcula automáticamente
CREATE OR REPLACE FUNCTION fn_apu_rollup()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_item_id UUID;
BEGIN
  v_item_id := COALESCE(NEW.budget_item_id, OLD.budget_item_id);
  PERFORM fn_recalc_item_from_apu(v_item_id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_apu_rollup ON apu_lines;
CREATE TRIGGER trg_apu_rollup
  AFTER INSERT OR UPDATE OR DELETE ON apu_lines
  FOR EACH ROW EXECUTE FUNCTION fn_apu_rollup();

-- Trigger en budget_items → cuando cambia unit_price o quantity,
-- total (GENERATED) se recalcula y este trigger sube a capítulo/presupuesto
-- Nota: usamos UPDATE OF unit_price, quantity porque total es GENERATED ALWAYS AS
--       y no aparece en la lista de columnas de UPDATE
CREATE OR REPLACE FUNCTION fn_item_rollup()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_chapter_id UUID;
  v_budget_id  UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_chapter_id := OLD.chapter_id;
    v_budget_id  := OLD.budget_id;
  ELSE
    v_chapter_id := NEW.chapter_id;
    v_budget_id  := NEW.budget_id;
  END IF;

  IF v_chapter_id IS NOT NULL THEN
    PERFORM fn_recalc_chapter_total(v_chapter_id);
  END IF;
  PERFORM fn_recalc_budget_total(v_budget_id);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_item_rollup ON budget_items;
CREATE TRIGGER trg_item_rollup
  AFTER INSERT OR UPDATE OF unit_price, quantity OR DELETE ON budget_items
  FOR EACH ROW EXECUTE FUNCTION fn_item_rollup();

-- ── 3. EXTENDER TABLAS DE FÓRMULA POLINÓMICA ─────────────────────
-- reajuste_formulas: agregar budget_id y contract_date
ALTER TABLE reajuste_formulas
  ADD COLUMN IF NOT EXISTS budget_id      UUID REFERENCES budgets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contract_date  DATE,
  ADD COLUMN IF NOT EXISTS notes          TEXT;

-- reajuste_monomios: agregar symbol y sort_order
ALTER TABLE reajuste_monomios
  ADD COLUMN IF NOT EXISTS symbol     TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Validar suma de coeficientes ≤ 1.00 por fórmula
CREATE OR REPLACE FUNCTION fn_check_reajuste_coeff()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_sum NUMERIC;
BEGIN
  SELECT COALESCE(SUM(coefficient), 0)
  INTO v_sum
  FROM reajuste_monomios
  WHERE formula_id = NEW.formula_id
    AND id IS DISTINCT FROM NEW.id;

  IF v_sum + NEW.coefficient > 1.001 THEN
    RAISE EXCEPTION 'Coeficientes superan 1.00 (acumulado: %, nuevo total: %)',
      ROUND(v_sum, 4), ROUND(v_sum + NEW.coefficient, 4);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reajuste_coeff ON reajuste_monomios;
CREATE TRIGGER trg_reajuste_coeff
  BEFORE INSERT OR UPDATE OF coefficient ON reajuste_monomios
  FOR EACH ROW EXECUTE FUNCTION fn_check_reajuste_coeff();

-- ── 4. ÍNDICES INEI ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inei_indices (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  index_code   TEXT    NOT NULL,
  index_name   TEXT    NOT NULL,
  period_year  INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  index_value  NUMERIC(12,4) NOT NULL,
  source       TEXT    NOT NULL DEFAULT 'INEI',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (index_code, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_inei_code_period
  ON inei_indices (index_code, period_year DESC, period_month DESC);

ALTER TABLE inei_indices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read inei indices"
  ON inei_indices FOR SELECT USING (auth.uid() IS NOT NULL);

-- Seed: códigos INEI más usados en construcción peruana (base 100 = referencia)
INSERT INTO inei_indices (index_code, index_name, period_year, period_month, index_value) VALUES
  ('02', 'Acero de Construcción Liso',             2025, 12, 100.00),
  ('03', 'Acero de Construcción Corrugado',        2025, 12, 100.00),
  ('04', 'Agregado Fino',                          2025, 12, 100.00),
  ('05', 'Agregado Grueso',                        2025, 12, 100.00),
  ('13', 'Asfalto',                                2025, 12, 100.00),
  ('17', 'Bloque y Ladrillo',                      2025, 12, 100.00),
  ('21', 'Cemento Portland Tipo I',                2025, 12, 100.00),
  ('29', 'Mano de Obra (MO)',                      2025, 12, 100.00),
  ('30', 'Dólar (tipo de cambio)',                 2025, 12, 100.00),
  ('37', 'Herramienta Manual',                     2025, 12, 100.00),
  ('39', 'Madera Nacional para Encofrado',         2025, 12, 100.00),
  ('43', 'Madera Terciada para Encofrado',         2025, 12, 100.00),
  ('44', 'Maquinaria y Equipo Nacional',           2025, 12, 100.00),
  ('45', 'Maquinaria y Equipo Importado',          2025, 12, 100.00),
  ('47', 'Pintura Látex',                          2025, 12, 100.00),
  ('49', 'Tubería de Acero',                       2025, 12, 100.00),
  ('54', 'Tubería de PVC para Agua Potable',       2025, 12, 100.00),
  ('65', 'Vidrio Incoloro Doble',                  2025, 12, 100.00),
  ('67', 'Combustibles y Carburantes',             2025, 12, 100.00),
  ('71', 'Agua',                                   2025, 12, 100.00)
ON CONFLICT (index_code, period_year, period_month) DO NOTHING;

-- Función: calcular factor K de reajuste (D.S. 011-79-VC)
-- K = Σ( coef_i × Ir_i / Io_i )
-- donde Io = índice en fecha base del contrato, Ir = índice en período de valorización
CREATE OR REPLACE FUNCTION fn_calc_factor_k(
  p_formula_id UUID,
  p_base_year  INTEGER,
  p_base_month INTEGER,
  p_val_year   INTEGER,
  p_val_month  INTEGER
)
RETURNS NUMERIC LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_k  NUMERIC := 0;
  r    RECORD;
  v_io NUMERIC;
  v_ir NUMERIC;
BEGIN
  FOR r IN SELECT * FROM reajuste_monomios WHERE formula_id = p_formula_id LOOP
    SELECT index_value INTO v_io FROM inei_indices
    WHERE index_code = r.index_code
      AND period_year = p_base_year AND period_month = p_base_month;

    SELECT index_value INTO v_ir FROM inei_indices
    WHERE index_code = r.index_code
      AND period_year = p_val_year AND period_month = p_val_month;

    IF v_io IS NOT NULL AND v_io > 0 AND v_ir IS NOT NULL THEN
      v_k := v_k + r.coefficient * (v_ir / v_io);
    ELSE
      v_k := v_k + r.coefficient;  -- índice no disponible: ratio neutro = 1
    END IF;
  END LOOP;
  RETURN ROUND(v_k, 6);
END;
$$;

COMMENT ON FUNCTION fn_calc_factor_k IS
  'Fórmula Polinómica según D.S. 011-79-VC. '
  'Uso: fn_calc_factor_k(formula_id, año_base, mes_base, año_val, mes_val)';

-- Agregar campos de reajuste a valorizaciones
ALTER TABLE valorizaciones
  ADD COLUMN IF NOT EXISTS reajuste_formula_id UUID REFERENCES reajuste_formulas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS factor_k            NUMERIC(10,6) NOT NULL DEFAULT 1.000000,
  ADD COLUMN IF NOT EXISTS monto_reajuste      NUMERIC(14,4) NOT NULL DEFAULT 0;

-- ── 5. UNIDADES CAPECO ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS capeco_units (
  id       SERIAL PRIMARY KEY,
  code     TEXT   NOT NULL UNIQUE,
  name     TEXT   NOT NULL,
  category TEXT
);

INSERT INTO capeco_units (code, name, category) VALUES
  ('m',    'Metro lineal',       'longitud'),
  ('m2',   'Metro cuadrado',     'area'),
  ('m3',   'Metro cúbico',       'volumen'),
  ('kg',   'Kilogramo',          'masa'),
  ('tn',   'Tonelada',           'masa'),
  ('lb',   'Libra',              'masa'),
  ('pza',  'Pieza',              'unidad'),
  ('und',  'Unidad',             'unidad'),
  ('glb',  'Global',             'global'),
  ('jgo',  'Juego',              'global'),
  ('lt',   'Litro',              'volumen'),
  ('gal',  'Galón',              'volumen'),
  ('p2',   'Pie cuadrado',       'area'),
  ('p3',   'Pie cúbico',         'volumen'),
  ('hh',   'Hora-hombre',        'tiempo'),
  ('hm',   'Hora-máquina',       'tiempo'),
  ('dia',  'Día',                'tiempo'),
  ('mes',  'Mes',                'tiempo'),
  ('bls',  'Bolsa',              'envase'),
  ('roll', 'Rollo',              'envase'),
  ('var',  'Varilla',            'unidad'),
  ('plg',  'Plancha/lámina',     'unidad'),
  ('atd',  'Atado',              'unidad'),
  ('pt',   'Punto',              'unidad')
ON CONFLICT (code) DO NOTHING;

-- ── 6. ROLES GRANULARES POR MÓDULO ───────────────────────────────
-- Usa el enum user_role ya existente en Supabase
CREATE TABLE IF NOT EXISTS role_module_permissions (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  role        TEXT    NOT NULL,
  module      TEXT    NOT NULL CHECK (module IN (
                'presupuesto','apu','compras','almacen',
                'valorizaciones','nominas','reportes','configuracion'
              )),
  can_view    BOOLEAN NOT NULL DEFAULT false,
  can_edit    BOOLEAN NOT NULL DEFAULT false,
  can_approve BOOLEAN NOT NULL DEFAULT false,
  can_delete  BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (role, module)
);

INSERT INTO role_module_permissions
  (role, module, can_view, can_edit, can_approve, can_delete)
VALUES
  -- admin
  ('admin','presupuesto',    true,true,true,true),
  ('admin','apu',            true,true,true,true),
  ('admin','compras',        true,true,true,true),
  ('admin','almacen',        true,true,true,true),
  ('admin','valorizaciones', true,true,true,true),
  ('admin','nominas',        true,true,true,true),
  ('admin','reportes',       true,true,true,true),
  ('admin','configuracion',  true,true,true,true),
  -- project_manager
  ('project_manager','presupuesto',    true,true,true,false),
  ('project_manager','apu',            true,true,false,false),
  ('project_manager','compras',        true,true,true,false),
  ('project_manager','almacen',        true,true,false,false),
  ('project_manager','valorizaciones', true,true,true,false),
  ('project_manager','nominas',        true,true,false,false),
  ('project_manager','reportes',       true,false,false,false),
  ('project_manager','configuracion',  true,false,false,false),
  -- field_engineer
  ('field_engineer','presupuesto',    true,false,false,false),
  ('field_engineer','apu',            true,true,false,false),
  ('field_engineer','compras',        true,false,false,false),
  ('field_engineer','almacen',        true,true,false,false),
  ('field_engineer','valorizaciones', true,true,false,false),
  ('field_engineer','nominas',        true,true,false,false),
  ('field_engineer','reportes',       true,false,false,false),
  ('field_engineer','configuracion',  false,false,false,false),
  -- purchasing
  ('purchasing','presupuesto',    true,false,false,false),
  ('purchasing','apu',            false,false,false,false),
  ('purchasing','compras',        true,true,false,false),
  ('purchasing','almacen',        true,false,false,false),
  ('purchasing','valorizaciones', false,false,false,false),
  ('purchasing','nominas',        false,false,false,false),
  ('purchasing','reportes',       true,false,false,false),
  ('purchasing','configuracion',  false,false,false,false),
  -- warehouse
  ('warehouse','presupuesto',    true,false,false,false),
  ('warehouse','apu',            false,false,false,false),
  ('warehouse','compras',        true,true,false,false),
  ('warehouse','almacen',        true,true,false,false),
  ('warehouse','valorizaciones', false,false,false,false),
  ('warehouse','nominas',        false,false,false,false),
  ('warehouse','reportes',       true,false,false,false),
  ('warehouse','configuracion',  false,false,false,false),
  -- hr
  ('hr','presupuesto',    false,false,false,false),
  ('hr','apu',            false,false,false,false),
  ('hr','compras',        false,false,false,false),
  ('hr','almacen',        false,false,false,false),
  ('hr','valorizaciones', false,false,false,false),
  ('hr','nominas',        true,true,true,false),
  ('hr','reportes',       true,false,false,false),
  ('hr','configuracion',  false,false,false,false),
  -- readonly
  ('readonly','presupuesto',    true,false,false,false),
  ('readonly','apu',            true,false,false,false),
  ('readonly','compras',        true,false,false,false),
  ('readonly','almacen',        true,false,false,false),
  ('readonly','valorizaciones', true,false,false,false),
  ('readonly','nominas',        true,false,false,false),
  ('readonly','reportes',       true,false,false,false),
  ('readonly','configuracion',  false,false,false,false)
ON CONFLICT (role, module) DO NOTHING;

-- Función helper para la app: ¿puede este usuario hacer X en módulo Y?
CREATE OR REPLACE FUNCTION fn_user_can(
  p_user_id UUID,
  p_org_id  UUID,
  p_module  TEXT,
  p_action  TEXT   -- 'view' | 'edit' | 'approve' | 'delete'
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_role TEXT;
  v_can  BOOLEAN := false;
BEGIN
  SELECT role::TEXT INTO v_role
  FROM organization_members
  WHERE user_id = p_user_id AND organization_id = p_org_id
  LIMIT 1;

  IF v_role IS NULL THEN RETURN false; END IF;
  IF v_role = 'admin' THEN RETURN true; END IF;

  EXECUTE format(
    'SELECT can_%s FROM role_module_permissions WHERE role = $1 AND module = $2',
    p_action
  ) INTO v_can USING v_role, p_module;

  RETURN COALESCE(v_can, false);
END;
$$;

-- ── 7. AUDIT LOG ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  TEXT    NOT NULL,
  record_id   UUID    NOT NULL,
  operation   TEXT    NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  changed_by  UUID,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_values  JSONB,
  new_values  JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_table_record
  ON audit_logs (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_changed_at
  ON audit_logs (changed_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can view audit logs"
  ON audit_logs FOR SELECT USING (auth.uid() IS NOT NULL);

-- Función genérica de auditoría — se aplica a cualquier tabla con columna id UUID
CREATE OR REPLACE FUNCTION fn_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit_logs (table_name, record_id, operation, changed_by, old_values, new_values)
  VALUES (
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- Aplicar audit log a tablas críticas del módulo presupuesto
DROP TRIGGER IF EXISTS trg_audit_budgets      ON budgets;
DROP TRIGGER IF EXISTS trg_audit_budget_items ON budget_items;
DROP TRIGGER IF EXISTS trg_audit_apu_lines    ON apu_lines;

CREATE TRIGGER trg_audit_budgets
  AFTER INSERT OR UPDATE OR DELETE ON budgets
  FOR EACH ROW EXECUTE FUNCTION fn_audit();

CREATE TRIGGER trg_audit_budget_items
  AFTER INSERT OR UPDATE OR DELETE ON budget_items
  FOR EACH ROW EXECUTE FUNCTION fn_audit();

CREATE TRIGGER trg_audit_apu_lines
  AFTER INSERT OR UPDATE OR DELETE ON apu_lines
  FOR EACH ROW EXECUTE FUNCTION fn_audit();

-- ── 8. HABILITAR REALTIME EN TABLAS CRÍTICAS ─────────────────────
-- Necesario para colaboración simultánea (Sprint 3 del roadmap)
ALTER PUBLICATION supabase_realtime
  ADD TABLE budgets, budget_items, budget_chapters, apu_lines;

-- ── FIN MIGRACIÓN 016 ─────────────────────────────────────────────
