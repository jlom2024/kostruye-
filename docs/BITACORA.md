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

## 2026-06-17 (noche) — Antu (Claude Sonnet 4.6) — KIA: INEI + fórmula polinómica

### Cambios

**`app/api/ai/chat/route.ts`**
- System prompt ampliado: KIA ahora conoce todos los módulos, los IUPCs (R.J. 016-2026-INEI, base Dic 2025=100), los códigos de índice más usados (02, 03, 17, 21, 39, 43, 44, 47, 47-1, 48, 49, 54, 65, 66) y la fórmula del Factor K (D.S. 011-79-VC)
- Nueva herramienta `get_inei_indices`: consulta `inei_indices` para el período más reciente; acepta `index_code` opcional para filtrar por código específico
- Nueva herramienta `get_reajuste_formulas`: devuelve las fórmulas polinómicas de un proyecto con sus monomios (símbolo, coeficiente, índice asignado)
- Commit `f15ac9e` — GitHub ✅ — VPS ✅

### Estado al cerrar
- ✅ KIA responde preguntas de índices INEI con valores reales desde BD
- ✅ KIA explica el Factor K y puede mostrar la fórmula del proyecto activo
- ✅ Todas las herramientas funcionan en contexto del proyecto que el usuario está viendo

### ⚠️ Cuidado para el siguiente agente
- KIA usa `gpt-4o-mini` — no cambiar modelo sin evaluar costo/calidad
- El agentic loop tiene máximo 5 rondas de tool calls — suficiente para combinaciones de 2-3 herramientas
- `get_inei_indices` siempre retorna el período más reciente en BD (actualmente Abr 2026)

---

## 2026-06-17 (tarde) — Antu (Claude Sonnet 4.6) — INEI sync endpoint + Manual v1.1

### Cambios

**Índices INEI — R.J. 016-2026-INEI (Base Dic 2025 = 100)**
- Descargado Excel oficial INEI (Abr 2026, 4 meses de datos, 308 registros) y parseado con SheetJS en Node.js
- Generado `inei_upsert.sql` + upsert en tabla `inei_indices` via Supabase MCP
- `app/admin/inei/page.tsx` — KNOWN_CODES completamente reemplazados (20 códigos viejos → 95 nuevos) con nombres correctos per R.J. 016-2026-INEI; código default cambiado de "21" → "47" (MO)
- Subtítulo actualizado: "R.J. 016-2026-INEI · Base Diciembre 2025 = 100 · Área 1 Lima Metropolitana · 95 índices"
- Botón "↻ Sync INEI" (verde) en header del admin panel
- `app/api/admin/inei/sync/route.ts` (nuevo): endpoint POST que descarga el Excel más reciente del INEI y hace upsert en `inei_indices`
  - Auth: cookie `kostruye_admin` O header `x-admin-token` (para uso cron)
  - URL pattern: `n07_indices_unificados_de_precios_de_la_construccion_{mon}{yy}.xlsx`
  - Retrocede hasta 3 meses si el archivo del mes actual no está disponible
  - GET endpoint devuelve info descriptiva

**Manual PDF v1.1**
- `generar_manual.py` (nuevo en raíz del repo): script Python/reportlab que regenera el manual completo
- `Manual-Kostruye-Plus.pdf` + `kostruye-plus/public/Manual-Kostruye-Plus.pdf` — versión 1.1 generada (~506 KB)
  - URL corregida en todo el documento: `konstruye.site` (era `kreo-crm.site` en 3 páginas)
  - Versión 1.1 (era 1.0)
  - 17 capítulos (era 14) — añadidos: Cap 7 Servicios, Cap 12 Control de Costos, Cap 14 Auditoría
  - "11 módulos integrados" (era "8 módulos")
  - Cap 16 Configuración ampliado: sección SUNAT + sección Fideicomiso/CORFID
  - Glosario actualizado: Factor K, CORFID, Curva S, Fideicomiso, SOL, SUNAT, Kardex, OS, PPP, Variación, Índice INEI

**Valor INEI en fórmula polinómica (usuario)**
- `components/reajuste/reajuste-panel.tsx`: debajo del `<select>` de índice en cada monomio se muestra el valor actual ("Valor actual: 245.31 · Abr 2026") tomado de `inei_indices`
- `app/(dashboard)/proyectos/[id]/valorizaciones/page.tsx`: query extendida para traer `index_value, period_year, period_month`; dedup por código tomando el período más reciente

### Estado al cerrar
- ✅ 308 registros INEI (Ene–Abr 2026) en `inei_indices` de Supabase
- ✅ Admin INEI con 95 códigos correctos + botón sync
- ✅ Endpoint POST /api/admin/inei/sync operativo
- ✅ Manual PDF v1.1 en `public/Manual-Kostruye-Plus.pdf`
- ✅ Fórmula polinómica muestra valor INEI actual al seleccionar índice
- ✅ Commit `5a5406f` — GitHub ✅ — VPS ✅

