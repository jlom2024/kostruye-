-- ================================================================
-- Konstruye+ — Migración 017 (hardening de 016)
-- Corrige advisories de seguridad introducidos por 016:
--  • RLS en capeco_units y role_module_permissions (ERROR)
--  • search_path fijo en funciones nuevas (WARN)
--  • REVOKE EXECUTE a anon en SECURITY DEFINER (WARN)
-- 2026-06-16 | KREO IA Studio
-- ================================================================

-- ── 1. RLS en tablas de referencia nuevas ────────────────────────
ALTER TABLE capeco_units            ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_module_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can read capeco units" ON capeco_units;
CREATE POLICY "authenticated can read capeco units"
  ON capeco_units FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authenticated can read role permissions" ON role_module_permissions;
CREATE POLICY "authenticated can read role permissions"
  ON role_module_permissions FOR SELECT USING (auth.uid() IS NOT NULL);

-- ── 2. Fijar search_path en funciones nuevas (anti-hijack) ───────
ALTER FUNCTION fn_recalc_item_from_apu(UUID)                          SET search_path = public, pg_temp;
ALTER FUNCTION fn_recalc_chapter_total(UUID)                          SET search_path = public, pg_temp;
ALTER FUNCTION fn_recalc_budget_total(UUID)                           SET search_path = public, pg_temp;
ALTER FUNCTION fn_apu_rollup()                                        SET search_path = public, pg_temp;
ALTER FUNCTION fn_item_rollup()                                       SET search_path = public, pg_temp;
ALTER FUNCTION fn_check_reajuste_coeff()                              SET search_path = public, pg_temp;
ALTER FUNCTION fn_calc_factor_k(UUID,INTEGER,INTEGER,INTEGER,INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION fn_user_can(UUID,UUID,TEXT,TEXT)                       SET search_path = public, pg_temp;
ALTER FUNCTION fn_audit()                                            SET search_path = public, pg_temp;

-- ── 3. Revocar EXECUTE a anon en funciones SECURITY DEFINER ──────
REVOKE ALL     ON FUNCTION fn_audit()                                            FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION fn_user_can(UUID,UUID,TEXT,TEXT)                       FROM anon;
GRANT  EXECUTE ON FUNCTION fn_user_can(UUID,UUID,TEXT,TEXT)                       TO authenticated;
REVOKE EXECUTE ON FUNCTION fn_calc_factor_k(UUID,INTEGER,INTEGER,INTEGER,INTEGER) FROM anon;
GRANT  EXECUTE ON FUNCTION fn_calc_factor_k(UUID,INTEGER,INTEGER,INTEGER,INTEGER) TO authenticated;
