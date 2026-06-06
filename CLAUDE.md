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
| Deploy prod | Docker + Nginx en VPS (IP: 2.24.72.21) |

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

## Integración CORFID / DH Consultores (2026-05-24)

### Concepto
Konstruye+ sirve como puerta de entrada al servicio de fideicomiso de HD Consultores.
Solo las constructoras explícitamente habilitadas como "clientes fideicomiso" pueden autorizar acceso.

### Campo clave: `app_clients.fideicomiso_enabled`
- Lo activa el **admin de Kostruye+** en `/admin` al crear o editar una constructora
- Toggle visual en el formulario: "Cliente Fideicomiso (DH Consultores)"
- Column en la tabla con mini-toggle por fila (inline PATCH)
- **Si `false`**: la constructora es un cliente normal de Kostruye+, sin vínculo a CORFID
- **Si `true`**: aparece el widget `FideicomisoWidget` en el dashboard del cliente

### Campo `app_clients.fideicomiso_authorized_at`
- `NULL` = aún no autorizó
- Filled = click ya registrado, widget muestra "Autorizado ✓" en verde
- Migración: `supabase/migrations/013_fideicomiso.sql`

### Archivos implementados
| Archivo | Función |
|---------|---------|
| `supabase/migrations/013_fideicomiso.sql` | Añade los dos campos a `app_clients` |
| `app/api/admin/clients/route.ts` | POST persiste `fideicomiso_enabled` |
| `app/api/admin/clients/[id]/route.ts` | PATCH permite actualizar `fideicomiso_enabled` |
| `app/api/fideicomiso/autorizar/route.ts` | Valida sesión → llama CORFID webhook → guarda timestamp |
| `app/(dashboard)/layout.tsx` | Lee flag del usuario logueado y renderiza el widget |
| `components/fideicomiso/fideicomiso-widget.tsx` | Banner flotante + modal con RUC + declaración legal |
| `docker-compose.yml` | Vars `CORFID_API_URL`, `CORFID_TENANT_SLUG`, `CORFID_WEBHOOK_SECRET` |
| `.env.local` | Valores locales de las vars CORFID |

### Variables de entorno para integración CORFID
```
CORFID_API_URL=http://localhost:3001        # En prod: URL del backend CORFID
CORFID_TENANT_SLUG=hd-consultores
CORFID_WEBHOOK_SECRET=<tu-webhook-secret>  # Debe coincidir con KONSTRUYE_WEBHOOK_SECRET en CORFID
```

### Flujo completo
```
Admin crea constructora con fideicomiso_enabled = true
→ Constructora se loguea a Kostruye+
→ Dashboard layout lee fideicomiso_enabled del app_client
→ Muestra FideicomisoWidget (banner flotante azul)
→ Cliente hace click "Autorizar acceso"
→ Modal: ingresa RUC + acepta declaración legal
→ POST /api/fideicomiso/autorizar
  → valida sesión + fideicomiso_enabled = true + no autorizado antes
  → POST CORFID /authorizations/webhook/hd-consultores
    → CORFID crea Trust PENDING_AUTH
    → WS emite authorization:received → toast en dashboard DH Consultores
  → guarda fideicomiso_authorized_at en Supabase
→ Widget cambia a "Fideicomiso autorizado ✓" (verde)
```

### Pendiente
- Correr migración `013_fideicomiso.sql` en SQL Editor de Supabase
- En prod: apuntar `CORFID_API_URL` a la URL real del backend CORFID en VPS

---

## Módulos — Estado Actual
_Última actualización: 2026-05-29_

| Módulo | Ruta | Estado |
|--------|------|--------|
| Auth / Login | `/login` | ✅ Funcional |
| Lista de proyectos | `/proyectos` | ✅ Funcional |
| Crear proyecto | `/proyectos/nuevo` | ✅ Funcional |
| Dashboard S10 | `/proyectos/[id]/dashboard` | ✅ RO real (Kardex PPP) + Curva S 3 líneas |
| Presupuesto + APU | `/proyectos/[id]/presupuesto` | ✅ UI + import OCR + import Excel S10 |
| Compras (OC/OS) | `/proyectos/[id]/compras` | ✅ Schema + UI cliente |
| Almacén | `/proyectos/[id]/almacen` | ✅ UI completa — Kardex PPP activo |
| Nóminas / Tareo | `/proyectos/[id]/nominas` | ✅ Schema + UI cliente |
| Valorizaciones | `/proyectos/[id]/valorizaciones` | ✅ Schema + UI cliente + print |
| Lean / LPS | `/proyectos/[id]/lean` | 🔨 En desarrollo |
| Contabilidad | `/proyectos/[id]/contabilidad` | ✅ Gastos + Facturación Electrónica SUNAT |
| Servicios / Subcontratos | `/proyectos/[id]/servicios` | ✅ UI cliente |
| Clientes de obra | `/clientes` | ✅ UI cliente |
| Proveedores | `/proveedores` | ✅ UI cliente |
| Configuración | `/proyectos/[id]/configuracion` | ✅ Completo (Fase 1) |
| Demo KREO Vivienda | `sql_seed` | 🧪 Inyectando data coherente |
| Admin multi-tenant | `/admin` | ✅ Panel activo en producción |

