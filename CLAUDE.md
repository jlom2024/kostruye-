# Kostruye+ — Contexto del Proyecto

## ¿Qué es Kostruye+?

ERP de gestión integral para empresas constructoras peruanas. SaaS multi-tenant donde cada constructora es una **organización** con sus propios proyectos, usuarios y datos aislados por RLS en Supabase.

Desarrollado por **KREO IA Studio** (Antu, fundador). Stack: Next.js 16 App Router + React 19 + Supabase + Tailwind v4.

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
| Deploy local | `npm run dev` → localhost:3000 |
| Deploy prod | Docker + Nginx en VPS Hostinger |

---

## Estructura de Archivos

```
kostruye-plus/
├── app/
│   ├── layout.tsx                    # Root layout (QueryProvider + Sonner)
│   ├── page.tsx                      # → redirect a /proyectos
│   ├── globals.css
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   └── login/page.tsx            # Login email+password Supabase
│   └── (dashboard)/
│       ├── layout.tsx                # Layout con sidebar
│       ├── proveedores/
│       │   ├── page.tsx
│       │   └── suppliers-client.tsx
│       └── proyectos/
│           ├── page.tsx              # Lista de proyectos
│           ├── (list)/layout.tsx
│           ├── nuevo/page.tsx        # Crear proyecto
│           ├── projects-grid.tsx
│           └── [id]/
│               ├── layout.tsx
│               ├── dashboard/        # Dashboard del proyecto + KPIs
│               ├── presupuesto/      # APU + presupuesto venta/meta
│               ├── compras/          # OC y OS — órdenes de compra/servicio
│               ├── almacen/          # Stock, ingresos, vales de salida
│               ├── nominas/          # Tareo diario, planillón
│               ├── valorizaciones/   # Avance físico + reajuste polinómico
│               ├── lean/             # Last Planner System, PPC
│               ├── contabilidad/     # Tesorería, facturas, reportes
│               └── configuracion/    # Config del proyecto
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   └── topbar.tsx
│   └── providers/
│       └── query-provider.tsx
├── lib/
│   ├── utils.ts                      # cn, formatCurrency, formatNumber, getInitials
│   └── supabase/
│       ├── client.ts                 # Browser client
│       └── server.ts                 # Server component client
├── types/
│   └── database.ts                   # Tipos TS espejo del schema SQL
├── supabase/
│   └── migrations/
│       ├── 001_core_schema.sql       # Org, proyectos, presupuesto, APU
│       ├── 003_compras.sql           # Módulo compras/procura
│       ├── 004_nominas.sql           # Módulo nóminas/tareo
│       └── 005_valorizaciones.sql    # Módulo valorizaciones
├── scripts/                          # Scripts utilitarios (seed, etc.)
├── nginx/nginx.conf                  # Configuración Nginx para VPS
├── Dockerfile
├── docker-compose.yml
├── .env.local                        # Variables locales (NO commitear)
└── .env.local.example                # Plantilla de variables
```

---

## Multi-tenancy y Roles

### Jerarquía
```
Organization (constructora)
  └── Projects (obras)
        └── Modules (presupuesto, compras, almacen, ...)
```

### Roles de usuario (`user_role` enum)
| Rol | Acceso |
|-----|--------|
| `admin` | Todo — gestión org + todos los proyectos |
| `project_manager` | Proyectos asignados, escritura en módulos core |
| `field_engineer` | Lectura + tareo/almacén en campo |
| `purchasing` | Módulo compras, catálogo de recursos |
| `warehouse` | Módulo almacén |
| `hr` | Módulo nóminas |
| `readonly` | Solo lectura |

Los roles existen en 2 niveles: **organization_members** (global) y **project_members** (por proyecto). El rol de proyecto tiene precedencia.

---

## Schema de Base de Datos (Supabase)

### Migración 001 — Core
- `organizations` — root de multi-tenancy, tiene RUC y plan
- `organization_members` — users en una org (con rol)
- `projects` — obras: código, cliente, ubicación, moneda, estado, fechas
- `project_members` — users en un proyecto (con rol específico)
- `resource_catalog` — catálogo de insumos (equivalente S10): mano de obra, materiales, equipos, subcontratos
- `budgets` — presupuesto por proyecto (tipo: `venta` | `meta`)
- `budget_chapters` — capítulos jerárquicos del presupuesto (código "01", "01.02")
- `budget_items` — partidas: cantidad × precio_unitario = total (columna generada)
- `apu_lines` — líneas del APU por partida: cuadrilla, rendimiento, cantidad/unidad
- `reajuste_formulas` + `reajuste_monomios` — fórmulas polinómicas con índices INEI

