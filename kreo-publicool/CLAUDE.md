@AGENTS.md

# KREO-PubliCool — Contexto del Proyecto

> **Para cualquier agente que tome este proyecto:** Lee primero `docs/BITACORA.md` — ahí está el historial de quién hizo qué y en qué estado quedó cada sesión.

## ¿Qué es KREO-PubliCool?

Plataforma SaaS para creación, automatización, publicación y analítica de campañas en redes sociales. Permite a empresas, marcas y agencias gestionar sus campañas desde un solo lugar con IA integrada.

Desarrollado por **KREO IA Studio** (Antu, fundador). Stack: Next.js + React + Supabase + Tailwind.

**Equipo de agentes:** Claude (Anthropic). Cada uno deja entrada en `docs/BITACORA.md` al terminar.

---

## Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js (App Router), React 19, TypeScript, Tailwind CSS |
| Data fetching | TanStack React Query v5, Supabase JS v2 |
| Backend/DB | Supabase (PostgreSQL + Auth + RLS + Storage) |
| Forms | react-hook-form + Zod |
| Tablas | TanStack React Table v8 |
| Charts | Recharts |
| Toasts | Sonner |
| IA texto | Anthropic `claude-haiku-4-5` |
| IA visual | (por definir — Replicate / Stability AI) |
| Video | (por definir — Remotion / Creatomate) |
| Colas | Redis + BullMQ (futuro) |
| Deploy | Docker en VPS `2.24.72.21` → `http://2.24.72.21:3005` (`/opt/kreo-publicool`) |

---

## Producción

| Campo | Valor |
|-------|-------|
| **URL** | `http://2.24.72.21:3005` (pendiente dominio + SSL) |
| VPS | `2.24.72.21` — `/opt/kreo-publicool/kreo-publicool` |
| Supabase | `hfiwflvxogktwsqkitpl` (cuenta `kreoiastudioperu@gmail.com`) |
| Login demo | `demo@publicool.app` / `DemoPubliCool2026` |
| Redeploy | `cd /opt/kreo-publicool && git fetch origin <branch> && git reset --hard origin/<branch> && cd kreo-publicool && docker compose up -d --build` |
| Migraciones aplicadas | `001_initial_schema` + `002_rls_read_policies` + `seed_demo` |

> Home del dashboard vive en **`/dashboard`** (la landing usa `/`). Migración `002` añade políticas RLS de lectura que faltaban en `001`.

---

## Módulos del MVP

| Módulo | Ruta | Estado |
|--------|------|--------|
| Auth (login/registro) | `/login`, `/register` | 🔨 Pendiente |
| Dashboard principal | `/` | 🔨 Pendiente |
| Marcas | `/brands` | 🔨 Pendiente |
| Campañas | `/campaigns` | 🔨 Pendiente |
| Generador de contenido | `/campaigns/[id]/content` | 🔨 Pendiente |
| Calendario | `/calendar` | 🔨 Pendiente |
| Analítica | `/analytics` | 🔨 Pendiente |
| Leads | `/leads` | 🔨 Pendiente |
| Configuración redes | `/settings` | 🔨 Pendiente |

---

## Flujo de usuario (MVP)

1. Login → selección de marca/organización
2. Crear campaña → conectar redes sociales
3. Definir objetivo, frecuencia, fechas, presupuesto
4. IA propone copies, hooks, CTAs, hashtags
5. Usuario revisa, aprueba y programa
6. Sistema publica, mide y reporta
7. Leads y métricas en panel único

---

## Variables de Entorno

```bash
# .env.local (NUNCA commitear)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
ANTHROPIC_API_KEY=

# Redes sociales (OAuth)
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# Storage
STORAGE_BUCKET=kreo-publicool-media
```

---

## Convenciones de Código

- **Server vs Client:** páginas = Server Components → pasan props a `*-client.tsx`
- **Auth:** Supabase SSR con cookies — `lib/supabase/client.ts` / `lib/supabase/server.ts`
- **Tipos:** importar de `types/database.ts`
- **Toasts:** `sonner`
- **Estilos:** Tailwind, `cn()` de `lib/utils.ts`

---

## Comandos de Desarrollo

```bash
npm run dev    # → http://localhost:3000
npm run build
npm run lint
```

---

## Multi-tenancy

```
Organization (agencia/empresa)
  └── Brands (marcas gestionadas)
        └── Campaigns (campañas activas)
              └── Posts (publicaciones programadas)
```

### Roles
| Rol | Acceso |
|-----|--------|
| `admin` | Todo — gestión org + todas las marcas |
| `manager` | Crear y gestionar campañas |
| `viewer` | Solo lectura + reportes |
