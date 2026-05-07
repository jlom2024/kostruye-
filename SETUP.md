# Kostruye+ — Guía de arranque

## 1. Instalar dependencias (solo la primera vez)

```bash
cd kostruye-plus
npm install
```

## 2. Variables de entorno

Copia el archivo de ejemplo y completa tus credenciales de Supabase:

```bash
cp .env.local.example .env.local
```

Obtén `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en:
`https://supabase.com/dashboard/project/<tu-proyecto>/settings/api`

## 3. Crear la base de datos en Supabase

1. Entra a tu proyecto en supabase.com
2. Ve a **SQL Editor**
3. Copia y ejecuta el contenido de `supabase/migrations/001_core_schema.sql`

## 4. Correr en local

```bash
npm run dev
```

La app estará en `http://localhost:3000`

---

## Deploy en Hostinger VPS

### Requisitos del VPS
- Ubuntu 22.04+
- Docker + Docker Compose instalados
- Dominio apuntando a la IP del VPS

### Pasos

1. **Subir el código al VPS:**
```bash
git clone https://github.com/tu-repo/kostruye-plus.git
cd kostruye-plus
```

2. **Crear el archivo `.env` en el VPS** (equivalente al `.env.local`):
```bash
cp .env.local.example .env
nano .env   # completar con valores reales
```

3. **Obtener certificado SSL con Certbot** (si no tienes):
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d kostruye.tudominio.com
# Certificados quedan en /etc/letsencrypt/live/tudominio.com/
mkdir -p nginx/certs
cp /etc/letsencrypt/live/tudominio.com/fullchain.pem nginx/certs/
cp /etc/letsencrypt/live/tudominio.com/privkey.pem nginx/certs/
```

4. **Actualizar nginx.conf**: reemplaza `server_name _` con tu dominio real.

5. **Build y deploy:**
```bash
docker compose up -d --build
```

6. **Verificar que corre:**
```bash
docker compose ps
docker compose logs app --tail=50
```

### Actualizar la app

```bash
git pull origin main
docker compose up -d --build
```

---

## Estructura del proyecto

```
kostruye-plus/
├── app/
│   ├── (auth)/login/        # Pantalla de login
│   └── (dashboard)/
│       └── proyectos/
│           ├── page.tsx     # Lista de proyectos
│           └── [id]/        # Módulos por proyecto
│               ├── presupuesto/
│               ├── compras/
│               ├── almacen/
│               ├── nominas/
│               ├── valorizaciones/
│               ├── lean/
│               └── contabilidad/
├── components/
│   ├── layout/              # Sidebar, Topbar
│   └── providers/           # TanStack Query
├── lib/
│   └── supabase/            # Clientes browser y server
├── types/database.ts        # Tipos TypeScript del schema
├── supabase/migrations/     # Schema SQL
├── Dockerfile
├── docker-compose.yml
└── nginx/nginx.conf
```
