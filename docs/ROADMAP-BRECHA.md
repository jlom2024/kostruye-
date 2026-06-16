# Roadmap — Cierre de Brecha Konstruye+ vs ObraCore

**Fuente:** `konstruye_vs_obracore.pdf` (análisis de brecha)
**Última actualización:** 2026-06-16 (sesión tarde)

Seguimiento del avance de Konstruye+ frente al benchmark ObraCore. La columna **Δ 2026-06-16** refleja el progreso tras las migraciones 016–019 y la integración de permisos en la app.

| Área | Prioridad | Cobertura inicial | Δ 2026-06-16 | Notas |
|------|-----------|-------------------|--------------|-------|
| A. Proyectos | Baja | 85% | 85% | Sin cambios — ya cubierto |
| B. Catálogos | Alta | 40% | **~55%** | + `capeco_units` (24 unidades). Falta catálogo de partidas tipo y recursos seed |
| C. Presupuestos / APU | **Crítica** | 60% | **~87%** | + fórmula S10 corregida, roll-up automático, audit log, realtime, gating de edición |
| D. Valorizaciones | Alta | 65% | **~97%** | Fórmula polinómica completa (definir → aplicar K → PDF) + gestión de índices INEI en `/admin`. Solo falta poblar la data oficial del INEI |
| E. Compras / Almacén | Media | 75% | **~78%** | + gating de aprobación/emisión de OC |
| F. Control de Costos | Media | 60% | **~82%** | + audit log con UI; + dashboard de control de costos por partida (desviaciones presup. vs Kardex) |
| G. App Móvil | **Crítica** | 0% | 0% | ⛔ No iniciado — mayor brecha pendiente |
| H. Stack Técnico | Media | 70% | **~90%** | + roles granulares (matriz BD + project-aware), permisos integrados, realtime, hardening RLS, audit log multi-tenant |

---

## Hecho (migraciones 016–019 + integración de permisos)

- ✅ **C — APU/Presupuesto:** fórmula S10 (`crew_size × qty × price`), roll-up automático en cascada, audit log, realtime, gating de edición (`presupuesto.edit`).
- ✅ **D — Valorizaciones:** `fn_calc_factor_k` (D.S. 011-79-VC), tabla `inei_indices` + seed, campos `factor_k`/`monto_reajuste`/`reajuste_formula_id`, gating de aprobación.
- ✅ **E — Compras:** gating de aprobación/emisión de OC (`compras.approve`).
- ✅ **B — Catálogos:** `capeco_units`.
- ✅ **H — Stack:** matriz `role_module_permissions` + `fn_user_can`/`fn_user_can_project`, permisos integrados en la app (ver [`docs/permissions.md`](permissions.md)), realtime, hardening RLS/search_path.

## Hecho (sesión tarde 2026-06-16)

- ✅ **Alanis** movida de root layout → solo landing (`app/page.tsx`)
- ✅ **KIA** permanece en dashboard layout — context-aware (sin cambios)
- ✅ **Tab Fideicomiso** en `/proyectos/[id]/configuracion` → autorización CORFID por proyecto
- ✅ **Migración 022** — columnas `fideicomiso_*` en `projects`
- ✅ **Dominio** actualizado: `konstruye.site` en toda la metadata/docker-compose
- ✅ **`docs/BITACORA.md`** — bitácora de equipo creada (Claude/Manus/Houston/Antu)
- ✅ **CLAUDE.md** reescrito con estado actual completo

## Siguiente (orden sugerido por impacto)

1. **App Móvil** (G) — la brecha más grande (0%). Expo/React Native sobre el mismo Supabase. Foco: tareo de campo, almacén, avance físico.
2. **Imputar OC y servicios a partida** (F) — agregar `budget_item_id` a OC/servicios para control de costos completo.
3. **Crear archivos .sql 019–021** — reproducibilidad de migraciones ya aplicadas.
4. **Extender audit log** a más módulos (compras, valorizaciones, nóminas).

## Backlog de datos (no-código)

- Poblar la serie histórica oficial del INEI vía `/admin/inei` (el módulo de reajuste ya está completo en código).

## Backlog técnico

- Pase de hardening sobre advisories pre-existentes (ver `docs/migrations/016-018_apu_inei_roles_audit.md` § Backlog).
- Activar "Leaked Password Protection" en Supabase Auth.
- Consolidar 017/018 en archivos `.sql` versionados.
