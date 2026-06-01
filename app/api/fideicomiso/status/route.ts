import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Verificar sesión con cliente anon (lee cookies)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ enabled: false });

    // Usar service client para bypasear RLS en ambas queries
    const sb = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Membership: service client bypasea RLS — usar limit(1) porque puede haber múltiples membresías
    const { data: memberships } = await sb
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1);
    const membership = memberships?.[0] ?? null;
    if (!membership) return NextResponse.json({ enabled: false });

    const { data: appClient, error } = await sb
      .from('app_clients')
      .select('fideicomiso_enabled, fideicomiso_authorized_at')
      .eq('organization_id', membership.organization_id)
      .single();

    if (error) console.error('[fideicomiso/status] app_clients error:', error);

    return NextResponse.json({
      enabled: appClient?.fideicomiso_enabled === true,
      authorized: !!appClient?.fideicomiso_authorized_at,
    });
  } catch (err) {
    console.error('[fideicomiso/status]', err);
    return NextResponse.json({ enabled: false });
  }
}
