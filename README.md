# Kostruye+ — ERP para Constructoras Peruanas

Frontend web de **Kostruye+**, ERP multi-tenant para empresas constructoras peruanas.

- **URL producción**: https://konstruye.site
- **Repo**: https://github.com/jlom2024/kostruye-
- **Backend**: Supabase (PostgreSQL + Auth + RLS + Storage)
- **Stack**: Next.js 16, React 19, Tailwind CSS v4, TanStack Query, Supabase SSR

## Entorno

Copiar `.env.example` a `.env.local` y completar:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://wyaugtdgmcesoryhyois.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_APP_URL=https://konstruye.site
```

## Comandos

```bash
npm run dev     # localhost:3000
npm run build
npm run lint
npx tsc --noEmit
```

## Deploy VPS

```bash
ssh -i ~/.ssh/antu_kostruye root@2.24.72.21 "git -C /opt/kostruye-plus fetch --prune origin && git -C /opt/kostruye-plus reset --hard origin/master && cd /opt/kostruye-plus && docker compose up -d --build"
```

## Documentación

- `CLAUDE.md` — contexto completo del proyecto, stack, módulos, convenciones y deploy.
- `docs/BITACORA.md` — registro cronológico de cambios por sesión.
- `docs/manual/Manual-Kostruye-Plus.html` — fuente del manual de usuario.
- `public/Manual-Kostruye-Plus.pdf` — manual compilado.

## Módulos principales

- Dashboard ejecutivo con EVM (CPI/SPI) y Curva S
- Presupuesto / APU con importación S10
- Compras, Servicios, Almacén (Kardex PPP)
- Tareo Diario, Parte Equipos, Avance Diario, Productividad
- Calidad y HSE (checklists + incidentes)
- Nóminas, Valorizaciones, Control de Costos
- Caja Chica, Fideicomiso CORFID
- Contabilidad + Facturación SUNAT
- KIA — copiloto IA integrado

## Notas para agentes

Ver `CLAUDE.md` antes de modificar cualquier módulo.

## App móvil

El repositorio de la app móvil (Expo / React Native) está en `../kostruye-movil`.

