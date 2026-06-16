// ─────────────────────────────────────────────────────────────
// Permisos granulares por módulo
// Envuelve la matriz role_module_permissions + fn_user_can (migración 016)
// Uso desde Server Components y Route Handlers.
//
// Nota: el cliente se tipa con la interfaz estructural `SupabaseLike` (ver
// abajo) en lugar de `SupabaseClient<Database>`, porque el schema tipado del
// proyecto degrada las filas a `never`. Por eso se castean los resultados.
// ─────────────────────────────────────────────────────────────

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ModuleName, UserRole } from "@/types/database";

export type PermissionAction = "view" | "edit" | "approve" | "delete";

/**
 * Cliente de Supabase laxo en sus type params. Se usa en lugar de
 * `SupabaseClient<Database>` porque el schema tipado del proyecto no es
 * asignable al genérico por defecto (mismatch de params de schema). Tanto el
 * cliente SSR tipado como el cliente service-role son asignables a este alias.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = SupabaseClient<any, any, any, any, any>;

export type ModulePermissions = {
  can_view: boolean;
  can_edit: boolean;
  can_approve: boolean;
  can_delete: boolean;
};

const FULL_ACCESS: ModulePermissions = {
  can_view: true,
  can_edit: true,
  can_approve: true,
  can_delete: true,
};

/**
 * Rol del usuario actual en una organización.
 * Devuelve null si no hay sesión o el usuario no pertenece a la org.
 */
export async function getOrgRole(
  supabase: SupabaseLike,
  organizationId: string
): Promise<UserRole | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .limit(1)
    .maybeSingle();

  return ((data as { role: UserRole } | null)?.role) ?? null;
}

/**
 * ¿El usuario actual puede ejecutar `action` en `module` dentro de la org?
 * Delega en la función SQL fn_user_can (SECURITY DEFINER) para que la
 * evaluación viva en la BD y no se pueda eludir desde el cliente.
 */
export async function userCan(
  supabase: SupabaseLike,
  organizationId: string,
  module: ModuleName,
  action: PermissionAction
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase.rpc("fn_user_can", {
    p_user_id: user.id,
    p_org_id: organizationId,
    p_module: module,
    p_action: action,
  });

  if (error) {
    console.error("[permissions] fn_user_can error:", error.message);
    return false;
  }
  return Boolean(data);
}

/**
 * ¿El usuario actual puede ejecutar `action` en `module` dentro de un PROYECTO?
 * Project-aware: el rol de proyecto (project_members) tiene precedencia sobre
 * el rol de organización. Es la variante a usar en módulos ligados a un
 * proyecto (presupuesto, apu, valorizaciones…) porque es la misma base que
 * usan las policies RLS. Delega en fn_user_can_project (migración 019).
 */
export async function userCanProject(
  supabase: SupabaseLike,
  projectId: string,
  module: ModuleName,
  action: PermissionAction
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase.rpc("fn_user_can_project", {
    p_user_id: user.id,
    p_project_id: projectId,
    p_module: module,
    p_action: action,
  });

  if (error) {
    console.error("[permissions] fn_user_can_project error:", error.message);
    return false;
  }
  return Boolean(data);
}

/**
 * Matriz completa de permisos del rol de un usuario en la org.
 * Útil para precargar el estado de la UI (ocultar/deshabilitar acciones)
 * en una sola consulta en lugar de un RPC por acción.
 *
 * Devuelve un objeto donde cada clave es un módulo. Para `admin` cualquier
 * módulo resuelve a acceso total.
 */
export async function getPermissionMatrix(
  supabase: SupabaseLike,
  organizationId: string
): Promise<Record<string, ModulePermissions>> {
  const role = await getOrgRole(supabase, organizationId);
  if (!role) return {};

  // admin: acceso total a todos los módulos
  if (role === "admin") {
    return new Proxy({} as Record<string, ModulePermissions>, {
      get: () => FULL_ACCESS,
      has: () => true,
    });
  }

  const { data } = await supabase
    .from("role_module_permissions")
    .select("module, can_view, can_edit, can_approve, can_delete")
    .eq("role", role);

  const rows = (data ?? []) as Array<
    { module: ModuleName } & ModulePermissions
  >;

  const matrix: Record<string, ModulePermissions> = {};
  for (const row of rows) {
    matrix[row.module] = {
      can_view: row.can_view,
      can_edit: row.can_edit,
      can_approve: row.can_approve,
      can_delete: row.can_delete,
    };
  }
  return matrix;
}