### ⚠️ Cuidado para el siguiente agente
- El script `generar_manual.py` (raíz del repo local, no commiteado) usa reportlab — depende de `public/logo-brand.png`
- El endpoint de sync requiere el Excel mensual del INEI en URL exacta `n07_indices_unificados...` — si INEI cambia la URL, actualizar `ineiUrl()` en la route
- Los índices INEI ahora son Base Dic 2025 = 100 (antes Base Jul 1992 = 100) — no mezclar bases

---

## 2026-06-17 — Antu (Claude Sonnet 4.6) — Logo crane-K + favicon + hero background

### Cambios

**Identidad visual — Logo crane-K (SVG)**
- Diseñado SVG propio del logo crane-K (torre de construcción estilo K) a partir de `logo.png` original:
  - Mástil vertical ámbar (`#F59E0B`) con bandas horizontales y retícula X oscura
  - Cabecera marrón (`#B45309`) en la cima del mástil
  - Jib (pluma horizontal) como brazo superior de la K → `polygon points="11,13 11,17 29,5 29,3"`
  - Cabo metálico diagonal: `line x1="7.5" y1="2" x2="29" y2="4"` en marrón
  - Cable + gancho (`CBD5E1` / `#9CA3AF`) colgando de la pluma
  - Brazo inferior de la K → `polygon points="11,17 11,21 26,30 26,28"`
  - Base inferior marrón
- `public/favicon.svg` (nuevo): versión 32×32 viewBox del crane-K para browser tab
- `public/logo-color.svg` y `public/logo.svg` (actualizados): versión 200×200 detallada con mismo diseño
- `public/logo-brand.png` (nuevo): copia de `logo.png` original (crane-K con texto "ONSTRUYE+") para nav/footer

**Favicon**
- `app/layout.tsx`: icons → `/favicon.svg` (icon, shortcut, apple)

**Landing page (`app/page.tsx`)**
- **Nav**: reemplazado SVG inline + div "KOSTRUYE+" por `<img src="/logo-brand.png" height=38 />`
- **Footer**: ídem, `height=28`
- **Hero background**: añadida foto de obra de construcción aérea al atardecer generada con Higgsfield (modelo `nano_banana_2`) → `public/hero-construction.png` (1376×768, tonos ámbar/navy)
  - CSS: `.hero-photo` (z=0, opacity:0.28, saturate:0.7) + `.hero-photo-overlay` (z=1, gradiente oscuro)
  - JSX: `<div className="hero-photo" />` + `<div className="hero-photo-overlay" />` antes de los orbs
- **Hero mockup eliminado**: quitados todos los KPI cards, gráficas y tabla dummy del hero (clases `.hero-db`, `.db-*`, `.hero-db-row*` y el bloque JSX ~150 líneas). Solo quedan orbs, grid y foto.
- **Parallax eliminado**: script que referenciaba `hero-bg-mockup` removido

**Sidebar (`components/layout/sidebar.tsx`)**
- Reemplazado SVG anterior (K+plus blanco/azul) por nuevo crane-K SVG ámbar/oscuro cuando no hay org logo

**Admin dashboard (`app/admin/page.tsx`)**
- Reemplazado `<span>🏗️</span>` por crane-K SVG 32×32 en el header del panel

**Admin login (`app/admin/login/page.tsx`)**
- Reemplazado `<div style={{ fontSize: 36 }}>🏗️</div>` por crane-K SVG (52×52 render, 32×32 viewBox)

**Deploy**
- Commit `0e5cd51` — push GitHub ✅ — deploy VPS ✅ — container `kostruye-plus-app-1` corriendo

### Estado al cerrar
- ✅ Favicon crane-K visible en browser tab
- ✅ Logo brand PNG en nav y footer de la landing
- ✅ Crane-K SVG en sidebar, admin dashboard y admin login
- ✅ Hero con foto de obra al atardecer (Higgsfield) + orbs, sin mockup analytics
- ✅ GitHub master = `0e5cd51` — VPS sincronizado

### ⚠️ Cuidado para el siguiente agente
- `public/logo-brand.png` es el PNG con texto "ONSTRUYE+" — solo usarlo en nav/footer donde cabe el logo completo
- `public/favicon.svg` y el SVG inline en sidebar/admin son el crane-K sin texto — mantener consistencia
- La foto hero (`/hero-construction.png`) está en `public/` — si se regenera con Higgsfield, reemplazar el archivo y redesplegar
- El hero usa z-index: foto(0) → overlay(1) → grid(1) → hero-overlay(2) → orbs+content(3) → sweep(4) — respetar capas al agregar elementos

---

## 2026-06-16 (noche 2) — Antu (Claude Sonnet 4.6) — CORFID/CRM credentials + RLS + SUNAT fix

### Cambios

**CORFID (`corfid.dhconsultores.site`)**
- Reset contraseñas de los 3 usuarios a `Antu2026*` via SQL file (problema de quoting camelCase `"passwordHash"` en psql):
  - `admin@hd-consultores.com` ✅ (estaba inactivo — activado también)
  - `jlom2002@gmail.com` ✅
  - `nino@dhconsultores.com` ✅ (era el que fallaba — hash corrupto anterior)
