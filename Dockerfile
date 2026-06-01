# ── Etapa 1: dependencias ─────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --legacy-peer-deps --no-package-lock

# ── Etapa 2: build ────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm install --legacy-peer-deps --no-package-lock

COPY . .

# Variables de entorno en build time (se inyectan desde docker-compose)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG OPENAI_API_KEY=build-placeholder

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV OPENAI_API_KEY=$OPENAI_API_KEY
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Etapa 3: runtime (imagen mínima) ─────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Archivos estáticos
COPY --from=builder /app/public ./public

# Standalone output de Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
