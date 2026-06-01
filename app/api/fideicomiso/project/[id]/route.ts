import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const sb = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

// ── GET /api/fideicomiso/project/[id] ───────────────────────────────────────
// Devuelve el estado de fideicomiso para una obra específica.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ companyEnabled: false });

    const svc = sb();

    // Obtener membresías (puede ser > 1 fila)
    const { data: memberships } = await svc
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1);
    const membership = memberships?.[0] ?? null;
    if (!membership) return NextResponse.json({ companyEnabled: false });

    // Verificar feature flag de la empresa
    const { data: appClient } = await svc
      .from("app_clients")
      .select("fideicomiso_enabled")
      .eq("organization_id", membership.organization_id)
      .single();

    if (!appClient?.fideicomiso_enabled) {
      return NextResponse.json({ companyEnabled: false });
    }

    // Estado del proyecto
    const { data: project } = await svc
      .from("projects")
      .select("id, fideicomiso_enabled, fideicomiso_authorized_at, fideicomiso_ruc")
      .eq("id", projectId)
      .eq("organization_id", membership.organization_id)
      .single();

    if (!project) return NextResponse.json({ companyEnabled: false });

    return NextResponse.json({
      companyEnabled: true,
      enabled: project.fideicomiso_enabled ?? false,
      authorized: !!project.fideicomiso_authorized_at,
      authorizedAt: project.fideicomiso_authorized_at ?? null,
    });
  } catch (err) {
    console.error("[fideicomiso/project/GET]", err);
    return NextResponse.json({ companyEnabled: false });
  }
}

// ── POST /api/fideicomiso/project/[id] ──────────────────────────────────────
// Vincula esta obra al fideicomiso de DH Consultores.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { ruc, phone } = await req.json().catch(() => ({}));

    if (!ruc || String(ruc).length < 8) {
      return NextResponse.json({ error: "RUC inválido" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const svc = sb();

    // Membresía
    const { data: memberships } = await svc
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1);
    const membership = memberships?.[0] ?? null;
    if (!membership) return NextResponse.json({ error: "Sin organización" }, { status: 403 });

    // App client (feature gate + datos para webhook)
    const { data: appClient } = await svc
      .from("app_clients")
      .select("id, name, slug, fideicomiso_enabled, contact_email")
      .eq("organization_id", membership.organization_id)
      .single();

    if (!appClient?.fideicomiso_enabled) {
      return NextResponse.json({ error: "Servicio de fideicomiso no habilitado" }, { status: 403 });
    }

    // Proyecto (verificar que pertenece a la org)
    const { data: project } = await svc
      .from("projects")
      .select("id, name, code, fideicomiso_authorized_at")
      .eq("id", projectId)
      .eq("organization_id", membership.organization_id)
      .single();

    if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

    // Evitar doble envío
    if (project.fideicomiso_authorized_at) {
      return NextResponse.json({ alreadySent: true });
    }

    // Llamar webhook DH-CORFID
    const corfidUrl = process.env.CORFID_API_URL ?? "https://corfid.dhconsultores.site";
    const corfidTenantSlug = process.env.CORFID_TENANT_SLUG ?? "hd-consultores";
    const webhookSecret = process.env.CORFID_WEBHOOK_SECRET ?? "";

    const webhookPayload = {
      clientSlug: appClient.slug,
      clientRuc: String(ruc),
      clientBusinessName: appClient.name,
      clientEmail: appClient.contact_email,
      clientPhone: phone ?? null,
      projectId,
      projectCode: project.code,
      projectName: project.name,
      requestedAt: new Date().toISOString(),
      webhookSecret,
      fideicomisoEnabled: true,
      konstruyeTenantSlug: appClient.slug,
    };

    let corfidOk = false;
    try {
      const res = await fetch(
        `${corfidUrl}/api/v1/authorizations/webhook/${corfidTenantSlug}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload),
        }
      );
      corfidOk = res.ok;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("[fideicomiso/project/POST] CORFID error:", err);
      }
    } catch (err) {
      console.error("[fideicomiso/project/POST] CORFID unreachable:", err);
    }

    // Actualizar proyecto — marcamos solicitud enviada.
    // fideicomiso_authorized_at se establece solo cuando DH Consultores
    // activa el trust (callback desde /api/fideicomiso/project/[id]/confirm)
    await svc
      .from("projects")
      .update({
        fideicomiso_enabled: true,
        fideicomiso_ruc: String(ruc),
        fideicomiso_authorized_at: null, // null hasta activación real por DH Consultores
      })
      .eq("id", projectId);

    return NextResponse.json({
      ok: true,
      corfidOk,
      message: corfidOk
        ? "Autorización enviada. DH Consultores se contactará para formalizar el fideicomiso."
        : "Solicitud registrada. Contacta a tu asesor de DH Consultores para confirmar.",
    });
  } catch (err) {
    console.error("[fideicomiso/project/POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
