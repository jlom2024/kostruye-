import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as sb } from "@supabase/supabase-js";

function svcClient() {
  return sb(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function getOrgId(userId: string) {
  const { data } = await svcClient().from("organization_members")
    .select("organization_id, role").eq("user_id", userId).limit(1);
  return data?.[0] ?? null;
}

// GET — estado de configuración SOL de la org
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getOrgId(user.id);
  if (!membership) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { data: org } = await svcClient().from("organizations")
    .select("sunat_empresa_id, sunat_configurado, sunat_api_key")
    .eq("id", membership.organization_id).single();

  return NextResponse.json({
    sunat_empresa_id: org?.sunat_empresa_id ?? null,
    sunat_configurado: org?.sunat_configurado ?? false,
    tiene_api_key:    !!org?.sunat_api_key,
  });
}

// POST — guardar credenciales SOL en kreo-sunat
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getOrgId(user.id);
  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "Solo admins pueden configurar credenciales SOL" }, { status: 403 });
  }

  const { sol_usuario, sol_clave } = await req.json();
  if (!sol_usuario || !sol_clave) {
    return NextResponse.json({ error: "sol_usuario y sol_clave requeridos" }, { status: 400 });
  }

  const { data: org } = await svcClient().from("organizations")
    .select("sunat_empresa_id, sunat_api_key, sunat_api_secret, name, ruc")
    .eq("id", membership.organization_id).single();

  const SUNAT_URL = process.env.SUNAT_SERVICE_URL || "http://kreo-sunat-sunat-nginx-1:80";

  if (!org?.sunat_api_key) {
    const regRes = await fetch(`${SUNAT_URL}/api/admin/empresas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-App-Key": process.env.SUNAT_APP_KEY! },
      body: JSON.stringify({
        ruc:           org?.ruc || "00000000000",
        razon_social:  org?.name || "Empresa",
        nombre_comercial: org?.name,
        direccion:     "Lima, Perú",
      }),
    });
    if (!regRes.ok) {
      const err = await regRes.json().catch(() => ({}));
      return NextResponse.json({ error: `Error registrando empresa: ${err.error || regRes.status}` }, { status: 500 });
    }
    const regData = await regRes.json();
    await svcClient().from("organizations").update({
      sunat_empresa_id: regData.id,
      sunat_api_key:    regData.api_key,
      sunat_api_secret: regData.api_secret,
    }).eq("id", membership.organization_id);
    org!.sunat_empresa_id = regData.id;
    org!.sunat_api_key    = regData.api_key;
    org!.sunat_api_secret = regData.api_secret;
  }

  const authRes = await fetch(`${SUNAT_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: org!.sunat_api_key, api_secret: org!.sunat_api_secret }),
  });
  if (!authRes.ok) {
    return NextResponse.json({ error: "Error autenticando con sistema de facturación" }, { status: 500 });
  }
  const { token } = await authRes.json();

  const solRes = await fetch(`${SUNAT_URL}/api/empresas/${org!.sunat_empresa_id}/credenciales-sol`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ sol_usuario: sol_usuario.trim().toUpperCase(), sol_clave: sol_clave.trim() }),
  });
  if (!solRes.ok) {
    const err = await solRes.json().catch(() => ({}));
    return NextResponse.json({ error: `Error SUNAT: ${err.error || solRes.status}` }, { status: 500 });
  }

  await svcClient().from("organizations")
    .update({ sunat_configurado: true })
    .eq("id", membership.organization_id);

  return NextResponse.json({ ok: true, message: "Credenciales SOL guardadas de forma segura" });
}
