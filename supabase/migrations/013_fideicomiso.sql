-- ================================================================
-- Kostruye+ — Migración 013: Integración Fideicomiso DH Consultores
--
-- Solo las constructoras marcadas como fideicomiso_enabled = true
-- tendrán el widget de autorización a DH Consultores / CORFID.
-- El campo lo activa el admin de Kostruye+ al crear o editar
-- la empresa constructora en /admin.
-- ================================================================

-- 1. Campo principal: habilita toda la integración con DH Consultores
ALTER TABLE app_clients
  ADD COLUMN IF NOT EXISTS fideicomiso_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2. Registro de cuándo el cliente autorizó (se rellena al hacer click)
--    NULL = aún no ha autorizado
ALTER TABLE app_clients
  ADD COLUMN IF NOT EXISTS fideicomiso_authorized_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Índice para consultas rápidas (banner en dashboard)
CREATE INDEX IF NOT EXISTS idx_app_clients_fideicomiso
  ON app_clients (fideicomiso_enabled)
  WHERE fideicomiso_enabled = true;

-- ================================================================
-- COMENTARIOS DESCRIPTIVOS
-- ================================================================
COMMENT ON COLUMN app_clients.fideicomiso_enabled IS
  'Si true, la constructora tiene habilitado el servicio de fideicomiso con DH Consultores / HD Consultores. '
  'Solo clientes con este flag ven el widget de autorización en su dashboard de Kostruye+. '
  'Lo activa el admin de Kostruye+ manualmente al crear o editar la empresa.';

COMMENT ON COLUMN app_clients.fideicomiso_authorized_at IS
  'Timestamp de cuando la constructora hizo click en "Autorizar acceso a DH Consultores". '
  'NULL = aún no autorizó. Populated = autorización ya enviada a CORFID.';
