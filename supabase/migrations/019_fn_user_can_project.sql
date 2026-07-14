-- ================================================================
-- Kostruye+ — Migración 019
-- Seguridad: Función helper fn_user_can_project (project-aware)
-- 2026-07-14 | KREO IA Studio — Houston (Gemini)
-- ================================================================

-- Implementación real de la función
CREATE OR REPLACE FUNCTION fn_user_can_project(
  p_user_id    UUID,
  p_project_id UUID,
  p_module     TEXT,
  p_action     TEXT
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_role TEXT;
  v_org_id UUID;
  v_can  BOOLEAN := false;
BEGIN
  -- 1. Intentar obtener el rol a nivel de proyecto (project_members)
  SELECT role::TEXT INTO v_role
  FROM project_members
  WHERE user_id = p_user_id AND project_id = p_project_id
  LIMIT 1;

  -- 2. Si no hay rol de proyecto, heredar el rol global de la organización
  IF v_role IS NULL THEN
    SELECT organization_id INTO v_org_id
    FROM projects
    WHERE id = p_project_id
    LIMIT 1;

    IF v_org_id IS NOT NULL THEN
      SELECT role::TEXT INTO v_role
      FROM organization_members
      WHERE user_id = p_user_id AND organization_id = v_org_id
      LIMIT 1;
    END IF;
  END IF;

  -- 3. Validar privilegios del rol
  IF v_role IS NULL THEN RETURN false; END IF;
  IF v_role = 'admin' THEN RETURN true; END IF;

  EXECUTE format(
    'SELECT can_%s FROM role_module_permissions WHERE role = $1 AND module = $2',
    p_action
  ) INTO v_can USING v_role, p_module;

  RETURN COALESCE(v_can, false);
END;
$$;

-- Restringir ejecución por defecto a PUBLIC y otorgar permisos a roles autenticados
REVOKE ALL ON FUNCTION fn_user_can_project(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_user_can_project(UUID, UUID, TEXT, TEXT) TO authenticated, service_role;

COMMENT ON FUNCTION fn_user_can_project IS
  'Comprueba si un usuario tiene permisos para realizar una acción en un módulo dentro de un proyecto. '
  'Soporta precedencia de roles: project_members > organization_members.';
