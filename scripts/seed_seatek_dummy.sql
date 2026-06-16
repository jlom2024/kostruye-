-- ================================================================
-- SEED DUMMY — Proyectos SEATEK Construcciones
-- Verifica: APU roll-up, Valorizaciones + Factor K, Control Costos,
--           Reajuste polinómico, Auditoría, INEI índices
-- Ejecutar via: Supabase MCP execute_sql (proyecto wyaugtdgmcesoryhyois)
-- 2026-06-16 | KREO IA Studio
--
-- Columnas reales verificadas:
--   inei_indices.index_value (no "value")
--   budgets.budget_type (no "type"), sin organization_id
--   budget_chapters.name + sort_order (no description/display_order)
--   budget_items.item_code (no "code")
--   apu_lines: yield_rate, quantity_per_unit, unit_price (no performance/quantity/unit_cost)
--   apu_lines.resource_type: UPPERCASE ('LABOR','MATERIAL','EQUIPMENT')
--   reajuste_formulas: sin columna description (usar notes)
--   valorizaciones: total_amount, start_date/end_date/period_name/val_number, sin organization_id
--   valorizaciones.factor_k: NOT NULL (usar 1.0 para drafts)
-- ================================================================

DO $$
DECLARE
  v_org_id       UUID;
  v_proj_kreo    UUID;
  v_proj_ro      UUID;
  v_budget_kreo  UUID;
  v_budget_ro    UUID;
  v_chap1_kreo   UUID;
  v_chap2_kreo   UUID;
  v_chap1_ro     UUID;
  v_item1        UUID;
  v_item2        UUID;
  v_formula_id   UUID;
  v_val_exists   INT;
  v_item_ro1     UUID;
  v_item_ro2     UUID;
BEGIN

SELECT id INTO v_org_id    FROM organizations WHERE name ILIKE '%SEATEK%' LIMIT 1;
SELECT id INTO v_proj_kreo FROM projects WHERE code = 'KREO-VIV-01' LIMIT 1;
SELECT id INTO v_proj_ro   FROM projects WHERE code = 'PRJ-RO-01'   LIMIT 1;

RAISE NOTICE 'Org: %, KREO: %, RO: %', v_org_id, v_proj_kreo, v_proj_ro;

-- ── 1. INEI índices ───────────────────────────────────────────────
INSERT INTO inei_indices (id, index_code, index_name, period_year, period_month, index_value)
VALUES
  (gen_random_uuid(), '02', 'Mano de Obra',           2024, 1,  100.00),
  (gen_random_uuid(), '02', 'Mano de Obra',           2024, 6,  104.50),
  (gen_random_uuid(), '02', 'Mano de Obra',           2024, 12, 108.20),
  (gen_random_uuid(), '03', 'Materiales',             2024, 1,  100.00),
  (gen_random_uuid(), '03', 'Materiales',             2024, 6,  102.30),
  (gen_random_uuid(), '03', 'Materiales',             2024, 12, 105.80),
  (gen_random_uuid(), '47', 'Acero de Construcción',  2024, 1,  100.00),
  (gen_random_uuid(), '47', 'Acero de Construcción',  2024, 6,   98.60),
  (gen_random_uuid(), '47', 'Acero de Construcción',  2024, 12, 101.40),
  (gen_random_uuid(), '65', 'Cemento Portland',       2024, 1,  100.00),
  (gen_random_uuid(), '65', 'Cemento Portland',       2024, 6,  103.10),
  (gen_random_uuid(), '65', 'Cemento Portland',       2024, 12, 106.50)
ON CONFLICT (index_code, period_year, period_month) DO NOTHING;

-- ── 2. KREO Vivienda — presupuesto ───────────────────────────────
SELECT id INTO v_budget_kreo FROM budgets WHERE project_id = v_proj_kreo AND budget_type = 'venta' LIMIT 1;
IF v_budget_kreo IS NULL THEN
  INSERT INTO budgets (id, project_id, budget_type, name, is_active)
  VALUES (gen_random_uuid(), v_proj_kreo, 'venta', 'Presupuesto Venta', true)
  RETURNING id INTO v_budget_kreo;
END IF;

INSERT INTO budget_chapters (id, budget_id, code, name, sort_order)
VALUES
  (gen_random_uuid(), v_budget_kreo, '01', 'ESTRUCTURAS',   1),
  (gen_random_uuid(), v_budget_kreo, '02', 'ARQUITECTURA',  2),
  (gen_random_uuid(), v_budget_kreo, '03', 'INSTALACIONES', 3)
