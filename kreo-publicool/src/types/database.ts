export type UserRole = 'admin' | 'manager' | 'viewer'
export type SocialNetwork = 'instagram' | 'facebook' | 'tiktok' | 'linkedin' | 'twitter'
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'scheduled'
export type PostStatus = 'draft' | 'approved' | 'scheduled' | 'published' | 'failed'
export type ContentFormat = 'image' | 'flyer' | 'video' | 'carousel' | 'story' | 'reel'
export type CampaignObjective = 'awareness' | 'engagement' | 'traffic' | 'leads' | 'sales' | 'conversions'

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  plan: 'free' | 'starter' | 'pro' | 'agency'
  created_at: string
}

export interface OrganizationMember {
  id: string
  org_id: string
  user_id: string
  role: UserRole
  created_at: string
}

export interface Brand {
  id: string
  org_id: string
  name: string
  logo_url: string | null
  colors: string[] | null
  tone: string | null
  industry: string | null
  website: string | null
  created_at: string
}

export interface SocialAccount {
  id: string
  brand_id: string
  org_id: string
  network: SocialNetwork
  account_id: string
  username: string
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
  profile_url: string | null
  followers: number | null
  connected_at: string
}

export interface Campaign {
  id: string
  brand_id: string
  org_id: string
  name: string
  objective: CampaignObjective
  status: CampaignStatus
  networks: SocialNetwork[]
  start_date: string | null
  end_date: string | null
  budget: number | null
  currency: string
  frequency_per_week: number | null
  target_audience: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface ContentVariant {
  id: string
  campaign_id: string
  network: SocialNetwork
  format: ContentFormat
  copy: string
  hook: string | null
  cta: string | null
  hashtags: string[]
  media_url: string | null
  media_type: 'image' | 'video' | null
  ai_generated: boolean
  created_at: string
}

export interface Post {
  id: string
  campaign_id: string
  brand_id: string
  social_account_id: string
  content_variant_id: string | null
  network: SocialNetwork
  format: ContentFormat
  copy: string
  hashtags: string[]
  media_url: string | null
  status: PostStatus
  scheduled_at: string | null
  published_at: string | null
  platform_post_id: string | null
  error_message: string | null
  created_at: string
}

export interface PostMetrics {
  id: string
  post_id: string
  reach: number
  impressions: number
  likes: number
  comments: number
  shares: number
  saves: number
  clicks: number
  ctr: number
  conversions: number
  recorded_at: string
}

export interface CampaignMetrics {
  id: string
  campaign_id: string
  date: string
  total_reach: number
  total_impressions: number
  total_engagement: number
  total_clicks: number
  total_conversions: number
  total_leads: number
  spend: number
}

export interface Lead {
  id: string
  campaign_id: string
  brand_id: string
  org_id: string
  name: string | null
  email: string | null
  phone: string | null
  source: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  data: Record<string, unknown>
  created_at: string
}

export interface LeadForm {
  id: string
  campaign_id: string
  brand_id: string
  org_id: string
  name: string
  fields: LeadFormField[]
  slug: string
  active: boolean
  created_at: string
}

export interface LeadFormField {
  name: string
  label: string
  type: 'text' | 'email' | 'phone' | 'select' | 'textarea'
  required: boolean
  options?: string[]
}

export interface Competitor {
  id: string
  brand_id: string
  org_id: string
  name: string
  network: SocialNetwork
  username: string
  profile_url: string | null
  created_at: string
}
