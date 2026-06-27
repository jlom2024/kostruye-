# BITÁCORA — KREO-PubliCool

> Registro de sesiones de trabajo. Cada agente debe dejar una entrada al terminar.

---

## Sesión 004 — 2026-06-27 — Antu (Anthropic)

**Agente:** Antu (Claude)
**Tarea:** Datos reales en dashboard + deploy productivo en VPS + fixes de routing/RLS + seed demo

### Qué se hizo
- **Dashboard / campañas con datos reales** — `lib/supabase/queries.ts` (`getCurrentOrg`, `getOrgStats`, `getOrgCampaigns`, `getOrgSocialAccounts`); dashboard y `/campaigns` ahora Server Components con KPIs y listas reales
- **Wizard de campañas → BD** — `POST /api/campaigns` (Zod + insert), redirige a `/campaigns/{id}/content`
- **OAuth redes sociales** — rutas `auth/[network]`, `callback/[network]`, `disconnect/[network]`; Instagram vía Graph API; Settings lee `social_accounts`
- **Docker + deploy en VPS** — `Dockerfile` multistage (standalone) + `docker-compose.yml` (puerto **3005**); desplegado en `/opt/kreo-publicool` vía SSH + `docker compose up -d --build`
- **Org auto-creada en el dashboard** — `getCurrentOrg` crea org+membership on-the-fly si falta (no solo en el callback de email); evita bucle al login
- **Landing — navegación** — tarjetas de servicios del bento ahora clickeables (→ `/register`); ancla rota `#demo` → `#como-funciona`; `id="features"` duplicado eliminado; `scroll-mt-20`
- **FIX choque de rutas** — landing (`app/page.tsx`) y home del dashboard (`(dashboard)/page.tsx`) resolvían ambos a `/`. El home del dashboard se movió a **`/dashboard`**; la landing redirige a `/dashboard` si hay sesión; login/callback → `/dashboard`
- **FIX RLS (migración 002)** — `001` activó RLS sin política SELECT en `organization_members` (y otras) → el cliente no leía su membresía → rebote al login. `002_rls_read_policies.sql` agrega SELECT a `organization_members`, `social_accounts`, `content_variants`, `post_metrics`, `campaign_metrics`, `lead_forms`, `competitors`
- **Seed demo** — `supabase/seed_demo.sql`: usuario confirmado + org + 1 marca + 2 cuentas + 4 campañas + posts/métricas + 24 leads + 2 competidores (re-ejecutable)

### Estado al terminar — ✅ EN PRODUCCIÓN
- **URL:** `http://2.24.72.21:3005` — app corriendo en Docker en el VPS
- **Login demo:** `demo@publicool.app` / `DemoPubliCool2026`
- Dashboard carga con datos reales del seed (2 activas / 4 totales / 1 marca / 24 leads)
- Migraciones aplicadas en Supabase: `001` + `002` + `seed_demo`

### Notas operativas
- **Redeploy:** `cd /opt/kreo-publicool && git fetch origin <branch> && git reset --hard origin/<branch> && cd kreo-publicool && docker compose up -d --build`
- El sandbox del agente **no tiene salida de red** al VPS ni a la Supabase de PubliCool (cuenta `kreoiastudioperu`) — el deploy y los SQL los ejecuta Comando; el agente prepara scripts/commits
- Warning inofensivo `attribute 'version' is obsolete` en `docker-compose.yml` (Docker lo ignora)

### Pendiente
- [ ] Dominio + SSL (nginx-proxy) para no exponer IP:puerto
- [ ] OAuth real Meta/Instagram (crear app + credenciales en `.env`)
- [ ] Páginas de sub-secciones de campaña (`calendar`, `analytics`, `leads` están vacías)
- [ ] Content page (`campaigns/[id]/content`) usa mock — conectar a la campaña real
- [ ] Quitar warning `version` del docker-compose
- [ ] Crear `.sql` reproducible para el `UPDATE` de nombre del demo (ya aplicado a mano)

---

## Sesión 003 — 2026-06-27 — Claude (Anthropic)

**Agente:** Claude Sonnet
**Tarea:** Auth Supabase real + backup en repo standalone + generador IA operativo

