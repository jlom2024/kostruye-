import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/fideicomiso/autorizar
 *
 * La constructora (ya autenticada en Kostruye+) hace click en
 * "Autorizar acceso a DH Consultores". Este endpoint:
 *  1. Verifica que el usuario tiene sesión activa
 *  2. Verifica que su app_client tiene fideicomiso_enabled = true
 *  3. Verifica que aún no ha autorizado (fideicomiso_authorized_at IS NULL)
 *  4. Llama al webhook de CORFID
 *  5. Registra el timestamp de autorización en Supabase
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // 1. Verificar sesión
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Obtener organización del usuario
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Sin organización asignada" }, { status: 403 });
  }

  // 3. Obtener app_client ligado a la organización (service role para leer app_clients)
  const sb = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: appClient } = await sb
    .from("app_clients")
    .select("id, name, slug, fideicomiso_enabled, fideicomiso_authorized_at, contact_email, contact_name")
    .eq("organization_id", membership.organization_id)
    .single();

  if (!appClient) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  // 4. Validar que tiene el servicio habilitado
  if (!appClient.fideicomiso_enabled) {
    return NextResponse.json(
      { error: "El servicio de fideicomiso no está habilitado para esta empresa. Contacta a tu asesor de DH Consultores." },
      { status: 403 }
    );
  }

  // 5. Validar que no autorizó ya
  if (appClient.fideicomiso_authorized_at) {
    return NextResponse.json(
      { error: "Ya enviaste la autorización anteriormente.", alreadySent: true },
      { status: 409 }
    );
  }

  // 6. Obtener datos de la organización para el RUC (de organization_members → profiles o de la tabla organizations)
  const body = await req.json().catch(() => ({}));
  const ruc: string = body.ruc ?? ""; // el cliente ingresa su RUC en el widget

  if (!ruc || ruc.length < 8) {
    return NextResponse.json({ error: "RUC inválido" }, { status: 400 });
  }

  // 7. Llamar al webhook de CORFID
  const corfidUrl = process.env.CORFID_API_URL ?? "http://localhost:3001";
  const corfidTenantSlug = process.env.CORFID_TENANT_SLUG ?? "hd-consultores";
  const webhookSecret = process.env.CORFID_WEBHOOK_SECRET ?? "";

  let corfidResponse: Response;
  try {
    corfidResponse = await fetch(
      `${corfidUrl}/api/v1/authorizations/webhook/${corfidTenantSlug}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientSlug: appClient.slug,
          clientRuc: ruc,
          clientBusinessName: appClient.name,
          clientEmail: appClient.contact_email,
          clientPhone: body.phone ?? null,
          requestedAt: new Date().toISOString(),
          webhookSecret,
          fideicomisoEnabled: true,
          konstruyeTenantSlug: appClient.slug,
        }),
      }
    );
  } catch (err) {
    console.error("Error llamando a CORFID:", err);
    return NextResponse.json(
      { error: "No se pudo conectar con el sistema de DH Consultores. Intenta nuevamente o contacta a tu asesor." },
      { status: 502 }
    );
  }

  if (!corfidResponse.ok) {
    const errData = await corfidResponse.json().catch(() => ({}));
    console.error("CORFID rechazó el webhook:", errData);
    return NextResponse.json(
      { error: errData.message ?? "Error al registrar la autorización en DH Consultores" },
      { status: corfidResponse.status }
    );
  }

  // 8. Registrar timestamp de autorización en Supabase
  await sb
    .from("app_clients")
    .update({ fideicomiso_authorized_at: new Date().toISOString() })
    .eq("id", appClient.id);

  return NextResponse.json({
    ok: true,
    message: "Autorización enviada correctamente. DH Consultores se contactará para formalizar el fideicomiso.",
  });
}