ON CONFLICT DO NOTHING;

SELECT id INTO v_chap1_kreo FROM budget_chapters WHERE budget_id = v_budget_kreo AND code = '01';
SELECT id INTO v_chap2_kreo FROM budget_chapters WHERE budget_id = v_budget_kreo AND code = '02';

INSERT INTO budget_items (id, budget_id, chapter_id, item_code, description, unit, quantity, unit_price)
VALUES
  (gen_random_uuid(), v_budget_kreo, v_chap1_kreo, '01.01', 'CONCRETO F''C=210 KG/CM2',      'M3', 450,   480),
  (gen_random_uuid(), v_budget_kreo, v_chap1_kreo, '01.02', 'ACERO DE REFUERZO FY=4200',      'KG', 25000, 4.5),
  (gen_random_uuid(), v_budget_kreo, v_chap1_kreo, '01.03', 'ENCOFRADO Y DESENCOFRADO',       'M2', 800,   45),
  (gen_random_uuid(), v_budget_kreo, v_chap2_kreo, '02.01', 'PISO PORCELANATO 60X60',         'M2', 800,   85),
  (gen_random_uuid(), v_budget_kreo, v_chap2_kreo, '02.02', 'TARRAJEO FROTACHADO MUROS INT.', 'M2', 1200,  28)
ON CONFLICT DO NOTHING;

SELECT id INTO v_item1 FROM budget_items WHERE budget_id = v_budget_kreo AND item_code = '01.01';
SELECT id INTO v_item2 FROM budget_items WHERE budget_id = v_budget_kreo AND item_code = '01.02';

-- ── 3. APU — Concreto F'C=210 ────────────────────────────────────
IF v_item1 IS NOT NULL THEN
  INSERT INTO apu_lines (id, budget_item_id, resource_type, description, unit, crew_size, yield_rate, quantity_per_unit, unit_price)
  VALUES
    (gen_random_uuid(), v_item1, 'LABOR',    'CAPATAZ',              'HH',  0.1, 25,  4,     25.00),
    (gen_random_uuid(), v_item1, 'LABOR',    'OPERARIO',             'HH',  2,   25,  4,     21.00),
    (gen_random_uuid(), v_item1, 'LABOR',    'PEON',                 'HH',  2,   25,  4,     17.00),
    (gen_random_uuid(), v_item1, 'MATERIAL', 'CEMENTO PORTLAND TI',  'BOL', 0,   0,   9.73,  28.50),
    (gen_random_uuid(), v_item1, 'MATERIAL', 'ARENA GRUESA',         'M3',  0,   0,   0.54,  65.00),
    (gen_random_uuid(), v_item1, 'MATERIAL', 'PIEDRA CHANCADA 3/4"', 'M3',  0,   0,   0.56,  80.00),
    (gen_random_uuid(), v_item1, 'MATERIAL', 'AGUA',                 'M3',  0,   0,   0.184,  5.00),
    (gen_random_uuid(), v_item1, 'EQUIPMENT','MEZCLADORA 9-11P3',    'HM',  1,   25,  4,     18.00),
    (gen_random_uuid(), v_item1, 'EQUIPMENT','VIBRADOR DE CONCRETO', 'HM',  1,   25,  4,     12.00)
  ON CONFLICT DO NOTHING;
END IF;

-- ── APU — Acero de refuerzo ───────────────────────────────────────
IF v_item2 IS NOT NULL THEN
  INSERT INTO apu_lines (id, budget_item_id, resource_type, description, unit, crew_size, yield_rate, quantity_per_unit, unit_price)
  VALUES
    (gen_random_uuid(), v_item2, 'LABOR',    'OPERARIO',            'HH', 1, 250, 4,    21.00),
    (gen_random_uuid(), v_item2, 'LABOR',    'PEON',                'HH', 1, 250, 4,    17.00),
    (gen_random_uuid(), v_item2, 'MATERIAL', 'ACERO Ø3/8" FY=4200', 'KG', 0,   0, 1.07,  3.80),
    (gen_random_uuid(), v_item2, 'MATERIAL', 'ALAMBRE NEGRO N°16',  'KG', 0,   0, 0.06,  5.50)
  ON CONFLICT DO NOTHING;
END IF;

-- ── 4. Fórmula polinómica (D.S. 011-79-VC) ───────────────────────
INSERT INTO reajuste_formulas (id, project_id, name, notes)
VALUES (gen_random_uuid(), v_proj_kreo, 'Fórmula Polinómica Estándar', 'D.S. 011-79-VC edificación')
RETURNING id INTO v_formula_id;

