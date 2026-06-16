-- ================================================================
-- Kostruye+ — Migración 022: Fideicomiso por proyecto
--
-- Añade campos de fideicomiso a la tabla projects para que
-- cada obra pueda autorizarse independientemente a CORFID.
-- La empresa ya tiene los campos en app_clients (migración 013).
-- 2026-06-16 | KREO IA Studio
-- ================================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS fideicomiso_enabled       BOOLEAN    NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fideicomiso_ruc            TEXT       DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fideicomiso_authorized_at  TIMESTAMPTZ DEFAULT NULL;

-- RLS: solo miembros del proyecto pueden leer/actualizar
CREATE POLICY IF NOT EXISTS "project members can read fideicomiso"
  ON projects FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM project_members WHERE project_id = id
    )
    OR
    auth.uid() IN (
      SELECT user_id FROM organization_members WHERE organization_id = projects.organization_id
    )
  );

COMMENT ON COLUMN projects.fideicomiso_enabled IS
  'True cuando la obra ha enviado solicitud de fideicomiso a DH Consultores via CORFID.';
COMMENT ON COLUMN projects.fideicomiso_ruc IS
  'RUC de la empresa ingresado al autorizar el fideicomiso de esta obra.';
COMMENT ON COLUMN projects.fideicomiso_authorized_at IS
  'Timestamp de autorización. NULL = solicitud enviada pero pendiente de activación por DH Consultores.';
