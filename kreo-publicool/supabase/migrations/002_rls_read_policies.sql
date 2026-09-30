-- ============================================================================
-- KREO-PubliCool — Migración 002: políticas RLS de LECTURA faltantes
-- ----------------------------------------------------------------------------
-- La migración 001 activó RLS en todas las tablas pero dejó varias SIN política
-- de SELECT. La más crítica: organization_members — sin ella el cliente
-- autenticado no puede leer su propia membresía, getCurrentOrg() devuelve null
-- y el dashboard rebota al login ("flash y de vuelta al login").
--
-- Ejecutar en: Supabase → SQL Editor (proyecto hfiwflvxogktwsqkitpl) → Run.
-- Idempotente (DROP POLICY IF EXISTS antes de cada CREATE).
-- ============================================================================

-- organization_members: cada usuario lee SUS propias membresías
DROP POLICY IF EXISTS "users read own memberships" ON organization_members;
CREATE POLICY "users read own memberships" ON organization_members
  FOR SELECT USING (user_id = auth.uid());

-- social_accounts: leer (miembros) / escribir (admin·manager)
DROP POLICY IF EXISTS "members read social_accounts" ON social_accounts;
CREATE POLICY "members read social_accounts" ON social_accounts
  FOR SELECT USING (fn_is_org_member(org_id));

DROP POLICY IF EXISTS "managers write social_accounts" ON social_accounts;
CREATE POLICY "managers write social_accounts" ON social_accounts
  FOR ALL USING (fn_has_role(org_id, ARRAY['admin','manager']::user_role[]));

-- content_variants: leer vía la campaña
DROP POLICY IF EXISTS "members read content_variants" ON content_variants;
CREATE POLICY "members read content_variants" ON content_variants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM campaigns c
            WHERE c.id = content_variants.campaign_id AND fn_is_org_member(c.org_id))
  );

-- post_metrics: leer vía post → campaña
DROP POLICY IF EXISTS "members read post_metrics" ON post_metrics;
CREATE POLICY "members read post_metrics" ON post_metrics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM posts p
            JOIN campaigns c ON c.id = p.campaign_id
            WHERE p.id = post_metrics.post_id AND fn_is_org_member(c.org_id))
  );

-- campaign_metrics: leer vía la campaña
DROP POLICY IF EXISTS "members read campaign_metrics" ON campaign_metrics;
CREATE POLICY "members read campaign_metrics" ON campaign_metrics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM campaigns c
            WHERE c.id = campaign_metrics.campaign_id AND fn_is_org_member(c.org_id))
  );

-- lead_forms: leer (miembros)
DROP POLICY IF EXISTS "members read lead_forms" ON lead_forms;
CREATE POLICY "members read lead_forms" ON lead_forms
  FOR SELECT USING (fn_is_org_member(org_id));

-- competitors: leer (miembros)
DROP POLICY IF EXISTS "members read competitors" ON competitors;
CREATE POLICY "members read competitors" ON competitors
  FOR SELECT USING (fn_is_org_member(org_id));