INSERT INTO reajuste_monomios (id, formula_id, coefficient, index_code, description, symbol, sort_order)
VALUES
  (gen_random_uuid(), v_formula_id, 0.30, '02', 'Mano de Obra',          'MO', 1),
  (gen_random_uuid(), v_formula_id, 0.25, '03', 'Materiales',            'MT', 2),
  (gen_random_uuid(), v_formula_id, 0.20, '47', 'Acero de Construcción', 'AC', 3),
  (gen_random_uuid(), v_formula_id, 0.20, '65', 'Cemento Portland',      'CE', 4),
  (gen_random_uuid(), v_formula_id, 0.05, 'GG', 'Gastos Generales',      'GG', 5);

-- ── 5. Valorizaciones (val_number, factor_k NOT NULL) ─────────────
SELECT COUNT(*) INTO v_val_exists FROM valorizaciones WHERE project_id = v_proj_kreo;
IF v_val_exists = 0 THEN
  INSERT INTO valorizaciones (id, project_id, val_number, period_name, start_date, end_date, status,
    total_amount, reajuste_formula_id, factor_k, monto_reajuste)
  VALUES
    (gen_random_uuid(), v_proj_kreo, 1, 'Octubre 2024',  '2024-10-01', '2024-10-31', 'approved', 180000, v_formula_id, 1.0420, 7560),
    (gen_random_uuid(), v_proj_kreo, 2, 'Noviembre 2024','2024-11-01', '2024-11-30', 'approved', 220000, v_formula_id, 1.0510, 11220),
    (gen_random_uuid(), v_proj_kreo, 3, 'Diciembre 2024','2024-12-01', '2024-12-31', 'draft',    195000, v_formula_id, 1.0000, 0);
END IF;

-- ── 6. PRJ-RO-01 — presupuesto ───────────────────────────────────
SELECT id INTO v_budget_ro FROM budgets WHERE project_id = v_proj_ro AND budget_type = 'venta' LIMIT 1;
IF v_budget_ro IS NULL THEN
  INSERT INTO budgets (id, project_id, budget_type, name, is_active)
  VALUES (gen_random_uuid(), v_proj_ro, 'venta', 'Presupuesto Venta', true)
  RETURNING id INTO v_budget_ro;
END IF;

INSERT INTO budget_chapters (id, budget_id, code, name, sort_order)
VALUES (gen_random_uuid(), v_budget_ro, '01', 'OBRAS PRELIMINARES', 1)
ON CONFLICT DO NOTHING;

SELECT id INTO v_chap1_ro FROM budget_chapters WHERE budget_id = v_budget_ro AND code = '01';

INSERT INTO budget_items (id, budget_id, chapter_id, item_code, description, unit, quantity, unit_price)
VALUES
  (gen_random_uuid(), v_budget_ro, v_chap1_ro, '01.01', 'LIMPIEZA DE TERRENO MANUAL', 'M2', 500, 3.50),
  (gen_random_uuid(), v_budget_ro, v_chap1_ro, '01.02', 'TRAZO, NIVEL Y REPLANTEO',   'M2', 500, 4.80)
ON CONFLICT DO NOTHING;

SELECT id INTO v_item_ro1 FROM budget_items WHERE budget_id = v_budget_ro AND item_code = '01.01';
SELECT id INTO v_item_ro2 FROM budget_items WHERE budget_id = v_budget_ro AND item_code = '01.02';

-- Vincular stock_withdrawals a partidas (sin LIMIT en UPDATE — usar subquery)
IF v_item_ro1 IS NOT NULL THEN
  UPDATE stock_withdrawals
  SET budget_item_id = v_item_ro1
  WHERE id IN (
    SELECT id FROM stock_withdrawals
    WHERE project_id = v_proj_ro AND budget_item_id IS NULL
    ORDER BY created_at LIMIT 2
  );
END IF;
IF v_item_ro2 IS NOT NULL THEN
  UPDATE stock_withdrawals
  SET budget_item_id = v_item_ro2
  WHERE id IN (
    SELECT id FROM stock_withdrawals
    WHERE project_id = v_proj_ro AND budget_item_id IS NULL
    ORDER BY created_at
  );
END IF;

RAISE NOTICE '=== SEED COMPLETADO — budget_kreo: %, formula: %', v_budget_kreo, v_formula_id;
END $$;