- **Toggle mostrar/ocultar contraseña** en login page (`/opt/kreo-corfid/frontend/app/(auth)/login/page.tsx`):
  - Estado `showPassword`, botón SVG ojo/ojo-tachado dentro del input con `type` dinámico
  - Rebuilt `corfid-frontend` container: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build frontend` desde `/opt/kreo-corfid/infra/`
  - Container recreado correctamente — verificado `Up` en producción

**CRM DH (`crm.dhconsultores.site` → container `dh-dashboard`)**
- Identificado: usa Supabase project `wwsjmscwqqxjgimebznz` para auth (no postgres local)
- Reset contraseñas vía MCP `execute_sql` en `auth.users` con `crypt('Antu2026*', gen_salt('bf'))`:
  - `jlom2002@gmail.com` ✅
  - `nino@dhconsultores.com` ✅
- **Fix alerta crítica de seguridad Supabase** (email recibido 2026-06-12): tablas sin RLS en schema public:
  - `ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY`
  - `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY`
  - `ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY`
  - Política `authenticated_full_access` en las 3 tablas — solo usuarios autenticados (CRM interno)
  - Migración aplicada vía MCP `apply_migration` en proyecto `wwsjmscwqqxjgimebznz`

**SUNAT — Integración correcta (Kostruye+)**
- **Problema detectado:** UI de `/configuracion` tab SUNAT llamaba a `/api/org/sunat` (PATCH) que guardaba `sol_usuario` y `sol_clave` en **texto plano** en Supabase
- **Fix en `app/(dashboard)/configuracion/page.tsx`** (commit `a19e4cc`):
  - GET carga `sunat_configurado` desde `/api/org/sunat-sol` (no expone credenciales)
  - Al guardar: primero actualiza `organizations.ruc`, luego POST a `/api/org/sunat-sol` con `{ sol_usuario, sol_clave }`
  - kreo-sunat cifra AES-256 y guarda en su propia BD — Supabase nunca ve las credenciales SOL
  - Kostruye+ solo almacena `sunat_configurado = true` y `sunat_empresa_id`
  - Estado variables renombrados: `sunatApiKey` → `solUsuario`, `sunatApiSecret` → `solClave`
- Deploy VPS ✅ — container `kostruye-plus-app-1` recreado

### Circuito completo integrado (estado 2026-06-16)

```
KREO IA Studio (Koko)
  → Kostruye+ ERP: konstruye.site (Next.js 16 + Supabase wyaugtdgmcesoryhyois)

DH Consultores (partner/reseller)
  → CRM: crm.dhconsultores.site (Next.js, Supabase wwsjmscwqqxjgimebznz)
  → CORFID: corfid.dhconsultores.site (NestJS backend + Next.js frontend + Postgres)

Flujo Fideicomiso:
  Constructora en Kostruye+ → tab Fideicomiso → POST /api/fideicomiso/project/[id]
  → webhook a CORFID (corfid.dhconsultores.site/api)
  → DH activa trust → callback /api/fideicomiso/project/[id]/confirm
  → constructora ve fideicomiso activo

Flujo SUNAT (ahora correcto):
  Admin en /configuracion tab SUNAT → ingresa RUC + Usuario SOL + Clave SOL
  → POST /api/org/sunat-sol → kreo-sunat (2.24.72.21:3020)
  → kreo-sunat registra empresa + cifra credenciales AES-256
  → Kostruye+ guarda solo sunat_empresa_id + sunat_configurado=true
  → Emisión facturas: /api/invoices → kreo-sunat → SUNAT OSE
```

### Estado al cerrar
- ✅ CORFID login funciona para los 3 usuarios con `Antu2026*` + toggle ojo
- ✅ CRM login funciona para los 2 usuarios con `Antu2026*`
- ✅ CRM Supabase sin tablas expuestas (RLS en `eventos`, `profiles`, `tareas`)
- ✅ SUNAT: credenciales SOL van cifradas a kreo-sunat, no texto plano en Supabase
- ✅ GitHub master = `a19e4cc` — VPS sincronizado

### ⚠️ Cuidado para el siguiente agente
- **CORFID `"passwordHash"`** es camelCase — en psql siempre necesita doble comilla. Usar archivo SQL (`cat > /tmp/x.sql && docker exec -i corfid-postgres psql ... < /tmp/x.sql`), nunca pasar el SQL como argumento de shell
- **CRM usa Supabase** `wwsjmscwqqxjgimebznz` — no tiene postgres propio. Credenciales via MCP o Supabase Admin API
- **SUNAT credenciales** NUNCA se leen de vuelta al UI (diseño correcto). Si el usuario quiere "ver" sus credenciales → no se puede, es por seguridad
- **`sunat_api_key` y `sunat_api_secret`** en `organizations` son las credenciales de Kostruye+ con kreo-sunat (no del usuario), no confundir con `sol_usuario`/`sol_clave`
- Webhook CORFID → Kostruye+ pendiente verificación end-to-end
- Flujo emisión facturas Contabilidad → pendiente verificación completa

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
