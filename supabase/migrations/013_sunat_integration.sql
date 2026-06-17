-- Integración KREO-SUNAT para Konstruye+
-- 2026-06-01 — Antu / KREO IA Studio
-- Agrega columnas necesarias para facturación electrónica SUNAT

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS sunat_empresa_id  INTEGER,
  ADD COLUMN IF NOT EXISTS sunat_api_key     TEXT,
  ADD COLUMN IF NOT EXISTS sunat_api_secret  TEXT,
  ADD COLUMN IF NOT EXISTS sunat_configurado BOOLEAN DEFAULT false;

COMMENT ON COLUMN organizations.sunat_empresa_id IS 'ID de empresa en kreo-sunat';
COMMENT ON COLUMN organizations.sunat_api_key    IS 'api_key para autenticar con kreo-sunat';
COMMENT ON COLUMN organizations.sunat_api_secret IS 'api_secret (hash SHA-256 en kreo-sunat)';
COMMENT ON COLUMN organizations.sunat_configurado IS 'true cuando la empresa ya cargó sus credenciales SOL';
