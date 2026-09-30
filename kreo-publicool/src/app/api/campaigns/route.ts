import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  objective: z.enum(['awareness', 'engagement', 'traffic', 'leads', 'sales', 'conversions']),
  networks: z.array(z.enum(['instagram', 'facebook', 'tiktok', 'linkedin', 'twitter'])).min(1),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  frequency_per_week: z.number().min(1).max(14).default(3),
  budget: z.number().optional().nullable(),
  target_audience: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: member } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'Sin organización' }, { status: 400 })

  const body = await req.json()
  const input = schema.parse(body)

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      org_id: member.org_id,
      created_by: user.id,
      name: input.name,
      objective: input.objective,
      networks: input.networks,
      status: 'draft',
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      frequency_per_week: input.frequency_per_week,
      budget: input.budget || null,
      target_audience: input.target_audience || null,
      notes: input.notes || null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creando campaña:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: member } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return NextResponse.json({ campaigns: [] })

  const { data } = await supabase
    .from('campaigns')
    .select('*')
    .eq('org_id', member.org_id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ campaigns: data ?? [] })
}
