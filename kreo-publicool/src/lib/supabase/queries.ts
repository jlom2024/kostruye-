import { createClient, createServiceClient } from './server'
import { slugify } from '@/lib/utils'
import type { User } from '@supabase/supabase-js'
import type { Organization } from '@/types/database'

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

const MEMBER_SELECT = 'org_id, role, organizations(id, name, slug, plan, logo_url)'

/**
 * Creates an organization + admin membership for a user that doesn't have one
 * yet. Mirrors the bootstrap in /auth/callback so that signing in by
 * email/password (which never hits the callback) still lands on the dashboard
 * instead of looping back to /login. Idempotent: no-op if a membership exists.
 */
async function ensureOrgForUser(user: User) {
  const service = await createServiceClient()

  const { data: existing } = await service
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (existing) return

  const meta = user.user_metadata ?? {}
  const orgName =
    (meta.company as string) || (meta.full_name as string) || user.email?.split('@')[0] || 'Mi Empresa'
  let slug = slugify(orgName)

  const { data: slugClash } = await service
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (slugClash) slug = `${slug}-${Date.now()}`

  const { data: org } = await service
    .from('organizations')
    .insert({ name: orgName, slug })
    .select('id')
    .single()

  if (org) {
    await service.from('organization_members').insert({
      org_id: org.id,
      user_id: user.id,
      role: 'admin',
    })
  }
}

export async function getCurrentOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  let { data: member } = await supabase
    .from('organization_members')
    .select(MEMBER_SELECT)
    .eq('user_id', user.id)
    .maybeSingle()

  // First login without an org yet → create one on the fly
  if (!member) {
    await ensureOrgForUser(user)
    const retry = await supabase
      .from('organization_members')
      .select(MEMBER_SELECT)
      .eq('user_id', user.id)
      .maybeSingle()
    member = retry.data
  }

  if (!member) return null

  return {
    user,
    orgId: member.org_id as string,
    role: member.role as string,
    org: (member.organizations as unknown) as Organization,
  }
}

export async function getOrgStats(orgId: string) {
  const supabase = await createClient()

  const [campaignsRes, activeCampaignsRes, leadsRes, brandsRes] = await Promise.all([
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'active'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('brands').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
  ])

  return {
    totalCampaigns: campaignsRes.count ?? 0,
    activeCampaigns: activeCampaignsRes.count ?? 0,
    totalLeads: leadsRes.count ?? 0,
    totalBrands: brandsRes.count ?? 0,
  }
}

export async function getOrgCampaigns(orgId: string, status?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('campaigns')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data } = await query
  return data ?? []
}

export async function getOrgSocialAccounts(orgId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('org_id', orgId)
  return data ?? []
}
