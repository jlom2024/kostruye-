import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SUNAT_URL = process.env.KREO_SUNAT_URL ?? "http://2.24.72.21:3020";

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

// GET /api/invoices/[id] — refresh status from KREO-SUNAT
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = serverClient();
  const orgId = await getOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: invoice } = await supabase
    .from("electronic_invoices")
    .select("*")
    .eq("id", params.id)
    .eq("organization_id", orgId)
    .single();

  if (!invoice) return NextResponse.json({ error: "Comprobante no encontrado" }, { status: 404 });

  // If already terminal state, return as-is
  if (["aceptado", "rechazado", "anulado"].includes(invoice.estado_sunat)) {
    return NextResponse.json(invoice);
  }

  // If no SUNAT id yet, can't refresh
  if (!invoice.sunat_comprobante_id) return NextResponse.json(invoice);

  const { data: org } = await supabase
    .from("organizations")
    .select("sunat_api_key, sunat_api_secret")
    .eq("id", orgId)
    .single();

  if (!org?.sunat_api_key) return NextResponse.json(invoice);

  try {
    // Get JWT
    const loginRes = await fetch(`${SUNAT_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: org.sunat_api_key, api_secret: org.sunat_api_secret }),
      signal: AbortSignal.timeout(8000),
    });
    const { token } = await loginRes.json();

    const statusRes = await fetch(
      `${SUNAT_URL}/api/emisiones/${invoice.sunat_comprobante_id}`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
    );

    if (statusRes.ok) {
      const s = await statusRes.json();
      const { data: updated } = await supabase
        .from("electronic_invoices")
        .update({
          estado_sunat: s.estado ?? invoice.estado_sunat,
          sunat_cdr_codigo: s.cdr_codigo ?? invoice.sunat_cdr_codigo,
          sunat_cdr_descripcion: s.cdr_descripcion ?? invoice.sunat_cdr_descripcion,
        })
        .eq("id", params.id)
        .select()
        .single();
      return NextResponse.json(updated ?? invoice);
    }
  } catch {
    // Return current state if refresh fails
  }

  return NextResponse.json(invoice);
}

// DELETE /api/invoices/[id] — anular comprobante
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const supabase = serverClient();
  const orgId = await getOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: invoice } = await supabase
    .from("electronic_invoices")
    .select("*")
    .eq("id", params.id)
    .eq("organization_id", orgId)
    .single();

  if (!invoice) return NextResponse.json({ error: "Comprobante no encontrado" }, { status: 404 });
  if (invoice.estado_sunat === "anulado") {
    return NextResponse.json({ error: "Ya está anulado" }, { status: 400 });
  }

  // If it has a SUNAT id, try to void it
  if (invoice.sunat_comprobante_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("sunat_api_key, sunat_api_secret")
      .eq("id", orgId)
      .single();

    if (org?.sunat_api_key) {
      try {
        const loginRes = await fetch(`${SUNAT_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: org.sunat_api_key, api_secret: org.sunat_api_secret }),
          signal: AbortSignal.timeout(8000),
        });
        const { token } = await loginRes.json();

        await fetch(`${SUNAT_URL}/api/emisiones/${invoice.sunat_comprobante_id}/anular`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        // Continue with local annulment even if SUNAT call fails
      }
    }
  }

  const { error } = await supabase
    .from("electronic_invoices")
    .update({ estado_sunat: "anulado" })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
