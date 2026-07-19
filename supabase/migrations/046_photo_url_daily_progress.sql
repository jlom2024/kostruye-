-- =================================================================================
-- Kostruye+ — Migración 046
-- Agrega columna photo_url a daily_progress_entries
-- =================================================================================

ALTER TABLE public.daily_progress_entries ADD COLUMN IF NOT EXISTS photo_url TEXT;