### Migraciones adicionales
- **003** — Compras: requerimientos, OC (materiales), OS (subcontratos/alquileres), flujos de aprobación
- **004** — Nóminas: personal, tareo diario (estándar / por actividades / multiproyecto), planillón
- **005** — Valorizaciones: avance físico, reajuste automático, amortización de adelantos

### RLS (Row Level Security)
Todas las tablas tienen RLS habilitado. Las políticas se basan en `auth.uid()` cruzado con `organization_members` o `project_members`. Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` al cliente.

---

## Variables de Entorno

```bash
# .env.local (nunca commitear)
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # solo server-side
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

El `SUPABASE_SERVICE_ROLE_KEY` solo se usa en server components / API routes. **Jamás se pasa al cliente.**

---

## Módulos — Estado Actual
_Última actualización: 2026-05-14_

| Módulo | Ruta | Estado |
|--------|------|--------|
| Auth / Login | `/login` | ✅ Funcional |
| Lista de proyectos | `/proyectos` | ✅ Funcional |
| Crear proyecto | `/proyectos/nuevo` | ✅ Funcional |
| Dashboard S10 | `/proyectos/[id]/dashboard` | ✅ RO real (Kardex PPP) + Curva S 3 líneas |
| Presupuesto + APU | `/proyectos/[id]/presupuesto` | ✅ UI + import OCR + import S10 |
| Compras (OC/OS) | `/proyectos/[id]/compras` | ✅ Schema + UI cliente |
| Almacén | `/proyectos/[id]/almacen` | ✅ UI completa (836 líneas) — Kardex PPP activo |
| Nóminas / Tareo | `/proyectos/[id]/nominas` | ✅ Schema + UI cliente |
| Valorizaciones | `/proyectos/[id]/valorizaciones` | ✅ Schema + UI cliente + print |
| Lean / LPS | `/proyectos/[id]/lean` | 🔨 En desarrollo (670 líneas) |
| Contabilidad | `/proyectos/[id]/contabilidad` | 🔨 En desarrollo (430 líneas) |
| Servicios / Subcontratos | `/proyectos/[id]/servicios` | ✅ UI cliente (604 líneas) |
| Clientes de obra | `/clientes` | ✅ UI cliente (352 líneas) |
| Proveedores | `/proveedores` | ✅ UI cliente |
| Configuración | `/proyectos/[id]/configuracion` | ✅ Completo (Fase 1) |
| Demo KREO Vivienda | `sql_seed` | 🧪 Inyectando data coherente |
| Admin multi-tenant | `/admin` | ✅ Panel activo en producción |

## Cambios recientes

### 2026-05-14 — ✅ Sprint 1.5: Fix Auth & Nav Links
- **Enlaces Directos**: Se corrigieron los botones de la landing para que apunten directamente a sus respectivos logins (`/login` para clientes y `/admin/login` para administración), eliminando redirecciones confusas.
- **Robustez Admin Auth**: Se añadió una comprobación de sesión (`useEffect`) en la página de login de administración para redirigir automáticamente al panel si el token ya es válido.
- **API Auth**: Se agregó el método `GET` a `/api/admin/auth` para permitir validaciones de sesión desde el cliente.

### 2026-05-14 — ✅ Sprint 1.4: Onboarding y Administración Pro
- **Aprovisionamiento Automático**: Se actualizó el panel de administración (`/admin`) para que al crear un cliente se cree automáticamente su **Organización** real, el **Usuario de Auth** con la contraseña definida y se vinculen como **Admin**. Esto asegura un entorno funcional y aislado desde el primer segundo.
- **Onboarding de Proyectos**: Se rediseñó el estado vacío de la lista de proyectos (`/proyectos`). Ahora los nuevos clientes ven una pantalla de bienvenida con una guía de 2 pasos para crear su primera obra.
- **Acceso para Clientes**: Se añadió un botón de **"Acceso Clientes"** en la navegación de la landing page para facilitar el ingreso de las constructoras a sus plataformas personalizadas.
- **Gestión de Passwords**: Se añadió el campo de contraseña en el formulario de creación de clientes y se validó que los clientes puedan cambiarla desde su panel de configuración.

