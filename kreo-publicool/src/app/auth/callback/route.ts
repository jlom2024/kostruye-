import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // Get the newly authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  // Create org if user doesn't have one yet
  const service = await createServiceClient()
  const { data: existing } = await service
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!existing) {
    const meta = user.user_metadata ?? {}
    const orgName = (meta.company as string) || (meta.full_name as string) || user.email?.split('@')[0] || 'Mi Empresa'
    let slug = slugify(orgName)

    // Ensure slug uniqueness
    const { data: slugCheck } = await service
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()

    if (slugCheck) {
      slug = `${slug}-${Date.now()}`
    }

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

  return NextResponse.redirect(`${origin}${next}`)
}
