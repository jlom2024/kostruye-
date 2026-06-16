# Auditoría (Audit Log)

Registro inmutable de cambios sobre las tablas críticas del módulo presupuesto, con diff antes/después y autor.

## Backend

- **Tabla `audit_logs`** (migración 016): `table_name`, `record_id`, `operation`, `changed_by`, `changed_at`, `old_values` (JSONB), `new_values` (JSONB), + `organization_id`, `project_id` (migración 021).
- **Trigger `fn_audit()`** sobre `budgets`, `budget_items`, `apu_lines` — registra INSERT/UPDATE/DELETE con snapshot completo de la fila y `auth.uid()` del autor.
- **Resolución de proyecto/organización** (migración 021): `fn_audit` deriva `project_id` y `organization_id` desde el registro afectado:
  - `budgets` → `project_id` directo
  - `budget_items` → `budget_id` → `budgets.project_id`
  - `apu_lines` → `budget_item_id` → `budget_items.budget_id` → `budgets.project_id`
- **RLS:** lectura restringida a la organización del usuario (`organization_id IN (orgs del usuario)`). Antes (016) cualquier autenticado leía todos los logs — corregido en 021.

## UI

- **Ruta:** `/proyectos/[id]/auditoria` (entrada en el sidebar para `admin`/`contador`).
- **Page:** [`page.tsx`](../app/(dashboard)/proyectos/[id]/auditoria/page.tsx) — últimos 300 eventos del proyecto; resuelve los nombres de los autores vía `profiles`.
- **Client:** [`auditoria-client.tsx`](../app/(dashboard)/proyectos/[id]/auditoria/auditoria-client.tsx):
  - Eventos agrupados por día, con badge de operación (Creó/Editó/Eliminó), tabla afectada, autor y hora.
  - Buscador (campo/valor/autor) + filtro por tipo de operación.
  - Al expandir: diff de campos. En UPDATE muestra **antes** (tachado) vs **después**; campos de ruido (`id`, `created_at`, FKs, `sort_order`) se omiten; nombres de campo legibles.

## Notas

- El audit log es **append-only**; no hay UI de edición/borrado (correcto para trazabilidad).
- Cobertura actual: presupuesto (budgets/items/apu). Extensible a otras tablas añadiendo el trigger `fn_audit` y, si aplica, la resolución de `project_id` en la función.
