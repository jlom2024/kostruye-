import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const sb = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

/**
 * POST /api/fideicomiso/project/[id]/confirm
 *
 * Callback desde DH-CORFID cuando el fideicomiso de una obra es activado
 * (después de firma de contrato). Actualiza fideicomiso_authorized_at en la obra.
 *
 * Body: { webhookSecret: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { webhookSecret } = await req.json().catch(() => ({}));

    // Validar secret
    const expectedSecret = process.env.CORFID_WEBHOOK_SECRET ?? "";
    if (!expectedSecret || webhookSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const svc = sb();

    // Actualizar proyecto — marcar como autorizado
    const { error } = await svc
      .from("projects")
      .update({ fideicomiso_authorized_at: new Date().toISOString() })
      .eq("id", projectId);

    if (error) {
      console.error("[fideicomiso/confirm] Supabase error:", error);
      return NextResponse.json({ error: "Error al actualizar proyecto" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, projectId, confirmedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[fideicomiso/confirm] Error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
