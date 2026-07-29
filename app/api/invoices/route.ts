import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { userCan } from "@/lib/permissions";

const SUNAT_URL = process.env.KREO_SUNAT_URL ?? "http://2.24.72.21:3020";

// In-process JWT cache per org: { token, expiresAt }
const jwtCache = new Map<string, { token: string; expiresAt: number }>();

async function getSunatJwt(apiKey: string, apiSecret: string): Promise<string> {
  const cacheKey = apiKey;
  const cached = jwtCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const res = await fetch(`${SUNAT_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, api_secret: apiSecret }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Error autenticando con KREO-SUNAT");
  }
  const { token } = await res.json();
  jwtCache.set(cacheKey, { token, expiresAt: Date.now() + 55 * 60_000 });
  return token;
}

async function serverClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

async function getContext(supabase: ReturnType<typeof serverClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  if (!membership) return null;
  return { user, orgId: membership.organization_id };
}

// GET /api/invoices?project_id=xxx
export async function GET(req: Request) {
  const supabase = await serverClient();
  const ctx = await getContext(supabase);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!(await userCan(supabase, ctx.orgId, "contabilidad", "view"))) {
    return NextResponse.json({ error: "Requiere permisos de contabilidad" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");

  let query = supabase
    .from("electronic_invoices")
    .select("*")
    .eq("organization_id", ctx.orgId)
    .order("created_at", { ascending: false });

  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/invoices — emit invoice via KREO-SUNAT
export async function POST(req: Request) {
  const supabase = await serverClient();
  const ctx = await getContext(supabase);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!(await userCan(supabase, ctx.orgId, "contabilidad", "edit"))) {
    return NextResponse.json({ error: "Requiere permisos de contabilidad para emitir facturas" }, { status: 403 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("sunat_ruc, sunat_api_key, sunat_api_secret, sunat_configurado")
    .eq("id", ctx.orgId)
    .single();

  if (!org?.sunat_configurado || !org.sunat_api_key || !org.sunat_api_secret) {
    return NextResponse.json(
      { error: "Configura tus credenciales SUNAT en Configuración → SUNAT antes de emitir." },
      { status: 400 }
    );
  }

  const body = await req.json();
  const {
    project_id,
    comprobante_tipo,    // "01" factura, "03" boleta
    serie,
    numero,
    receptor_tipo_doc,
    receptor_num_doc,
    receptor_razon_social,
    items,               // [{ descripcion, cantidad, precio_unitario, igv_aplica }]
    moneda = "PEN",
    fecha_emision,
  } = body;

  // Calculate totals
  const subtotal = items.reduce((s: number, i: { cantidad: number; precio_unitario: number }) =>
    s + i.cantidad * i.precio_unitario, 0);
  const igv = Math.round(subtotal * 0.18 * 100) / 100;
  const total = Math.round((subtotal + igv) * 100) / 100;

  // Create pending record first
  const { data: invoice, error: insertErr } = await supabase
    .from("electronic_invoices")
    .insert({
      organization_id: ctx.orgId,
      project_id: project_id ?? null,
      comprobante_tipo,
      serie,
      numero,
      receptor_tipo_doc: receptor_tipo_doc ?? "6",
      receptor_num_doc,
      receptor_razon_social,
      subtotal,
      igv,
      total,
      moneda,
      fecha_emision: fecha_emision ?? new Date().toISOString().slice(0, 10),
      estado_sunat: "pendiente",
    })
    .select()
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Emit via KREO-SUNAT
  try {
    const jwt = await getSunatJwt(org.sunat_api_key, org.sunat_api_secret);

    const sunatRes = await fetch(`${SUNAT_URL}/api/emisiones`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        ruc_emisor: org.sunat_ruc,
        tipo_comprobante: comprobante_tipo,
        serie,
        numero,
        fecha_emision: fecha_emision ?? new Date().toISOString().slice(0, 10),
        moneda,
        receptor: {
          tipo_doc: receptor_tipo_doc ?? "6",
          num_doc: receptor_num_doc,
          razon_social: receptor_razon_social,
        },
        items: items.map((i: {
          descripcion: string; cantidad: number;
          precio_unitario: number; igv_aplica?: boolean
        }) => ({
          descripcion: i.descripcion,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          igv_aplica: i.igv_aplica !== false,
        })),
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const sunatData = await sunatRes.json().catch(() => ({}));

    if (!sunatRes.ok) {
      await supabase.from("electronic_invoices").update({
        estado_sunat: "rechazado",
        sunat_cdr_descripcion: sunatData.message ?? "Error al emitir",
      }).eq("id", invoice.id);
      return NextResponse.json({ error: sunatData.message ?? "Error SUNAT", invoice }, { status: 422 });
    }

    // Update with SUNAT response
    const { data: updated } = await supabase
      .from("electronic_invoices")
      .update({
        estado_sunat: sunatData.estado ?? "enviado",
        sunat_comprobante_id: sunatData.id ?? null,
        sunat_cdr_codigo: sunatData.cdr_codigo ?? null,
        sunat_cdr_descripcion: sunatData.cdr_descripcion ?? null,
      })
      .eq("id", invoice.id)
      .select()
      .single();

    return NextResponse.json(updated ?? invoice, { status: 201 });
  } catch (e) {
    // Don't delete — keep as "pendiente" for retry
    await supabase.from("electronic_invoices").update({
      estado_sunat: "pendiente",
      sunat_cdr_descripcion: (e as Error).message,
    }).eq("id", invoice.id);

    return NextResponse.json(
      { error: "No se pudo conectar con KREO-SUNAT. El comprobante quedó pendiente.", invoice },
      { status: 503 }
    );
  }
}
