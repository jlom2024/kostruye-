# Migraciones 016–018 — APU Roll-up, INEI, Roles, Auditoría

**Fecha:** 2026-06-16
**Autor:** KREO IA Studio
**Objetivo:** Cerrar brechas críticas del análisis `konstruye_vs_obracore.pdf` (módulos Presupuestos/APU, Valorizaciones y Stack Técnico) y endurecer la seguridad.

Aplicadas en producción vía Supabase MCP sobre el proyecto `wyaugtdgmcesoryhyois`.

| Migración | Nombre | Rol |
|-----------|--------|-----|
| `016_apu_rollup_inei_audit_roles.sql` | Funcionalidad principal | APU, INEI, roles, auditoría |
| `017_harden_migration_016` (solo remoto) | Hardening | RLS, search_path, REVOKE anon |
| `018_revoke_fn_user_can_public` (solo remoto) | Fix grant | REVOKE de PUBLIC en `fn_user_can` |
| `019_fn_user_can_project` (solo remoto) | Permisos project-aware | `fn_user_can_project` (rol de proyecto con precedencia) |
| `020_reajuste_write_policies` (solo remoto) | RLS escritura | INSERT/UPDATE/DELETE en `reajuste_formulas`/`reajuste_monomios` (admin/PM) |
| `021_audit_scope_org_project` (solo remoto) | Audit multi-tenant | `audit_logs` + `organization_id`/`project_id`, `fn_audit` resuelve proyecto, RLS por org |

> ⚠️ Las migraciones 017 y 018 se aplicaron directo en remoto (correcciones de advisories). Su SQL está embebido más abajo para reproducibilidad; conviene consolidarlas en archivos `.sql` si se rehace el entorno desde cero.

---

## 1. Fix de la fórmula APU (S10)

`apu_lines.subtotal` era una columna **GENERATED ALWAYS AS** con expresión incompleta:

```sql
-- ANTES (incorrecto)
COALESCE(quantity_per_unit, 0) * unit_price

-- DESPUÉS (fórmula S10 correcta)
crew_size * COALESCE(quantity_per_unit, 0) * unit_price
```

Se recreó la columna (la tabla tenía 0 filas, operación segura). El editor de presupuesto (`budget-editor.tsx`) ya usaba la fórmula correcta en el cliente; ahora la BD es consistente con la app.

---

## 2. Roll-up automático APU → Presupuesto

Antes el recálculo lo hacía manualmente el cliente. Ahora cae en cascada por triggers:

```
apu_lines (INSERT/UPDATE/DELETE)
  └─ trg_apu_rollup → fn_recalc_item_from_apu()
       └─ budget_items.unit_price = SUM(apu_lines.subtotal)
            └─ budget_items.total  (GENERATED: quantity × unit_price) ← recalcula solo
                 └─ trg_item_rollup → fn_item_rollup()
                      ├─ budget_chapters.total = SUM(items.quantity × unit_price)
                      └─ budgets.total          = SUM(items.quantity × unit_price)
```

**Nota clave:** `budget_items.total` es `GENERATED ALWAYS AS`, no se puede escribir desde un trigger. Por eso `trg_item_rollup` se dispara con `AFTER ... UPDATE OF unit_price, quantity` (no de `total`), y solo los triggers actualizan `unit_price`; `total` se recalcula solo.

Funciones nuevas: `fn_recalc_item_from_apu`, `fn_recalc_chapter_total`, `fn_recalc_budget_total`, `fn_apu_rollup`, `fn_item_rollup`.

---

## 3. Fórmula Polinómica (D.S. 011-79-VC)

Se **extendieron** las tablas existentes (no se duplicaron):

- `reajuste_formulas` + `budget_id`, `contract_date`, `notes`
- `reajuste_monomios` + `symbol`, `sort_order`

Validación: `trg_reajuste_coeff` impide que la suma de coeficientes de una fórmula supere `1.00` (tolerancia `0.001`).

### Cálculo del factor K

```sql
fn_calc_factor_k(formula_id, año_base, mes_base, año_val, mes_val) → NUMERIC
-- K = Σ( coef_i × Ir_i / Io_i )
```

Si falta un índice INEI, el monomio aporta su coeficiente con ratio neutro `1`.

---

## 4. Índices INEI

Tabla `inei_indices` (`index_code`, `index_name`, `period_year`, `period_month`, `index_value`, UNIQUE por código+período). RLS: lectura para autenticados.

Seed: 20 códigos más usados en construcción peruana (acero, cemento, mano de obra, dólar, agregados, etc.), base 100 en 2025-12 como referencia. **Pendiente:** cargar la serie histórica real de INEI por período.

### Campos de reajuste en valorizaciones

`valorizaciones` + `reajuste_formula_id`, `factor_k` (default 1.0), `monto_reajuste` (default 0).

---

## 5. Unidades CAPECO

Tabla `capeco_units` con 24 unidades estándar (m, m2, m3, kg, glb, hh, hm, bls, etc.) categorizadas. RLS: lectura para autenticados. Sirve como catálogo para los selects de unidad en partidas y APU.

---

## 6. Roles granulares por módulo

Tabla `role_module_permissions`: matriz `(role × module)` con flags `can_view / can_edit / can_approve / can_delete`.

- **Roles:** usa el enum `user_role` existente — `admin`, `project_manager`, `field_engineer`, `purchasing`, `warehouse`, `hr`, `readonly`.
- **Módulos:** `presupuesto`, `apu`, `compras`, `almacen`, `valorizaciones`, `nominas`, `reportes`, `configuracion`.

### Helper para la app

```sql
fn_user_can(p_user_id, p_org_id, p_module, p_action) → BOOLEAN
-- p_action ∈ 'view' | 'edit' | 'approve' | 'delete'
-- admin siempre true; resto resuelve contra la matriz
```

