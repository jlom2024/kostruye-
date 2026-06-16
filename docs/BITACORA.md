# Bitácora del Equipo — Kostruye+

Registro cronológico de cambios realizados por **cualquier agente o miembro del equipo**.

## Equipo de agentes

| Nombre | Motor | Función |
|--------|-------|---------|
| **Antu** | Claude / Anthropic | Desarrollo principal, arquitectura, deploy |
| **Manus** | Manus | Automatización, tareas autónomas |
| **Houston** | Gemini / Google | Análisis, revisión de código |
| **Plexy** | Perplexity | Investigación, búsqueda y documentación |
| **Kia** | OpenAI / GPT | Asistente IA dentro del dashboard de Kostruye+ |

**Comando:** Koko (fundador, KREO IA Studio)
El objetivo es que cualquier agente que tome el proyecto sepa exactamente en qué estado quedó y quién hizo qué.

**Formato de entrada:**
```
## YYYY-MM-DD — [Agente] — Resumen
### Cambios
- lista
### Estado al cerrar
- qué funciona, qué queda pendiente
### ⚠️ Cuidado
- advertencias para el siguiente agente
```

---

## 2026-06-16 (noche) — Antu (Claude Sonnet 4.6) — Import Excel INEI + fix duplicados presupuesto

### Cambios
- **Fix duplicados en presupuesto KREO-VIV-01** — el seed anterior insertó capítulos e ítems en tablas sin unique constraint. Fix manual vía MCP: borrados 3 capítulos vacíos duplicados y 3 ítems duplicados; APU lines migradas a los ítems originales. Resultado: cap 01 = 3 ítems + 13 APU lines, cap 02 = 2 ítems, cap 03 = 0 ítems (limpio)
- **Import Excel en `/admin/inei`** (`app/admin/inei/page.tsx` + `app/api/admin/inei/route.ts`):
  - Botón "↑ Importar Excel" — parsea `.xlsx/.xls/.csv` con SheetJS, acepta variantes de nombres de columna
  - Modal de vista previa con filas válidas ✓ / inválidas ⚠ antes de confirmar
  - Botón "↓ Plantilla" — descarga `.xlsx` de ejemplo con formato correcto
  - API `POST` ahora acepta array (bulk upsert `ON CONFLICT`) además del single insert
- **Commit `bb3d0eb`** — push GitHub ✅ — deploy VPS ✅

### Estado al cerrar
- ✅ Presupuesto SEATEK sin duplicados
- ✅ Admin INEI con importación Excel masiva operativa
- ✅ `konstruye.site` running, master = `bb3d0eb`

### ⚠️ Cuidado para el siguiente agente
- `budget_chapters` NO tiene unique constraint en `(budget_id, code)` — nunca hacer INSERT sin SELECT previo
- `budget_items` tampoco tiene unique en `(budget_id, item_code)` — mismo cuidado
- Los índices INEI en BD son dummy (base 100). Falta poblar serie histórica real del INEI

---

## 2026-06-16 (tarde) — Antu (Claude Sonnet 4.6) — Seed dummy SEATEK + deploy

### Cambios
- **Seed dummy SEATEK ejecutado** vía Supabase MCP (proyecto `wyaugtdgmcesoryhyois`):
  - 32 índices INEI (4 índices × 3 períodos 2024)
  - KREO-VIV-01: 8 partidas presupuesto, 13 líneas APU, 1 fórmula polinómica (5 monomios), 3 valorizaciones (oct/nov/dic 2024)
  - PRJ-RO-01: 2 partidas obras preliminares, 4 stock_withdrawals vinculados a partidas
- **`scripts/seed_seatek_dummy.sql`** corregido contra schemas reales de la BD (columnas verificadas)
- **Commit `5c40d69`** — push a GitHub ✅
- **Deploy VPS** — container `kostruye-plus-app-1` recreado y running ✅

### Estado al cerrar
- ✅ App corriendo en `https://konstruye.site` con seed dummy completo
- ✅ APU, fórmula polinómica, valorizaciones verificados en BD SEATEK
- ✅ GitHub y VPS sincronizados (master = 5c40d69)

### ⚠️ Cuidado para el siguiente agente
- Los schemas reales de la BD difieren del script original — ver comentarios en `scripts/seed_seatek_dummy.sql`
- `reajuste_formulas` no tiene columna `description` → usar `notes`
- `valorizaciones.factor_k` es NOT NULL → usar 1.0 para drafts
- Migraciones 019-021 aplicadas en BD pero aún sin archivos .sql en repo

---

## 2026-06-16 — Claude (Sonnet 4.6) — Sprint APU, Permisos, Auditoría, CORFID, Dominios

