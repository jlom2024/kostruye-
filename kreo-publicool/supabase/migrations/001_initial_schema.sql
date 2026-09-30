-- KREO-PubliCool — Schema inicial
-- Migración 001: Schema base completo

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'viewer');
CREATE TYPE social_network AS ENUM ('instagram', 'facebook', 'tiktok', 'linkedin', 'twitter');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'scheduled');
CREATE TYPE post_status AS ENUM ('draft', 'approved', 'scheduled', 'published', 'failed');
CREATE TYPE content_format AS ENUM ('image', 'flyer', 'video', 'carousel', 'story', 'reel');
CREATE TYPE campaign_objective AS ENUM ('awareness', 'engagement', 'traffic', 'leads', 'sales', 'conversions');
CREATE TYPE org_plan AS ENUM ('free', 'starter', 'pro', 'agency');

-- Organizations (multi-tenant root)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  plan org_plan DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization members
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- Brands (marcas gestionadas)
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  colors TEXT[],
  tone TEXT,
  industry TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social accounts (conexiones OAuth)
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  network social_network NOT NULL,
  account_id TEXT NOT NULL,
  username TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  profile_url TEXT,
  followers INTEGER DEFAULT 0,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, network, account_id)
);

-- Campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  objective campaign_objective NOT NULL,
  status campaign_status DEFAULT 'draft',
  networks social_network[] DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  budget NUMERIC(12,2),
  currency TEXT DEFAULT 'USD',
  frequency_per_week INTEGER DEFAULT 3,
  target_audience TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content variants (copies generados por IA)
CREATE TABLE content_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  network social_network NOT NULL,
  format content_format NOT NULL,
  copy TEXT NOT NULL,
  hook TEXT,
  cta TEXT,
  hashtags TEXT[] DEFAULT '{}',
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video')),
  ai_generated BOOLEAN DEFAULT true,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts (publicaciones programadas/publicadas)
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  social_account_id UUID REFERENCES social_accounts(id),
  content_variant_id UUID REFERENCES content_variants(id),
  network social_network NOT NULL,
  format content_format NOT NULL,
  copy TEXT NOT NULL,
  hashtags TEXT[] DEFAULT '{}',
  media_url TEXT,
  status post_status DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  platform_post_id TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post metrics (analítica por publicación)
CREATE TABLE post_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr NUMERIC(5,4) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign metrics (analítica agregada diaria)
CREATE TABLE campaign_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_reach INTEGER DEFAULT 0,
  total_impressions INTEGER DEFAULT 0,
  total_engagement INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_leads INTEGER DEFAULT 0,
  spend NUMERIC(12,2) DEFAULT 0,
  UNIQUE(campaign_id, date)
);

-- Lead forms
CREATE TABLE lead_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]',
  slug TEXT UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads capturados
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  lead_form_id UUID REFERENCES lead_forms(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  source TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitors (benchmark)
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  network social_network NOT NULL,
  username TEXT NOT NULL,
  profile_url TEXT,
  followers INTEGER,
  avg_engagement NUMERIC(5,4),
  last_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_brands_org ON brands(org_id);
CREATE INDEX idx_campaigns_brand ON campaigns(brand_id);
CREATE INDEX idx_campaigns_org ON campaigns(org_id);
CREATE INDEX idx_posts_campaign ON posts(campaign_id);
CREATE INDEX idx_posts_scheduled ON posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_leads_campaign ON leads(campaign_id);
CREATE INDEX idx_leads_org ON leads(org_id);
CREATE INDEX idx_post_metrics_post ON post_metrics(post_id);
CREATE INDEX idx_campaign_metrics_campaign_date ON campaign_metrics(campaign_id, date);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper: es miembro de la org?
CREATE OR REPLACE FUNCTION fn_is_org_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = p_org_id AND user_id = auth.uid()
  );
$$;

-- Helper: tiene rol?
CREATE OR REPLACE FUNCTION fn_has_role(p_org_id UUID, p_roles user_role[])
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = p_org_id AND user_id = auth.uid() AND role = ANY(p_roles)
  );
$$;

-- RLS Policies — Organizations
CREATE POLICY "members can read org" ON organizations
  FOR SELECT USING (fn_is_org_member(id));

CREATE POLICY "admins can update org" ON organizations
  FOR UPDATE USING (fn_has_role(id, ARRAY['admin']::user_role[]));

-- RLS Policies — Brands
CREATE POLICY "members can read brands" ON brands
  FOR SELECT USING (fn_is_org_member(org_id));

CREATE POLICY "admins and managers can write brands" ON brands
  FOR ALL USING (fn_has_role(org_id, ARRAY['admin','manager']::user_role[]));

-- RLS Policies — Campaigns
CREATE POLICY "members can read campaigns" ON campaigns
  FOR SELECT USING (fn_is_org_member(org_id));

CREATE POLICY "admins and managers can write campaigns" ON campaigns
  FOR ALL USING (fn_has_role(org_id, ARRAY['admin','manager']::user_role[]));

-- RLS Policies — Posts
CREATE POLICY "members can read posts" ON posts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM campaigns c WHERE c.id = posts.campaign_id AND fn_is_org_member(c.org_id))
  );

CREATE POLICY "managers can write posts" ON posts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM campaigns c WHERE c.id = posts.campaign_id AND fn_has_role(c.org_id, ARRAY['admin','manager']::user_role[]))
  );

-- RLS Policies — Leads
CREATE POLICY "members can read leads" ON leads
  FOR SELECT USING (fn_is_org_member(org_id));

CREATE POLICY "service role can insert leads" ON leads
  FOR INSERT WITH CHECK (true);

-- RLS Policies — Audit logs
CREATE POLICY "members can read audit" ON audit_logs
  FOR SELECT USING (fn_is_org_member(org_id));
