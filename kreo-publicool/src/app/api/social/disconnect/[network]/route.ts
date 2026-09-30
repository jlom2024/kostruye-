import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ network: string }> }
) {
  const { network } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: member } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'Sin organización' }, { status: 400 })

  const { error } = await supabase
    .from('social_accounts')
    .delete()
    .eq('org_id', member.org_id)
    .eq('network', network)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