### 2026-05-14 — ✅ Sprint 1.3: Estabilidad RLS, Multi-tenant y KIA AI
- **Bug Fix Multi-tenant**: Se corrigió un error crítico 500 en `/configuracion`, `/proyectos/nuevo` y en el endpoint de KIA (`/api/ai/chat/route.ts`). Ocurría porque se usaba `.single()` al consultar `organization_members` filtrando solo por `user_id`. Al pertenecer un usuario a múltiples orgs, colapsaba. Se reemplazó por `.limit(1).single()` o validaciones seguras de `organization_id`.
- **Inteligencia Artificial (KIA)**: El asistente de obra se actualizó al modelo `gpt-4o-mini` (había un typo `o4-mini`) y ahora es plenamente **Context-Aware**, inyectando el ID del proyecto activo en el System Prompt para aislar respuestas y herramientas.
- **Limpieza de Datos Global**: Se purgó la base de datos de proveedores duplicados (originados al correr seeds repetidamente porque `suppliers` y `clients` se comparten a nivel org, no a nivel proyecto).
- **Data Dummy Nóminas**: Se inyectaron 3 trabajadores base y entradas de pago en las semanas de enero para los proyectos KREO Vivienda y PRJ-RO-01, habilitando la vista real del tareo.
- **Deploy SSH Automatizado**: Se configuró el VPS (187.77.54.30) para aceptar `git pull` y `docker compose up -d` vía llave SSH local (`id_ed25519`), permitiendo deploys sin contraseña ni scripts bloqueantes.

### 2026-05-14 — ✅ Sprint 1.2.2: Gestión de Equipo
- **UI de Equipo**: Tabla de miembros con gestión de roles y eliminación.
- **Invitaciones**: Panel para añadir usuarios de la organización al proyecto.
- **Data Fetching**: Optimizado en Server Component con joins de perfiles.

### 2026-05-14 — ✅ Sprint 1.2.1: Configuración Base + Tabs

### 2026-05-14 — ✅ Sprint 1.1: RO Real Conectado
- **Dashboard**: `page.tsx` conectado a las vistas SQL reales.
- **Tipos**: `types/database.ts` actualizado con vistas de costo y tablas de avance.
- **Lógica de Costos**: Implementado fallback OCs → Kardex PPP según disponibilidad de datos.
- **UI**: Badge dinámico "Kardex PPP ✓" activo.

---

### 2026-05-14 — ✅ Deploy reparado + Migración 009 aplicada

**Deploy arreglado:**
- `page.tsx` corrupto por commit desde Cowork/sandbox → reparado en commit `cf9cf47`
- Push a `origin/master` + `docker compose up -d --build` en VPS
- Contenedor `kostruye-plus-app-1` corriendo en producción

**Migración `009_ro_real.sql` aplicada en Supabase producción:**
- `stock_withdrawals` — columnas `unit_cost` + `total_cost` (PPP)
- `fn_ppp_unit_cost()` — función Precio Promedio Ponderado
- `trg_assign_ppp` — trigger automático al emitir vale de salida
- `stock_levels` — vista actualizada con `ppp_unit_cost` y `stock_value`
- `service_order_advances` — tabla para avances de subcontratos + RLS
- `project_material_cost` — vista de costo real de materiales por proyecto
- `project_service_cost` — vista de costo real de servicios por proyecto

**Importador S10 en producción:**
- `app/api/import-budget-s10/route.ts` — parser Excel S10 con SheetJS
- `import-s10-modal.tsx` + `import-s10-button.tsx` — UI de upload→preview→import
- Dependencia `xlsx: ^0.18.5` en `package.json`

**⚠️ REGLA:** No volver a hacer `git commit` desde Cowork/sandbox. Solo desde PowerShell local.

---

### 2026-05-13 — SEO + Google Search Console
- **`app/sitemap.ts`** — Genera `/sitemap.xml` automáticamente (landing + login)
- **`app/robots.ts`** — Genera `/robots.txt` (bloquea `/proyectos/`, `/admin/`, `/api/`)
- **`app/layout.tsx`** — Metadata completa: OG, Twitter cards, JSON keywords, canonical, `verification.google: "YznhFBzkOtji68yPoDtZPgFYD9wv-kYNl4fuFyhFH8I"`
- **`app/page.tsx`** — Title SEO optimizado + JSON-LD `SoftwareApplication` con planes de precios
- Google Search Console: propiedad verificada ✅, sitemap enviado ✅, indexación solicitada ✅

