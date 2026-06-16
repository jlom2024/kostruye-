# Permisos granulares por módulo

Implementa el control de acceso por rol y módulo apoyado en la BD (migración 016).

- **Tabla:** `role_module_permissions` — matriz `(role × module)` con `can_view/can_edit/can_approve/can_delete`.
- **Funciones SQL:**
  - `fn_user_can(p_user_id, p_org_id, p_module, p_action)` — evalúa contra el rol de **organización** (`organization_members`).
  - `fn_user_can_project(p_user_id, p_project_id, p_module, p_action)` — *(migración 019)* evalúa contra el rol de **proyecto** (`project_members`) con **precedencia**, fallback al rol de org. Es la **misma base que usan las policies RLS**, así que es la variante correcta para módulos ligados a un proyecto.
  - Ambas son `SECURITY DEFINER`, `search_path` fijo, ejecutables solo por `authenticated`.
- **Helper TS:** [`lib/permissions.ts`](../lib/permissions.ts) — `userCan` (org), `userCanProject` (proyecto), `getOrgRole`, `getPermissionMatrix`.

## ¿org-level o project-level?

| Contexto | Usar | Por qué |
|----------|------|---------|
| Módulo dentro de un proyecto (presupuesto, apu, valorizaciones, compras, almacén, nóminas) | `userCanProject` | El rol de proyecto tiene precedencia y es la base de la RLS |
| Acción a nivel organización (configuración, equipo, SUNAT) | `userCan` | No hay proyecto en contexto |

## Módulos y acciones

| Módulos (`ModuleName`) | Acciones (`PermissionAction`) |
|------------------------|-------------------------------|
| `presupuesto`, `apu`, `compras`, `almacen`, `valorizaciones`, `nominas`, `reportes`, `configuracion` | `view`, `edit`, `approve`, `delete` |

`admin` siempre tiene acceso total. El resto se resuelve contra la matriz.

## Uso en Server Components

```tsx
import { createClient } from "@/lib/supabase/server";
import { userCan, getPermissionMatrix } from "@/lib/permissions";

export default async function Page() {
  const supabase = await createClient();

  // Check puntual
  const canApprove = await userCan(supabase, orgId, "valorizaciones", "approve");

  // Matriz completa (1 sola consulta) para condicionar la UI
  const perms = await getPermissionMatrix(supabase, orgId);
  // perms["compras"]?.can_edit, etc.

  return <>{canApprove && <ApproveButton />}</>;
}
```

## Uso en Route Handlers (API)

```ts
import { createClient } from "@/lib/supabase/server";
import { userCan } from "@/lib/permissions";

export async function POST(req: Request) {
  const supabase = await createClient();
  const orgId = /* … */;

  if (!(await userCan(supabase, orgId, "presupuesto", "edit"))) {
    return new Response("Forbidden", { status: 403 });
  }
  // … continuar
}
```

## Estado de integración

- ✅ Backend: tabla + matriz seed + `fn_user_can` (migración 016, hardened en 017/018).
- ✅ Helper TS `lib/permissions.ts` (`getOrgRole`, `userCan`, `getPermissionMatrix`).
- ✅ **Valorizaciones — aprobar:** `valorizaciones/page.tsx` calcula `canApprove` con `userCanProject(..., "valorizaciones", "approve")`; `valorizaciones-client.tsx` oculta los botones "Aprobar" y bloquea `changeStatus(…, "approved")` sin permiso.
- ✅ **Presupuesto / APU — editar:** `presupuesto/page.tsx` calcula `canEdit` con `userCanProject(..., "presupuesto", "edit")`; `budget-editor.tsx` recibe `canEdit`, oculta el botón "Capítulo" y los botones de import (S10/OCR), y todas las mutaciones (capítulos, partidas, líneas APU) pasan por `guardEdit()`.
- ✅ **Compras — aprobar/emitir OC:** `compras/page.tsx` calcula `canApprove` con `userCanProject(..., "compras", "approve")`; `purchase-orders-client.tsx` oculta el bloque "Cambiar estado" y `changeStatus` bloquea transiciones (enviar/recibir/anular) sin permiso.
- ✅ **API SUNAT (`/api/org/sunat` PATCH):** reemplazado el check ad-hoc `role !== "admin"` por `userCan(..., "configuracion", "edit")`.
- ⏳ **Pendiente:** gestión de equipo (ya admin-only por check propio); editar líneas de OC (`compras.edit`, hoy cubierto por RLS).

### RLS verificada (barrera real)

- `valorizaciones`: la policy `project_admins_write_valorizaciones` (`ALL`) ya restringe toda escritura — **incluida la aprobación** — a `admin`/`project_manager` vía `project_members.role`. El guard de UI es consistente con esto.
- `budgets`/`budget_items`/`budget_chapters`/`apu_lines`: escritura restringida vía cadena de policies a miembros del proyecto (presupuesto: admin/PM en `budgets`; items/apu heredan por pertenencia al presupuesto).

> El RPC `fn_user_can` solo es ejecutable por el rol `authenticated` (revocado de `anon`/`PUBLIC` en migración 018).
>
> **Defensa en profundidad:** estos guards son de UX/servidor; la barrera definitiva sigue siendo la RLS de la BD. Ocultar un botón no sustituye una policy.
