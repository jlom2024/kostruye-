import { createClient } from './server'
import type { Organization } from '@/types/database'

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCurrentOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member } = await supabase
    .from('organization_members')
    .select('org_id, role, organizations(id, name, slug, plan, logo_url)')
    .eq('user_id', user.id)
    .single()

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