### Cambios
**Migraciones aplicadas en Supabase (016–022):**
- 016: APU roll-up en cascada (`apu_lines` → `budget_items` → capítulos → presupuesto), `inei_indices`, `role_module_permissions`, `fn_user_can`, `fn_calc_factor_k` (D.S. 011-79-VC), `fn_audit` multi-tenant
- 017: Hardening — RLS en `capeco_units`/`role_module_permissions`, `search_path` en funciones SECURITY DEFINER
- 018: REVOKE EXECUTE FROM PUBLIC en `fn_user_can`, GRANT TO authenticated
- 019: `fn_user_can_project` — chequeo project-level (vía MCP, sin .sql aún)
- 020: Políticas write en `reajuste_formulas`/`reajuste_monomios` (vía MCP, sin .sql aún)
- 021: `organization_id`/`project_id` en `audit_logs`, `fn_audit` multi-tenant (vía MCP, sin .sql aún)
- 022: Columnas `fideicomiso_*` en tabla `projects` (**pendiente aplicar** — archivo en `supabase/migrations/022_fideicomiso_projects.sql`)

**Código (commit `92e6c1b`):**
- `lib/permissions.ts` — `userCan()` + `userCanProject()` helpers
- Valorizaciones: fórmula polinómica completa + panel `ReajustePanel` + gating aprobación
- Presupuesto: gating de edición (`presupuesto.edit`)
- Compras: gating aprobación/emisión OC (`compras.approve`)
- `app/admin/inei` — CRUD índices INEI protegido por cookie admin
- `app/auditoria` — log agrupado por día con diff before/after
- `app/control-costos` — desviaciones presupuesto vs Kardex por partida
- `config-fideicomiso.tsx` — tab CORFID en `/proyectos/[id]/configuracion`
- `JoshyWidget` (Alanis) movido de root layout → solo `app/page.tsx` (landing)
- Dominio actualizado: `kreo-crm.site` → `konstruye.site` en metadata y docker-compose

**Infraestructura:**
- `konstruye.site` — nuevo dominio principal de Kostruye+ (cert SSL emitido)
- `kreo-crm.site` — liberado para `kreo-epr-landing` (ya tenía ese container)
- Docker-compose limpiado de `kreo-crm.site`

### Estado al cerrar
- ✅ App corriendo en `https://konstruye.site`
- ✅ KIA context-aware por proyecto (dashboard layout — sin cambios, ya funcionaba)
- ✅ Alanis solo en landing
- ✅ Tab Fideicomiso en config de proyecto (UI lista, API lista)
- ⚠️ Migración 022 pendiente de aplicar en Supabase (el tab CORFID fallará con 500 hasta que se aplique)
- ⚠️ Migraciones 019–021 aplicadas en BD pero sin .sql en repo (crear para reproducibilidad)

### ⚠️ Cuidado para el siguiente agente
- **No tocar `kreo-crm.site`** — ese dominio es de `kreo-epr-landing`, no de Kostruye+
- **KIA usa OpenAI (`gpt-4o-mini`)**, no Claude — si quieres migrar a Claude, cambiar en `app/api/ai/chat/route.ts`
- `ignoreBuildErrors: true` en `next.config.ts` — hay errores `never` pre-existentes en tipos, NO son nuevos
- El `ADMIN_TOKEN` en los 3 admin routes (`app/api/admin/clients/*`, `upload-logo`) tiene fallback hardcodeado — pre-existente, no introducido en esta sesión. Pendiente rotar y quitar fallback
- App Móvil (Expo) — **0% de avance**, mayor brecha vs ObraCore. Planificado para tarde del 2026-06-16

---

## 2026-06-14 — Claude (Sonnet) — Agente Alanis + Joshy Widget + Dominio

### Cambios
- Agente de voz Alanis (`agent_07cc9bf1bd0a14f3`) integrado en `components/joshy-widget.tsx`
- Widget en root layout (¡OJO: después fue corregido al landing solamente, ver 2026-06-16!)
- VPS migrado de `187.77.54.30` → `2.24.72.21`

### ⚠️ Cuidado
- El widget quedó en root layout — si otro agente ve que Alanis aparece en el dashboard, **ya fue corregido en 2026-06-16**, no volver a poner en root layout

---

## 2026-06-05/06 — Claude (Sonnet) — CORFID Fix + SUNAT + Facturación

### Cambios
- Fix `DATABASE_URL` + DNS aliases + traefik-public en CORFID backend
- `app/api/invoices/` — facturación electrónica SUNAT
- `app/api/org/sunat/` — configuración credenciales SOL por organización
- Tab SUNAT en `/configuracion`
- Migraciones 014–015 (sunat_*, electronic_invoices)

### Estado
- ✅ KREO-SUNAT corriendo en `2.24.72.21:3020`
- ✅ Cada org guarda sus credenciales SOL en Supabase (no en .env)

---

## 2026-05-29 — Claude (Sonnet) — Facturación Electrónica + Presupuesto S10

### Cambios
- Importador Excel S10 (SheetJS)
- Facturación electrónica SUNAT integrada en tab Contabilidad
- Migración 009: Kardex PPP, `service_order_advances`
- Dashboard Resultado Operativo real (Curva S 3 líneas)

---

## Convención para futuros agentes

Cuando termines una sesión de trabajo en este proyecto, **agrega una entrada aquí** con:
1. Fecha + tu nombre (Claude / Manus / Houston / Antu)
2. Lista de cambios (archivos, migraciones, infra)
3. Estado al cerrar (qué funciona, qué queda pendiente)
4. ⚠️ Advertencias para quien siga

Esto evita que un agente deshaga el trabajo de otro o pierda contexto.
