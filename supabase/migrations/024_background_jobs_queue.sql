-- ================================================================
-- Kostruye+ — Migración 024
-- Jobs: Cola de Procesamiento Asíncrono en Segundo Plano
-- 2026-07-14 | KREO IA Studio — Houston (Gemini)
-- ================================================================

CREATE TABLE IF NOT EXISTS background_jobs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id     UUID REFERENCES projects(id) ON DELETE CASCADE,
  job_type       TEXT NOT NULL CHECK (job_type IN ('export_budget_pdf', 'export_budget_xlsx', 'recalculate_apu', 'import_s10')),
  payload        JSONB NOT NULL DEFAULT '{}'::jsonb,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress       INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  result_url     TEXT,
  error_message  TEXT,
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS habilitada
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura: usuarios de la org pueden ver sus propios background jobs
CREATE POLICY "users can view background jobs of their organization"
  ON background_jobs FOR SELECT
  USING (
    org_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Políticas de inserción: cualquier usuario autenticado de la org puede encolar un job
CREATE POLICY "users can insert background jobs for their organization"
  ON background_jobs FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Políticas de actualización: sólo el service_role (o el trigger) puede cambiar estados de jobs
CREATE POLICY "service role can update background jobs"
  ON background_jobs FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Ítems para búsquedas rápidas (por org + proyecto + status)
CREATE INDEX IF NOT EXISTS idx_bg_jobs_org_status
  ON background_jobs (org_id, status);

CREATE INDEX IF NOT EXISTS idx_bg_jobs_project
  ON background_jobs (project_id)
  WHERE project_id IS NOT NULL;

-- Trigger para mantener actualizado updated_at
CREATE OR REPLACE FUNCTION fn_update_bg_job_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_bg_job_timestamp
  BEFORE UPDATE ON background_jobs
  FOR EACH ROW EXECUTE FUNCTION fn_update_bg_job_timestamp();

COMMENT ON TABLE background_jobs IS
  'Cola de tareas y reportes asíncronos que se ejecutan en segundo plano. '
  'Usar para: Exportación PDF/Excel pesados, recálculos masivos, importación masiva S10.';