### 2026-05-08 — Dashboard S10 (Resultado Operativo)
- **`dashboard/page.tsx`** — Queries: `payroll_periods` (costo MO) + `issue_date` en OCs + `ocTimeline` para Curva S comprometida
- **`dashboard-client.tsx`** — Componente `ResultadoOperativo`: KPIs + barra desglose + Curva S 3 líneas
- Deploy automático a `kreo-crm.site` via Docker en VPS 187.77.54.30

### Estado del RO en producción
- ✅ Ingreso valorizado → `valorizaciones` aprobadas
- ✅ Costo MO → `payroll_periods` cerradas
- ✅ Costo materiales → `stock_withdrawals` × PPP (Kardex) — **migración 009 aplicada**
- ✅ Costo subcontratos → `service_order_advances` — **migración 009 aplicada**

---

## Módulos — Descripción Funcional

### Presupuesto
- Dos tipos de presupuesto por proyecto: **venta** (ofertado al cliente) y **meta** (presupuesto interno)
- Estructura: Capítulos → Partidas → APU (Análisis de Precios Unitarios)
- APU: líneas por tipo de recurso (mano de obra, material, equipo, subcontrato) con cuadrilla y rendimiento
- Catálogo de recursos centralizado por organización (equivalente S10)

### Compras / Procura
- Requerimientos vinculados a techo presupuestal por partida de control
- Flujos de aprobación → Órdenes de Compra (materiales) y Órdenes de Servicio (subcontratos/alquileres)
- Evita paralizaciones y compras a sobreprecio

### Almacén
- Stock en tiempo real por proyecto
- Ingresos y vales de salida obligatoriamente vinculados a partida de control
- Reportes de consumos por frente de trabajo
- Alertas de stock mínimo

### Nóminas / Tareo
- Registro de personal (obreros y staff)
- Tareo diario: estándar, por actividades o multiproyecto
- Cálculo de costos de MO → alimenta el Resultado Operativo

### Valorizaciones
- Cuantificación económica del avance físico para cobro periódico al cliente
- Reajuste automático con fórmulas polinómicas e índices unificados INEI
- Control de deducciones y amortización de adelantos (efectivo o materiales)

### Lean (Last Planner System)
- Lookahead (planificación intermedia)
- Identificación y eliminación de restricciones
- Plan de trabajo semanal
- PPC (Porcentaje de Plan Completado)

### Contabilidad / Administración
- Tesorería (caja y bancos)
- Facturas de proveedores
- Consolidación de operaciones sin doble registro

---

## Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Dev server
npm run dev          # → http://localhost:3000

# Build producción
npm run build
npm run start

# Lint
npm run lint
```

---

## Deploy en VPS (Hostinger)

```bash
# Build y levantar
docker compose up -d --build

# Ver estado
docker compose ps
docker compose logs app --tail=50

# Actualizar tras git pull
git pull origin main
docker compose up -d --build
```

**Nginx** actúa como reverse proxy con SSL (certificados Certbot/Let's Encrypt en `/nginx/certs/`).

---

## Convenciones de Código

- **Server vs Client components**: páginas principales son Server components que fetchen datos → pasan props a `*-client.tsx` (client components con estado e interactividad)
- **Auth**: Supabase SSR con cookies (`@supabase/ssr`) — `lib/supabase/client.ts` para browser, `lib/supabase/server.ts` para server
- **Tipos**: siempre importar de `types/database.ts`, nunca redefinir inline
- **Moneda**: usar `formatCurrency(amount, currency)` de `lib/utils.ts`
- **Toasts**: usar `sonner` (ya configurado en root layout)
- **Estilos**: Tailwind v4, usar `cn()` de `lib/utils.ts` para clases condicionales
- Commits en inglés, conventional commits (`feat:`, `fix:`, `data:`, etc.)
- `.env.local` nunca se commitea

---

## Supabase — Referencia del Proyecto

- **Project ref**: `wyaugtdgmcesoryhyois`
- **URL**: `https://wyaugtdgmcesoryhyois.supabase.co`
- Dashboard: https://supabase.com/dashboard/project/wyaugtdgmcesoryhyois
- SQL Editor para correr migraciones manualmente

---

## Documento Técnico de Arquitectura

Existe un documento Word completo en:
`D:\Empresas\KREO Studio\Kostruye+\Kostruye+ - Documento Tecnico de Arquitectura v1.0.docx`

Contiene la especificación detallada de todos los módulos con fuentes académicas y referencias del sector construcción peruano.
