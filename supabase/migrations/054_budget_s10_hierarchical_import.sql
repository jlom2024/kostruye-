-- ==============================================================================
-- Migraci??n 054: Importaci??n Jer??rquica S10 con Desactivaci??n de Triggers
-- ==============================================================================
-- Permite importar presupuestos S10 de gran escala (cientos de cap??tulos y partidas)
-- preservando la jerarqu??a multinivel (Componente, M??dulo, Especialidad, Subt??tulo),
-- relacionando padres e hijos (parent_id) y desactivando temporalmente los triggers
-- de rollup y auditor??a con SECURITY DEFINER para evitar timeouts y bloqueos de permisos.

-- 1. Asegurar columnas de jerarqu??a en budget_chapters
ALTER TABLE budget_chapters ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES budget_chapters(id) ON DELETE CASCADE;
ALTER TABLE budget_chapters ADD COLUMN IF NOT EXISTS level INT DEFAULT 1;

-- 2. Funci??n de importaci??n por lotes con SECURITY DEFINER
CREATE OR REPLACE FUNCTION import_budget_chunk(
  p_budget_id uuid,
  p_chapters jsonb,
  p_wipe boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chapter    jsonb;
  v_item       jsonb;
  v_chapter_id uuid;
  v_parent_id  uuid;
  v_sort_ch    int;
  v_sort_it    int;
  v_count      int := 0;
  v_parent_code text;
BEGIN
  -- Si p_wipe es true (primer lote), limpiar partidas y cap??tulos previos
  IF p_wipe THEN
    DELETE FROM budget_items    WHERE budget_id = p_budget_id;
    DELETE FROM budget_chapters WHERE budget_id = p_budget_id;
  END IF;

  SELECT COALESCE(MAX(sort_order), 0) INTO v_sort_ch
  FROM budget_chapters WHERE budget_id = p_budget_id;

  -- Desactivar triggers costosos durante la inserci??n masiva
  ALTER TABLE budget_items DISABLE TRIGGER trg_item_rollup;
  ALTER TABLE budget_items DISABLE TRIGGER trg_audit_budget_items;

  FOR v_chapter IN SELECT * FROM jsonb_array_elements(p_chapters)
  LOOP
    v_sort_ch := v_sort_ch + 10;
    v_parent_code := NULLIF(v_chapter->>'parent_code', '');
    v_parent_id := NULL;

    -- Enlazar con cap??tulo padre si se proporcion?? parent_code
    IF v_parent_code IS NOT NULL THEN
      SELECT id INTO v_parent_id
      FROM budget_chapters
      WHERE budget_id = p_budget_id AND code = v_parent_code
      ORDER BY sort_order DESC
      LIMIT 1;
    END IF;

    INSERT INTO budget_chapters (budget_id, code, name, level, parent_id, sort_order, total)
    VALUES (
      p_budget_id,
      v_chapter->>'code',
      COALESCE(v_chapter->>'name',''),
      COALESCE((v_chapter->>'level')::int, 1),
      v_parent_id,
      v_sort_ch,
      COALESCE((v_chapter->>'total')::numeric, 0)
    )
    RETURNING id INTO v_chapter_id;

    v_sort_it := 0;
    IF v_chapter ? 'items' AND jsonb_array_length(v_chapter->'items') > 0 THEN
      FOR v_item IN SELECT * FROM jsonb_array_elements(v_chapter->'items')
      LOOP
        v_sort_it := v_sort_it + 10;
        INSERT INTO budget_items
          (budget_id, chapter_id, item_code, description, unit, quantity, unit_price, total, sort_order)
        VALUES (
          p_budget_id,
          v_chapter_id,
          v_item->>'item_code',
          COALESCE(v_item->>'description',''),
          COALESCE(NULLIF(v_item->>'unit',''),'und'),
          COALESCE((v_item->>'quantity')::numeric, 0),
          COALESCE((v_item->>'unit_price')::numeric, 0),
          COALESCE((v_item->>'total')::numeric,
                   ROUND(COALESCE((v_item->>'quantity')::numeric,0) * COALESCE((v_item->>'unit_price')::numeric,0), 2)),
          v_sort_it
        );
        v_count := v_count + 1;
      END LOOP;
    END IF;
  END LOOP;

  -- Reactivar triggers
  ALTER TABLE budget_items ENABLE TRIGGER trg_item_rollup;
  ALTER TABLE budget_items ENABLE TRIGGER trg_audit_budget_items;

  RETURN jsonb_build_object('inserted', v_count);
END;
$$;

-- 3. Funci??n de finalizaci??n y c??lculo de totales acumulados
CREATE OR REPLACE FUNCTION import_budget_finalize(p_budget_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Actualizar totales de cap??tulos hoja (los que tienen partidas directas)
  UPDATE budget_chapters c
  SET total = COALESCE((SELECT SUM(i.total) FROM budget_items i WHERE i.chapter_id = c.id), 0)
  WHERE c.budget_id = p_budget_id
    AND EXISTS (SELECT 1 FROM budget_items i WHERE i.chapter_id = c.id);

  -- Actualizar gran total del presupuesto
  UPDATE budgets
  SET total = COALESCE((SELECT SUM(i.total) FROM budget_items i WHERE i.budget_id = p_budget_id), 0),
      updated_at = NOW()
  WHERE id = p_budget_id;

  RETURN jsonb_build_object(
    'chapters', (SELECT COUNT(*) FROM budget_chapters WHERE budget_id = p_budget_id),
    'items',    (SELECT COUNT(*) FROM budget_items    WHERE budget_id = p_budget_id),
    'total',    (SELECT total    FROM budgets         WHERE id = p_budget_id)
  );
END;
$$;

-- 4. Otorgar permisos al rol authenticated
GRANT EXECUTE ON FUNCTION import_budget_chunk(uuid, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION import_budget_finalize(uuid) TO authenticated;