## Variables de entorno SUNAT

```bash
# Solo la URL del microservicio — NO api_key/api_secret aquí
KREO_SUNAT_URL=http://2.24.72.21:3020
NEXT_PUBLIC_SUNAT_URL=http://2.24.72.21:3020
```

**⚠️ DECISIÓN 2026-06-02:** Las credenciales SOL (`api_key` + `api_secret`) ya **NO van en `.env`**. Cada organización las ingresa ella misma desde la pantalla de Configuración → SUNAT. Se guardan en Supabase por organización.

---

## Integración Facturación Electrónica SUNAT

### Arquitectura (actualizada 2026-06-02)

```
Cliente ingresa api_key + api_secret en /configuracion → SUNAT
              ↓ guardado en organizations.sunat_api_key / sunat_api_secret (Supabase)
              ↓
API route /api/invoices lee credenciales de la org del usuario
              ↓
POST http://2.24.72.21:3020/api/auth/login → JWT (cacheado 1h)
              ↓
POST /api/emisiones → comprobante emitido
```

**Por qué:** Eliminamos la necesidad de que KREO configure las credenciales para cada cliente. Cada constructora ingresa su propio RUC+SOL directamente.

### Columnas en organizations (migración pendiente)
```sql
ALTER TABLE organizations ADD COLUMN sunat_api_key TEXT;
ALTER TABLE organizations ADD COLUMN sunat_api_secret TEXT;
ALTER TABLE organizations ADD COLUMN sunat_configurado BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN sunat_ruc TEXT;
```

### UI — Pantalla de configuración SUNAT
- Ruta: `/configuracion` → tab "SUNAT / Facturación"
- Campos: RUC, api_key (de KREO-SUNAT), api_secret
- Al guardar: `PATCH /api/org/sunat` → guarda en Supabase
- Botón "Verificar conexión" → `POST /api/org/sunat/test`

### API Routes (pendiente implementar)
| Ruta | Método | Función |
|---|---|---|
| `/api/org/sunat` | GET/PATCH | Leer/guardar credenciales SUNAT de la org |
| `/api/org/sunat/test` | POST | Verificar que las credenciales funcionan |
| `/api/invoices` | GET | Lista comprobantes por `project_id` |
| `/api/invoices` | POST | Emite comprobante → proxy a KREO-SUNAT con creds de la org |
| `/api/invoices/[id]` | GET | Consulta estado SUNAT |
| `/api/invoices/[id]` | DELETE | Anula comprobante |

### Tabla: `electronic_invoices` (migración 014)
| Columna | Tipo | Descripción |
|---|---|---|
| `comprobante_tipo` | TEXT | 01=Factura, 03=Boleta, 07=NC, 08=ND |
| `numero_formateado` | TEXT | "F001-00000001" |
| `estado_sunat` | TEXT | pendiente → enviado → aceptado/rechazado |
| `sunat_comprobante_id` | INT | ID en KREO-SUNAT para descargar XML/PDF |

### Estado actual (2026-06-02)
- ❌ `app/api/invoices/` — **NO existe en el repo**, pendiente crear
- ❌ `app/api/org/sunat` — pendiente crear
- ❌ Migración columnas `organizations.sunat_*` — pendiente
- ❌ UI de configuración SUNAT — pendiente
- ✅ `app/api/org/sunat-sol/route.ts` — existe (revisar si reutilizable)
- ✅ KREO-SUNAT microservicio corriendo en `2.24.72.21:3020`

---

## Cambios recientes

### 2026-05-29 — ✅ Facturación Electrónica SUNAT integrada

Ver sección "Integración Facturación Electrónica SUNAT" arriba.

---

### 2026-05-19 — ✅ Manual corregido: sección Importar Excel S10

**Archivo:** `D:\Empresas\KREO Studio\Kostruye+\Manual-Kostruye-Plus.docx`

- El manual no tenía ninguna mención del importador de S10/Excel — solo describía "Importar PDF (OCR)"
- Insertada nueva sección **"Importar presupuesto desde Excel S10"** en el Capítulo 4 (Presupuesto), entre "Importar desde PDF" y "Exportar a Excel"
- Deja claro que **no se lee el archivo nativo `.s10`** — se lee el `.xlsx`/`.xls` exportado desde S10 via Archivo → Exportar → Excel
- Incluye pasos numerados y nota de advertencia al pie
- Modificación hecha con python-docx clonando estilos existentes del documento (Heading 2, List Paragraph, Normal)
- PDF pendiente de regenerar manualmente (LibreOffice no disponible en el equipo) — abrir el .docx y Guardar como PDF

---

### 2026-05-16 — ✅ Sprint 1.8: Página de pagos + control de suscripciones

