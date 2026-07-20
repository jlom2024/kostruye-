-- ================================================================
-- Kostruye+ — Migración 048
-- fn_audit: resolución genérica de project_id/organization_id
-- para cualquier tabla auditada que tenga project_id (incluye hse_incidents)
-- ================================================================

CREATE OR REPLACE FUNCTION fn_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_project_id UUID := NULL;
  v_org_id     UUID := NULL;
  v_row_json   JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row_json := to_jsonb(OLD);
  ELSE
    v_row_json := to_jsonb(NEW);
  END IF;

  -- Resolver project_id según la estructura del registro
  IF v_row_json ? 'project_id' THEN
    v_project_id := (v_row_json ->> 'project_id')::UUID;
  ELSIF v_row_json ? 'budget_id' THEN
    SELECT project_id INTO v_project_id
    FROM budgets
    WHERE id = (v_row_json ->> 'budget_id')::UUID
    LIMIT 1;
  END IF;

  -- Resolver organization_id desde el registro o desde el proyecto
  IF v_row_json ? 'organization_id' THEN
    v_org_id := (v_row_json ->> 'organization_id')::UUID;
  ELSIF v_row_json ? 'org_id' THEN
    v_org_id := (v_row_json ->> 'org_id')::UUID;
  ELSIF v_project_id IS NOT NULL THEN
    SELECT organization_id INTO v_org_id
    FROM projects
    WHERE id = v_project_id
    LIMIT 1;
  END IF;

  INSERT INTO audit_logs (
    table_name,
    record_id,
    operation,
    changed_by,
    old_values,
    new_values,
    organization_id,
    project_id
  )
  VALUES (
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    v_org_id,
    v_project_id
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- Asegurar search_path y permisos consistentes con migraciones 016-017
ALTER FUNCTION fn_audit() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION fn_audit() FROM anon, authenticated, public;

-- Backfill: rellenar project_id/organization_id de logs de hse_incidents que quedaron nulos
UPDATE audit_logs al
SET
  project_id = (al.old_values ->> 'project_id')::UUID,
  organization_id = (
    SELECT p.organization_id
    FROM projects p
    WHERE p.id = (al.old_values ->> 'project_id')::UUID
    LIMIT 1
  )
WHERE al.table_name = 'hse_incidents'
  AND al.operation = 'DELETE'
  AND al.project_id IS NULL
  AND al.old_values ? 'project_id';
