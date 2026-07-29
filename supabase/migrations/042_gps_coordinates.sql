-- =================================================================================
-- Kostruye+ — Migración 042
-- Agregar columnas de geolocalización GPS (Latitud/Longitud) a módulos de campo
-- =================================================================================

-- 1. Módulo HSE (Incidentes)
ALTER TABLE public.hse_incidents 
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);

-- 2. Módulo Caja Chica (Transacciones)
ALTER TABLE public.petty_cash_transactions 
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);

-- 3. Módulo Tareo (Cabecera de Tareo)
ALTER TABLE public.tareos 
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);

-- 4. Módulo Avance Diario (Cabecera de Avance)
ALTER TABLE public.daily_progress_logs 
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);
