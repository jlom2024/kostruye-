import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function serverClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

async function getOrgId(supabase: ReturnType<typeof serverClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  return data?.organization_id ?? null;
}

export async function GET() {
  const supabase = serverClient();
  const orgId = await getOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data, error } = await supabase
    .from("organizations")
    .select("sunat_ruc, sunat_api_key, sunat_api_secret, sunat_configurado")
    .eq("id", orgId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const supabase = serverClient();
  const orgId = await getOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Only admin can update SUNAT credentials
  const { data: { user } } = await supabase.auth.getUser();
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user!.id)
    .eq("organization_id", orgId)
    .single();
  if (membership?.role !== "admin") {
    return NextResponse.json({ error: "Solo administradores pueden configurar SUNAT" }, { status: 403 });
  }

  const body = await req.json();
  const { sunat_ruc, sunat_api_key, sunat_api_secret } = body;

  const configured = !!(sunat_ruc?.trim() && sunat_api_key?.trim() && sunat_api_secret?.trim());

  const { error } = await supabase
    .from("organizations")
    .update({
      sunat_ruc: sunat_ruc?.trim() ?? null,
      sunat_api_key: sunat_api_key?.trim() ?? null,
      sunat_api_secret: sunat_api_secret?.trim() ?? null,
      sunat_configurado: configured,
    })
    .eq("id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, sunat_configurado: configured });
}
