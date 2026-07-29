# Kostruye+ — Contexto del Proyecto

> **Para cualquier agente que tome este proyecto:** Lee primero `docs/BITACORA.md` — ahí está el historial de quién hizo qué y en qué estado quedó cada sesión.

## ¿Qué es Kostruye+?

ERP de gestión integral para empresas constructoras peruanas. SaaS multi-tenant donde cada constructora es una **organización** con sus propios proyectos, usuarios y datos aislados por RLS en Supabase.

Desarrollado por **KREO IA Studio** (Antu, fundador). Stack: Next.js 16 App Router + React 19 + Supabase + Tailwind v4.

**Equipo de agentes:** Claude (Anthropic), Manus, Houston (Gemini). Cada uno deja entrada en `docs/BITACORA.md` al terminar.

---

## Dominio y Deploy

| Campo | Valor |
|-------|-------|
| **URL producción** | `https://konstruye.site` |
| VPS | `2.24.72.21` — `/opt/kostruye-plus/` (Acceso vía llave `C:\Users\jlom2\.ssh\antu_kostruye` local) |
| GitHub | `https://github.com/jlom2024/kostruye-` rama `master` |
| Deploy | `ssh -n -i C:\Users\jlom2\.ssh\antu_kostruye -o StrictHostKeyChecking=no root@2.24.72.21 "git -C /opt/kostruye-plus fetch --prune origin && git -C /opt/kostruye-plus reset --hard origin/master && cd /opt/kostruye-plus && docker compose up -d --build"` |

> ⚠️ `kreo-crm.site` es el dominio de `kreo-epr-landing` — NO es Kostruye+.

---

## Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4, Lucide icons |
| Data fetching | TanStack React Query v5, Supabase JS v2 |
| Backend/DB | Supabase (PostgreSQL + Auth + RLS) |
| Forms | react-hook-form + Zod |
| Tablas | TanStack React Table v8 |
| Charts | Recharts |
| Toasts | Sonner |
| IA (KIA) | OpenAI `gpt-4o-mini` (migrado desde Anthropic 2026-07-14) — `app/api/ai/chat/route.ts` |
| Widget ventas | Lemon Slice (Alanis) — `agent_07cc9bf1bd0a14f3` — **solo en landing** |
| Deploy | Docker + nginx-proxy + acme-companion (SSL auto) |

---

## Módulos activos (v2.5 - Julio 2026)

| Módulo | Ruta | Roles | Estado |
|--------|------|-------|--------|
| Dashboard | `/proyectos/[id]/dashboard` | admin/contador/user/cliente | ✅ Incorporados KPIs de Fideicomiso, HSE y Calidad |
| Presupuesto / APU | `/proyectos/[id]/presupuesto` | admin/contador | ✅ Roll-up automático, importación S10 exacta al céntimo (Excel/PDF) |
| Compras | `/proyectos/[id]/compras` | admin/contador | ✅ Gating aprobación/emisión |
| Servicios | `/proyectos/[id]/servicios` | admin/contador | ✅ |
| Almacén | `/proyectos/[id]/almacen` | admin/user | ✅ Kardex PPP |
| Tareo Diario | `/proyectos/[id]/campo/tareo` | admin/user/cliente | ✅ Corregido conflicto de presupuesto dinámico con `.eq("budget_type", "venta")` |
| Parte Equipos | `/proyectos/[id]/campo/parte-equipos` | admin/user/cliente | ✅ |
| Avance Diario | `/proyectos/[id]/campo/avance` | admin/user/cliente | ✅ Sincronizado con presupuesto de venta |
| Calidad y HSE | `/proyectos/[id]/campo/hse` | admin/user/cliente | ✅ Checklists de seguridad + incidentes con foto, auditoría y edición/eliminación |
| Productividad | `/proyectos/[id]/campo/productividad` | admin/contador/user/cliente | ✅ |
| Nóminas | `/proyectos/[id]/nominas` | admin/contador | ✅ |
| Valorizaciones | `/proyectos/[id]/valorizaciones` | admin/contador | ✅ Fórmula polinómica + K + PDF |
| Control de Costos | `/proyectos/[id]/control-costos` | admin/contador | ✅ Desviaciones vs Kardex |
| Lean / LPS | `/proyectos/[id]/lean` | admin/user | ✅ Lookahead, restricciones y PPC semanal |
| Contabilidad + SUNAT | `/proyectos/[id]/contabilidad` | admin/contador | ✅ Facturación electrónica |
| Caja Chica | `/proyectos/[id]/caja-chica` | admin/contador/user | ✅ Rendiciones móviles vinculadas a APU |
| Fideicomiso | `/proyectos/[id]/fideicomiso` | admin/contador/cliente | ✅ Integración con CORFID / DH Consultores |
| Auditoría | `/proyectos/[id]/auditoria` | admin/contador | ✅ Log multi-tenant + diff |
| Config. proyecto | `/proyectos/[id]/configuracion` | admin | ✅ General, Equipo, Parámetros, Fideicomiso |
| Admin INEI | `/admin/inei` | admin app | ✅ CRUD índices |
| Configuración SUNAT | `/configuracion` | admin | ✅ Credenciales SOL por org |
| **App Móvil** | `kostruye-movil/` (repo separado) | todos | ✅ Expo/RN (Offline-First, GPS, Fotos, HSE checklists/incidentes, Caja Chica, Avance) |

