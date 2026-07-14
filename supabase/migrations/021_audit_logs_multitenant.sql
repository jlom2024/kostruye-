-- ================================================================
-- Kostruye+ — Migración 021
-- Auditoría: org_id/project_id en audit_logs y fn_audit multi-tenant
-- 2026-07-14 | KREO IA Studio — Houston (Gemini)
-- ================================================================

-- 1. Agregar columnas de tenant a la tabla de logs
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS org_id     UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- 2. Actualizar función de auditoría genérica para capturar tenant dinámicamente
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

  -- Intentar extraer project_id dinámicamente según las columnas de la tabla auditada
  IF v_row_json ? 'project_id' THEN
    v_project_id := (v_row_json ->> 'project_id')::UUID;
  ELSIF v_row_json ? 'budget_id' THEN
    SELECT project_id INTO v_project_id
    FROM budgets
    WHERE id = (v_row_json ->> 'budget_id')::UUID
    LIMIT 1;
  END IF;

  -- Intentar extraer organization_id / org_id dinámicamente o resolverlo del proyecto
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

  -- Insertar en el log con los campos adicionales
  INSERT INTO audit_logs (
    table_name,
    record_id,
    operation,
    changed_by,
    old_values,
    new_values,
    org_id,
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

COMMENT ON FUNCTION fn_audit IS
  'Trigger de auditoría mejorado (multi-tenant). '
  'Copia automáticamente org_id y project_id analizando la estructura del registro.';