### Qué se hizo
- **Auth funcional** — Login y Register conectados a Supabase real (`signInWithPassword` / `signUp`)
- **`/auth/callback/route.ts`** — intercambia code → session, crea org automáticamente si el usuario no tiene una (`organization_members` insert con rol `admin`)
- **`createServiceClient()`** — función separada en `lib/supabase/server.ts` para operaciones server-side con service role key
- **Middleware** — lista pública actualizada para incluir `/auth/callback`
- **Supabase** — proyecto `hfiwflvxogktwsqkitpl` en cuenta `kreoiastudioperu@gmail.com`; migración `001_initial_schema.sql` aplicada exitosamente (13 tablas, enums, RLS, funciones auxiliares)
- **`.env.local`** — configurado con URL + anon key + service role key + `ANTHROPIC_API_KEY`
- **Repo standalone** — código backup en `jlom2024/kostruye-` branch `claude/kreo-publicool-local-setup-80h91y`, subcarpeta `kreo-publicool/` (acceso a `jlom2024/kreo-publicool` bloqueado por scope de sesión)
- **Local Windows** — instrucciones PowerShell para extraer a `D:\Empresas\KREO Studio\KREO-PUBLICOOL` y push a `jlom2024/kreo-publicool`

### Estado al terminar
- Auth 100% funcional (login / register / callback / org auto-creada)
- Migración aplicada en Supabase — 13 tablas listas
- Content Generator operativo con `ANTHROPIC_API_KEY` configurado
- Dashboard UI completa, datos mockeados (pendiente conectar a Supabase)
- Código en máquina local de Antu: `D:\Empresas\KREO Studio\KREO-PUBLICOOL`

### Pendiente
- [ ] Conectar wizard de campañas a Supabase (actualmente simula con setTimeout)
- [ ] Dashboard principal con datos reales (organizations + campaigns de Supabase)
- [ ] Configurar OAuth apps (Meta/Instagram, TikTok, LinkedIn)
- [ ] Implementar publicación automática (queue)
- [ ] Analytics con datos reales (post_metrics / campaign_metrics)
- [ ] Deploy en VPS (Docker)

---

## Sesión 001-002 — 2026-06-26 — Claude (Anthropic)

**Agente:** Claude Sonnet
**Tarea:** Setup inicial del proyecto — estructura base local

### Qué se hizo
- Scaffold Next.js con TypeScript + Tailwind vía `create-next-app`
- Instalación de dependencias core: Supabase, TanStack Query, react-hook-form, Zod, Sonner, Recharts, Lucide, Anthropic SDK, date-fns
- Creación de estructura de carpetas completa (App Router)
- CLAUDE.md con contexto del proyecto y convenciones
- `types/database.ts` — schema de tipos TypeScript del dominio
- `lib/utils.ts` — helpers (cn, formatCurrency, formatDate)
- `lib/supabase/client.ts` + `server.ts` — clientes Supabase SSR
- `lib/ai/content-generator.ts` — helper Claude para generación de copies
- `.env.local.example` — plantilla de variables de entorno
- `supabase/migrations/001_initial_schema.sql` — schema base completo
- `src/app/layout.tsx` + `globals.css` — layout raíz con Sonner
- `src/app/(auth)/login/page.tsx` — página de login (UI base)
- `src/app/(dashboard)/layout.tsx` — layout dashboard con sidebar
- `src/app/(dashboard)/page.tsx` — dashboard principal (KPIs)
- `src/app/(dashboard)/campaigns/page.tsx` — listado de campañas

### Estado al terminar
- Proyecto scaffoldeado y funcional localmente (`npm run dev`)
- Sin Supabase conectado — requiere crear proyecto Supabase y llenar `.env.local`
- Sin OAuth apps creadas en redes sociales
- Siguiente paso: crear proyecto Supabase, aplicar migración, conectar env vars

### Pendiente
- [ ] Crear proyecto Supabase para PubliCool (separado del de Kostruye+)
- [ ] Aplicar `supabase/migrations/001_initial_schema.sql`
- [ ] Crear `.env.local` con credenciales reales
- [ ] Implementar módulo de campañas completo
- [ ] Implementar generador de contenido con IA
- [ ] Configurar OAuth apps (Meta, TikTok, LinkedIn)
- [ ] Implementar publicación automática
- [ ] Implementar analítica
- [ ] Implementar módulo de leads