---

## Sistema de Permisos (migración 016–019)

- **Org-level:** `fn_user_can(org_id, user_id, module, action)` → `lib/permissions.ts:userCan()`
- **Project-level:** `fn_user_can_project(project_id, user_id, module, action)` → `lib/permissions.ts:userCanProject()`
- **Módulos gateados:** `presupuesto.edit`, `compras.approve`, `valorizaciones` (aprobar + reajuste)
- **Matriz:** tabla `role_module_permissions` en BD

---

## KIA — Asistente IA

- **Ubicación:** `app/(dashboard)/layout.tsx` → `<AiChat />` (aparece en todo el dashboard)
- **API:** `app/api/ai/chat/route.ts` — OpenAI `gpt-4o-mini` (loop agéntico, máx 5 rondas).
- **Context-aware:** auto-detecta `projectId` del URL, lo inyecta en system prompt
- **Novedades v2.5:** Conoce sobre Caja Chica móvil, Fideicomisos CORFID, checklists e incidentes HSE.
- **Herramientas (14):** `get_projects`, `get_project_budget`, `get_purchase_orders`, `get_payroll`, `get_valuations`, `get_warehouse`, `get_service_orders`, `get_workers`, `get_clients`, `get_inei_indices`, `get_reajuste_formulas`, `analyze_k_factor_risk`, `detect_cost_overrun`, `generate_committee_minutes`
- ⚠️ **NO está en la landing** — solo en el dashboard de la app

## Manual de Usuario

- **PDF público:** `public/Manual-Kostruye-Plus.pdf` → descargable desde la landing y el sidebar del dashboard
- **Fuente versionada:** `docs/manual/Manual-Kostruye-Plus.html` — editar aquí para actualizarlo
- **Regenerar PDF:** `pwsh docs/manual/build.ps1` (requiere Chrome o Edge instalado)
- **Versión actual:** v1.3 (2026-06-19) — 27 págs: importación S10, app móvil, KIA con 11 herramientas
- **Sidebar link:** `components/layout/sidebar.tsx` — botón "Manual de usuario" (BookOpen) visible para todos los roles

## Alanis (Lemon Slice widget ventas)

- **Ubicación:** `app/page.tsx` (landing) — **SOLO AHÍ**
- **Componente:** `components/joshy-widget.tsx`
- **Agent ID:** `agent_07cc9bf1bd0a14f3`
- ⚠️ **NO debe estar en root layout** (`app/layout.tsx`) ni en el dashboard

---

## Integración CORFID / Fideicomiso (DH Consultores)

### Flujo completo
1. Admin Kostruye+ activa `fideicomiso_enabled = true` en el cliente desde `/admin`
2. La constructora ve el tab **"Fideicomiso"** en `/proyectos/[id]/configuracion`
3. Llena RUC + acepta declaración → POST `/api/fideicomiso/project/[id]`
4. Se envía webhook a CORFID → DH Consultores recibe notificación
5. DH Consultores activa el trust → callback a `/api/fideicomiso/project/[id]/confirm`

### Archivos clave
| Archivo | Función |
|---------|---------|
| `app/api/fideicomiso/project/[id]/route.ts` | GET estado + POST autorizar por proyecto |
| `app/api/fideicomiso/project/[id]/confirm/route.ts` | Callback de activación desde DH |
| `app/api/fideicomiso/autorizar/route.ts` | Autorización a nivel empresa (legacy) |
| `components/fideicomiso/fideicomiso-widget.tsx` | Widget flotante (legacy — era global) |
| `app/(dashboard)/proyectos/[id]/configuracion/config-fideicomiso.tsx` | Tab CORFID en config |

### Variables de entorno CORFID
```
CORFID_API_URL=https://corfid.dhconsultores.site
CORFID_TENANT_SLUG=hd-consultores
CORFID_WEBHOOK_SECRET=<secret>
```

---

## Migraciones Supabase

