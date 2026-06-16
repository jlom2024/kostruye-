import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  if (!membership) return NextResponse.json({ error: "Sin organización" }, { status: 401 });

  const { data: org } = await supabase
    .from("organizations")
    .select("sunat_ruc, sunat_api_key, sunat_api_secret")
    .eq("id", membership.organization_id)
    .single();

  if (!org?.sunat_api_key || !org?.sunat_api_secret) {
    return NextResponse.json({ error: "Credenciales SUNAT no configuradas" }, { status: 400 });
  }

  const sunatUrl = process.env.KREO_SUNAT_URL ?? "http://2.24.72.21:3020";

  try {
    const res = await fetch(`${sunatUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: org.sunat_api_key, api_secret: org.sunat_api_secret }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.message ?? "Credenciales inválidas" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, message: "Conexión verificada correctamente" });
  } catch (e) {
    return NextResponse.json(
      { error: "No se pudo conectar al microservicio SUNAT. Intenta más tarde." },
      { status: 503 }
    );
  }
}
