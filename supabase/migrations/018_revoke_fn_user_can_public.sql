-- ================================================================
-- Konstruye+ — Migración 018
-- Postgres otorga EXECUTE a PUBLIC por defecto; revocar de PUBLIC
-- para que anon realmente no pueda invocar fn_user_can vía RPC.
-- 2026-06-16 | KREO IA Studio
-- ================================================================

REVOKE EXECUTE ON FUNCTION fn_user_can(UUID,UUID,TEXT,TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION fn_user_can(UUID,UUID,TEXT,TEXT) TO authenticated;
