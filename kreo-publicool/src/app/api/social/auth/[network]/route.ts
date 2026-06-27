import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const oauthConfigs: Record<string, { url: string; params: Record<string, string> }> = {
  instagram: {
    url: 'https://www.facebook.com/dialog/oauth',
    params: {
      client_id: process.env.INSTAGRAM_APP_ID ?? '',
      redirect_uri: `${APP_URL}/api/social/callback/instagram`,
      scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement',
      response_type: 'code',
    },
  },
  facebook: {
    url: 'https://www.facebook.com/dialog/oauth',
    params: {
      client_id: process.env.FACEBOOK_APP_ID ?? '',
      redirect_uri: `${APP_URL}/api/social/callback/facebook`,
      scope: 'pages_manage_posts,pages_show_list,pages_read_engagement,pages_manage_metadata',
      response_type: 'code',
    },
  },
  linkedin: {
    url: 'https://www.linkedin.com/oauth/v2/authorization',
    params: {
      response_type: 'code',
      client_id: process.env.LINKEDIN_CLIENT_ID ?? '',
      redirect_uri: `${APP_URL}/api/social/callback/linkedin`,
      scope: 'r_liteprofile r_emailaddress w_member_social',
    },
  },
  tiktok: {
    url: 'https://www.tiktok.com/auth/authorize/',
    params: {
      client_key: process.env.TIKTOK_CLIENT_KEY ?? '',
      redirect_uri: `${APP_URL}/api/social/callback/tiktok`,
      scope: 'user.info.basic,video.upload',
      response_type: 'code',
    },
  },
  twitter: {
    url: 'https://twitter.com/i/oauth2/authorize',
    params: {
      response_type: 'code',
      client_id: process.env.TWITTER_CLIENT_ID ?? '',
      redirect_uri: `${APP_URL}/api/social/callback/twitter`,
      scope: 'tweet.read tweet.write users.read offline.access',
      code_challenge: 'challenge',
      code_challenge_method: 'plain',
    },
  },
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ network: string }> }
) {
  const { network } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${APP_URL}/login`)

  const config = oauthConfigs[network]
  if (!config) {
    return NextResponse.json({ error: `Red social '${network}' no soportada` }, { status: 400 })
  }

  const envKey = network === 'instagram' ? 'INSTAGRAM_APP_ID'
    : network === 'facebook' ? 'FACEBOOK_APP_ID'
    : network === 'linkedin' ? 'LINKEDIN_CLIENT_ID'
    : network === 'tiktok' ? 'TIKTOK_CLIENT_KEY'
    : 'TWITTER_CLIENT_ID'

  if (!config.params[Object.keys(config.params)[0]]) {
    return NextResponse.redirect(
      `${APP_URL}/settings?error=missing_credentials&network=${network}&missing=${envKey}`
    )
  }

  const url = new URL(config.url)
  Object.entries(config.params).forEach(([k, v]) => url.searchParams.set(k, v))

  return NextResponse.redirect(url.toString())
}
