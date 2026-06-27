import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

async function handleInstagram(code: string, orgId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const appId = process.env.INSTAGRAM_APP_ID!
  const appSecret = process.env.INSTAGRAM_APP_SECRET!
  const redirectUri = `${APP_URL}/api/social/callback/instagram`

  // Exchange code for short-lived token
  const tokenRes = await fetch('https://graph.facebook.com/v18.0/oauth/access_token?' + new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  }))
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) throw new Error('Token inválido de Facebook')

  // Exchange for long-lived token (60 days)
  const llRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?` + new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: tokenData.access_token,
  }))
  const llData = await llRes.json()
  const longToken = llData.access_token ?? tokenData.access_token

  // Get Facebook pages
  const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${longToken}`)
  const pagesData = await pagesRes.json()
  const pages: Array<{ id: string; name: string; access_token: string }> = pagesData.data ?? []

  let savedCount = 0
  for (const page of pages) {
    // Get Instagram Business Account connected to this page
    const igRes = await fetch(
      `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
    )
    const igData = await igRes.json()
    const igAccountId = igData.instagram_business_account?.id
    if (!igAccountId) continue

    // Get IG account details
    const igDetailRes = await fetch(
      `https://graph.facebook.com/v18.0/${igAccountId}?fields=username,followers_count,profile_picture_url&access_token=${page.access_token}`
    )
    const igDetail = await igDetailRes.json()

    await supabase.from('social_accounts').upsert({
      org_id: orgId,
      network: 'instagram',
      account_id: igAccountId,
      username: igDetail.username ?? igAccountId,
      access_token: page.access_token,
      profile_url: igDetail.profile_picture_url ?? null,
      followers: igDetail.followers_count ?? 0,
      token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'brand_id,network,account_id', ignoreDuplicates: false })

    savedCount++
  }

  return savedCount
}

async function handleFacebook(code: string, orgId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const appId = process.env.FACEBOOK_APP_ID!
  const appSecret = process.env.FACEBOOK_APP_SECRET!
  const redirectUri = `${APP_URL}/api/social/callback/facebook`

  const tokenRes = await fetch('https://graph.facebook.com/v18.0/oauth/access_token?' + new URLSearchParams({
    client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code,
  }))
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) throw new Error('Token inválido')

  const llRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?` + new URLSearchParams({
    grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret,
    fb_exchange_token: tokenData.access_token,
  }))
  const llData = await llRes.json()
  const longToken = llData.access_token ?? tokenData.access_token

  const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${longToken}`)
  const pagesData = await pagesRes.json()
  const pages: Array<{ id: string; name: string; access_token: string }> = pagesData.data ?? []

  for (const page of pages) {
    await supabase.from('social_accounts').upsert({
      org_id: orgId, network: 'facebook', account_id: page.id,
      username: page.name, access_token: page.access_token,
      token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'brand_id,network,account_id', ignoreDuplicates: false })
  }

  return pages.length
}

async function handleLinkedin(code: string, orgId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code', code,
      redirect_uri: `${APP_URL}/api/social/callback/linkedin`,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) throw new Error('Token inválido de LinkedIn')

  const profileRes = await fetch('https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const profile = await profileRes.json()

  await supabase.from('social_accounts').upsert({
    org_id: orgId, network: 'linkedin', account_id: profile.id,
    username: `${profile.localizedFirstName} ${profile.localizedLastName}`,
    access_token: tokenData.access_token,
    token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
  }, { onConflict: 'brand_id,network,account_id', ignoreDuplicates: false })

  return 1
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ network: string }> }
) {
  const { network } = await params
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${APP_URL}/settings?error=${error}&network=${network}`)
  }
  if (!code) {
    return NextResponse.redirect(`${APP_URL}/settings?error=missing_code&network=${network}`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${APP_URL}/login`)

  const { data: member } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return NextResponse.redirect(`${APP_URL}/settings?error=no_org`)

  try {
    let count = 0
    if (network === 'instagram') count = await handleInstagram(code, member.org_id, supabase)
    else if (network === 'facebook') count = await handleFacebook(code, member.org_id, supabase)
    else if (network === 'linkedin') count = await handleLinkedin(code, member.org_id, supabase)
    else return NextResponse.redirect(`${APP_URL}/settings?error=unsupported&network=${network}`)

    return NextResponse.redirect(`${APP_URL}/settings?connected=${network}&accounts=${count}`)
  } catch (err) {
    console.error(`Error conectando ${network}:`, err)
    return NextResponse.redirect(`${APP_URL}/settings?error=callback_failed&network=${network}`)
  }
}