**Pendiente de integración:** conectar `fn_user_can()` al middleware / guards de Next.js para enforcement real. Hoy la matriz existe pero la app aún no la consulta.

---

## 7. Audit Log

Tabla `audit_logs` (`table_name`, `record_id`, `operation`, `changed_by`, `changed_at`, `old_values` JSONB, `new_values` JSONB). RLS: lectura para autenticados.

`fn_audit()` genérico aplicado vía trigger a: `budgets`, `budget_items`, `apu_lines`. Registra INSERT/UPDATE/DELETE con snapshot completo en JSONB y `auth.uid()` del autor.

---

## 8. Realtime

`ALTER PUBLICATION supabase_realtime ADD TABLE budgets, budget_items, budget_chapters, apu_lines` — habilita colaboración simultánea en el editor de presupuesto (Sprint 3 del roadmap).

---

## 9. Hardening (017 + 018)

Los advisories de seguridad de Supabase detectaron problemas introducidos por 016. Corregidos:

| Issue | Nivel | Fix |
|-------|-------|-----|
| `capeco_units` sin RLS | ERROR | `ENABLE RLS` + policy SELECT autenticados |
| `role_module_permissions` sin RLS | ERROR | `ENABLE RLS` + policy SELECT autenticados |
| 9 funciones nuevas con `search_path` mutable | WARN | `ALTER FUNCTION ... SET search_path = public, pg_temp` |
| `fn_audit` ejecutable por anon/authenticated | WARN | `REVOKE ALL FROM anon, authenticated, public` (es función de trigger) |
| `fn_user_can` ejecutable por anon | WARN | `REVOKE EXECUTE FROM PUBLIC` + `GRANT TO authenticated` |
| `fn_calc_factor_k` ejecutable por anon | WARN | `REVOKE FROM anon` + `GRANT TO authenticated` |

### SQL de 017

```sql
ALTER TABLE capeco_units            ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_module_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated can read capeco units"     ON capeco_units            FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated can read role permissions" ON role_module_permissions FOR SELECT USING (auth.uid() IS NOT NULL);

ALTER FUNCTION fn_recalc_item_from_apu(UUID)                          SET search_path = public, pg_temp;
ALTER FUNCTION fn_recalc_chapter_total(UUID)                          SET search_path = public, pg_temp;
ALTER FUNCTION fn_recalc_budget_total(UUID)                           SET search_path = public, pg_temp;
ALTER FUNCTION fn_apu_rollup()                                        SET search_path = public, pg_temp;
ALTER FUNCTION fn_item_rollup()                                       SET search_path = public, pg_temp;
ALTER FUNCTION fn_check_reajuste_coeff()                              SET search_path = public, pg_temp;
ALTER FUNCTION fn_calc_factor_k(UUID,INTEGER,INTEGER,INTEGER,INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION fn_user_can(UUID,UUID,TEXT,TEXT)                       SET search_path = public, pg_temp;
ALTER FUNCTION fn_audit()                                             SET search_path = public, pg_temp;

REVOKE ALL     ON FUNCTION fn_audit()                                            FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION fn_user_can(UUID,UUID,TEXT,TEXT)                       FROM anon;
GRANT  EXECUTE ON FUNCTION fn_user_can(UUID,UUID,TEXT,TEXT)                       TO authenticated;
REVOKE EXECUTE ON FUNCTION fn_calc_factor_k(UUID,INTEGER,INTEGER,INTEGER,INTEGER) FROM anon;
GRANT  EXECUTE ON FUNCTION fn_calc_factor_k(UUID,INTEGER,INTEGER,INTEGER,INTEGER) TO authenticated;
```

### SQL de 018

```sql
REVOKE EXECUTE ON FUNCTION fn_user_can(UUID,UUID,TEXT,TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION fn_user_can(UUID,UUID,TEXT,TEXT) TO authenticated;
```

---

## 10. Permisos project-aware (019)

`fn_user_can` evalúa contra el rol de **organización**. Pero las policies RLS de los módulos por proyecto (valorizaciones, presupuesto…) usan el rol de **proyecto** (`project_members`), que según diseño *tiene precedencia*. Para alinear los guards de UI con la base real de la RLS se añadió:

```sql
fn_user_can_project(p_user_id, p_project_id, p_module, p_action) → BOOLEAN
-- 1) busca rol en project_members (precedencia)
-- 2) fallback: rol en organization_members vía la org del proyecto
-- 3) admin ⇒ true; resto ⇒ matriz role_module_permissions
```

`SECURITY DEFINER`, `search_path = public, pg_temp`, ejecutable solo por `authenticated`. Consumido por `userCanProject` en `lib/permissions.ts`.

---

## Backlog de hardening (advisories PRE-existentes, NO de estas migraciones)

Detectados por el linter pero originados en migraciones 003–009. No se tocaron para no romper funciones en producción; pendientes de un pase dedicado:

- `search_path` mutable en: `recalc_po_total`, `recalc_payroll_period_total`, `recalc_valorizacion_total`, `set_updated_at`, `fn_ppp_unit_cost`, `fn_track_resource_price`, `fn_clone_budget`, `trg_fn_assign_ppp_on_withdrawal`.
- `SECURITY DEFINER` ejecutable por anon/authenticated: `fn_clone_budget`, `get_my_org_role`, `recalc_po_total`, `recalc_payroll_period_total`, `recalc_valorizacion_total`.
- Vistas `SECURITY DEFINER` (ERROR): `stock_levels`, `project_material_cost`, `project_service_cost`, `v_resources_with_latest_price`.
- `app_clients`: RLS habilitado sin policies (INFO).
- Auth: "Leaked Password Protection" deshabilitado — activar en dashboard (HaveIBeenPwned).
