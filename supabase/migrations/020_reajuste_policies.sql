-- ================================================================
-- Kostruye+ — Migración 020
-- Seguridad: Políticas RLS para reajuste_formulas y reajuste_monomios
-- 2026-07-14 | KREO IA Studio — Houston (Gemini)
-- ================================================================

-- ── 1. POLÍTICAS PARA reajuste_formulas ───────────────────────────
ALTER TABLE reajuste_formulas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can view reajuste_formulas of their projects" ON reajuste_formulas;
CREATE POLICY "users can view reajuste_formulas of their projects"
  ON reajuste_formulas FOR SELECT
  USING (
    fn_user_can_project(auth.uid(), project_id, 'valorizaciones', 'view')
  );

DROP POLICY IF EXISTS "users can insert reajuste_formulas in their projects" ON reajuste_formulas;
CREATE POLICY "users can insert reajuste_formulas in their projects"
  ON reajuste_formulas FOR INSERT
  WITH CHECK (
    fn_user_can_project(auth.uid(), project_id, 'valorizaciones', 'edit')
  );

DROP POLICY IF EXISTS "users can update reajuste_formulas in their projects" ON reajuste_formulas;
CREATE POLICY "users can update reajuste_formulas in their projects"
  ON reajuste_formulas FOR UPDATE
  USING (
    fn_user_can_project(auth.uid(), project_id, 'valorizaciones', 'edit')
  );

DROP POLICY IF EXISTS "users can delete reajuste_formulas from their projects" ON reajuste_formulas;
CREATE POLICY "users can delete reajuste_formulas from their projects"
  ON reajuste_formulas FOR DELETE
  USING (
    fn_user_can_project(auth.uid(), project_id, 'valorizaciones', 'delete')
  );


-- ── 2. POLÍTICAS PARA reajuste_monomios ───────────────────────────
ALTER TABLE reajuste_monomios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can view reajuste_monomios of their projects" ON reajuste_monomios;
CREATE POLICY "users can view reajuste_monomios of their projects"
  ON reajuste_monomios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reajuste_formulas rf
      WHERE rf.id = formula_id
        AND fn_user_can_project(auth.uid(), rf.project_id, 'valorizaciones', 'view')
    )
  );

DROP POLICY IF EXISTS "users can insert reajuste_monomios in their projects" ON reajuste_monomios;
CREATE POLICY "users can insert reajuste_monomios in their projects"
  ON reajuste_monomios FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reajuste_formulas rf
      WHERE rf.id = formula_id
        AND fn_user_can_project(auth.uid(), rf.project_id, 'valorizaciones', 'edit')
    )
  );

DROP POLICY IF EXISTS "users can update reajuste_monomios in their projects" ON reajuste_monomios;
CREATE POLICY "users can update reajuste_monomios in their projects"
  ON reajuste_monomios FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM reajuste_formulas rf
      WHERE rf.id = formula_id
        AND fn_user_can_project(auth.uid(), rf.project_id, 'valorizaciones', 'edit')
    )
  );

DROP POLICY IF EXISTS "users can delete reajuste_monomios from their projects" ON reajuste_monomios;
CREATE POLICY "users can delete reajuste_monomios from their projects"
  ON reajuste_monomios FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM reajuste_formulas rf
      WHERE rf.id = formula_id
        AND fn_user_can_project(auth.uid(), rf.project_id, 'valorizaciones', 'delete')
    )
  );