**Página de pagos (`app/pagar/page.tsx`):**
- Nueva ruta `/pagar?plan=pro|piloto|enterprise` — `robots: noindex`
- Muestra resumen del plan elegido + métodos de pago peruanos
- QR Yape (`public/qr-yape.jpg`) + QR Plin (`public/qr-plin.jpg`) — imágenes reales, ocupan todo el recuadro
- Datos de transferencia Interbank: cuenta 084 3161549763 / CCI 00308401316154976316 / Titular Jorge Ordoñez
- Botón WhatsApp pre-cargado con mensaje del plan → `wa.me/51907130225`

**Landing (`app/page.tsx`):**
- Card "Piloto / Gratis" eliminada — pricing queda en 2 columnas centradas (Pro + Enterprise)
- "Empezar ahora" (Pro) → `/pagar?plan=pro`
- "Contactar ventas" (Enterprise) → WhatsApp directo
- Grid responsive actualizado a `repeat(2,1fr)` max-width 760px

**Admin dashboard (`app/admin/page.tsx`):**
- Campo `subscription_start` — date picker inline por cliente, se guarda automáticamente vía PATCH
- Columna "Próx. cobro" — calcula próxima fecha de renovación (ciclos de 30 días)
- Badge de estado: 🟢 `Xd restantes` / 🟡 `Vence en Xd` (≤5 días) / 🔴 `Vencido`

**API (`app/api/admin/clients/[id]/route.ts`):**
- `subscription_start` agregado a campos permitidos en PATCH

**Migración 012 (`supabase/migrations/012_subscription_start.sql`):**
- `ALTER TABLE app_clients ADD COLUMN IF NOT EXISTS subscription_start DATE`
- Aplicada en producción vía MCP Supabase

---

### 2026-05-15 — ✅ Sprint 1.7: Landing, SEO crítico y UX fixes

**Landing page (`app/page.tsx`):**
- **Nav**: eliminado "Panel admin", reemplazado por "Solicitar demo" → WhatsApp y "Acceso Clientes" → `/login`
- **Precios**: Enterprise S/ 1,299 → **S/ 1,999** (validado vs mercado: Procore $1,400+/mes, BrickControl $194/mes/3 usuarios)
- **Módulos**: colores unificados a `#f59e0b` (antes mezclados blue/purple/green/cyan)
- **KIA chat**: respuesta completada con datos reales (OC mes actual, proveedor mayor, 3 OC pendientes); texto "Powered by o4-mini" → **"Powered by Claude"**
- **JSON-LD**: descripción Enterprise actualizada con "proyectos ilimitados, usuarios ilimitados, KIA IA incluido"
- **Hero background**: 3 orbs de luz animados (amber/purple/blue) + grid sutil con pulse + sweep diagonal de luz — todo CSS puro, sin JS extra
- **Botones demo**: nav y hero apuntan a WhatsApp (`wa.me/51907130225`) — `mailto:` no funciona en navegadores sin cliente de email configurado

**Importador S10 (`import-s10-modal.tsx` + `import-s10-button.tsx`):**
- Título del modal: "Importar desde S10" → **"Importar Excel de S10"**
- Botón: "Importar S10" → **"Importar Excel S10"**
- Instrucción: aclaración explícita "no el archivo nativo .s10" — el parser solo lee `.xlsx`/`.xls` exportados desde S10 via Archivo → Exportar → Excel

**SEO — 4 bugs críticos resueltos:**
1. **`app/robots.ts`**: agregado `Disallow: /*/` para bloquear rutas de tenants (`/{slug}/`) del índice de Google
2. **`nginx/vhost.d/www.kreo-crm.site`** (VPS): redirect 301 `www` → `kreo-crm.site` (canónico); nginx.conf actualizado en repositorio
3. **`proxy.ts` (middleware)**: `/robots.txt` y `/sitemap.xml` eran redirigidos a `/login` porque el middleware de auth los trataba como rutas protegidas. Agregados a `isPublicRoute`. **Root cause**: Next.js 16 + Turbopack compila `proxy.ts` como middleware (tiene `config.matcher`) aunque no se llame `middleware.ts` — confirmar con `_clientMiddlewareManifest.js`
4. **Logout**: `sidebar.tsx` y `admin/page.tsx` redirigían a `/login` y `/admin/login` al cerrar sesión → cambiado a `/` (landing)

**Infra / Deploy:**
- Commits desde PowerShell local → `git push origin master` → SSH al VPS → `git pull && docker compose up -d --build`
- nginx-proxy (`nginxproxy/nginx-proxy:1.6`) gestiona SSL con `acme-companion` — el `nginx.conf` del repo NO aplica en producción; la config real está en el volumen `traefik_vhost`

---

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
- **Deploy SSH Automatizado**: Se configuró el VPS (2.24.72.21) para aceptar `git pull` y `docker compose up -d` vía llave SSH local (`id_ed25519`), permitiendo deploys sin contraseña ni scripts bloqueantes.

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
- Deploy automático a `kreo-crm.site` via Docker en VPS 2.24.72.21

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