| # | Archivo | Estado |
|---|---------|--------|
| 001–013 | Schema base, presupuesto, compras, nóminas, valorizaciones, SUNAT, fideicomiso org | ✅ Aplicadas |
| 014–015 | SUNAT credenciales + facturas electrónicas | ✅ Aplicadas |
| 016 | APU roll-up, inei_indices, role_module_permissions, fn_user_can, fn_calc_factor_k, fn_audit | ✅ Aplicada |
| 017 | Hardening RLS + search_path + REVOKE anon | ✅ Aplicada |
| 018 | REVOKE EXECUTE FROM PUBLIC en fn_user_can | ✅ Aplicada |
| 019 | fn_user_can_project (project-aware) | ✅ Aplicada (sin .sql en repo) |
| 020 | Write policies reajuste_formulas/monomios | ✅ Aplicada (sin .sql en repo) |
| 021 | org_id/project_id en audit_logs, fn_audit multi-tenant | ✅ Aplicada (sin .sql en repo) |
| 022 | fideicomiso_* en projects | ✅ Aplicada |
| budget_total_exact_parcial | `total` deja de ser GENERATED; rollups suman parcial impreso | ✅ Aplicada (2026-06-19) |
| import_budget_chunked | RPCs `import_budget_chunk` + `import_budget_finalize` (SECURITY DEFINER, 300s timeout) | ✅ Aplicada (2026-06-19) |
| 046 | `photo_url` en `daily_progress_entries` | ✅ Aplicada |
| 047 | Trigger auditoría en `hse_incidents` | ✅ Aplicada |
| 048 | `fn_audit()` resuelve `project_id`/`organization_id` genéricamente + backfill HSE | ✅ Aplicada |
| 049 | Agregar `inspeccion_herramientas` a `hse_checklists.checklist_type` | ✅ Aplicada |
| 050 | Hardening: RPCs con auth.uid(), RLS dividido, storage privado, views security_invoker | ✅ Aplicada |
| 051 | Revertir photos bucket a público-lectura (autenticado upload) | ✅ Aplicada |

> **Pendiente:** Crear archivos .sql para migraciones 019, 020, 021 (reproducibilidad).

---

## Multi-tenancy y Roles

### Jerarquía
```
Organization (constructora)
  └── Projects (obras)
        └── Modules (presupuesto, compras, almacen, ...)
```

### Roles (`user_role` enum)
| Rol | Acceso |
|-----|--------|
| `admin` | Todo — gestión org + todos los proyectos |
| `contador` | Módulos financieros, nóminas, contabilidad, Caja Chica y Fideicomiso |
| `user` | Dashboard, almacén, lean, tareo, equipos, avance, HSE y Caja Chica |
| `cliente` | Dashboard (con KPIs de Fideicomiso/HSE), tareo, parte-equipos, avance, HSE, productividad y Fideicomiso |

Los roles existen en 2 niveles: **organization_members** (global) y **project_members** (por proyecto). El rol de proyecto tiene precedencia vía `fn_user_can_project`.

---

## Variables de Entorno

```bash
# .env.local (NUNCA commitear)
NEXT_PUBLIC_SUPABASE_URL=https://wyaugtdgmcesoryhyois.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # solo server-side
NEXT_PUBLIC_APP_URL=https://konstruye.site
KREO_SUNAT_URL=http://2.24.72.21:3020
CORFID_API_URL=https://corfid.dhconsultores.site
CORFID_TENANT_SLUG=hd-consultores
CORFID_WEBHOOK_SECRET=<secret>
ADMIN_TOKEN=<token>                # admin panel /admin
ANTHROPIC_API_KEY=<key>            # KIA chat (claude-haiku-4-5)
```

> ⚠️ `ADMIN_TOKEN` tiene fallback hardcodeado en 3 routes (`app/api/admin/clients/*`, `upload-logo`). Es pre-existente — pendiente rotar y quitar fallback.

---

## Convenciones de Código

- **Server vs Client:** páginas = Server Components → pasan props a `*-client.tsx`
- **Auth:** Supabase SSR con cookies — `lib/supabase/client.ts` (browser) / `lib/supabase/server.ts` (server)
- **Tipos:** importar de `types/database.ts`, nunca redefinir inline
- **Moneda:** `formatCurrency(amount, currency)` de `lib/utils.ts`
- **Toasts:** `sonner`
- **Estilos:** Tailwind v4, `cn()` de `lib/utils.ts`
- `ignoreBuildErrors: true` en `next.config.ts` — errores `never` pre-existentes en tipos, no son nuevos
- `turbopack.root` condicional en `next.config.ts` — solo inyectado en Windows (`win32`) para no romper el build Docker en Linux.

---

## Comandos de Desarrollo

```bash
npm run dev    # → http://localhost:3000
npm run build
npm run lint
```

## Deploy VPS

```bash
# En VPS (2.24.72.21):
git -C /opt/kostruye-plus fetch --prune origin
git -C /opt/kostruye-plus reset --hard origin/master
cd /opt/kostruye-plus && docker compose up -d --build
```

---

## Supabase

- **Project ref:** `wyaugtdgmcesoryhyois`
- **Dashboard:** https://supabase.com/dashboard/project/wyaugtdgmcesoryhyois
- **SQL Editor:** para migraciones manuales
