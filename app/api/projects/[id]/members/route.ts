import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const svc = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

async function getAdminMembership(sb: ReturnType<typeof svc>, userId: string, projectId: string) {
  // Buscar membresía en la org que contiene este proyecto
  const { data: proj } = await sb.from("projects").select("organization_id").eq("id", projectId).single();
  if (!proj) return null;

  const { data: rows } = await sb
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .eq("organization_id", proj.organization_id)
    .limit(1);

  const m = rows?.[0] ?? null;
  return m?.role === "admin" ? m : null;
}

// POST — añadir miembro al proyecto
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { user_id, role } = await req.json();
  if (!user_id) return NextResponse.json({ error: "user_id requerido" }, { status: 400 });

  const sb = svc();
  const membership = await getAdminMembership(sb, user.id, projectId);
  if (!membership) return NextResponse.json({ error: "Solo admins pueden gestionar el equipo" }, { status: 403 });

  const { error } = await sb
    .from("project_members")
    .upsert({ project_id: projectId, user_id, role: role ?? "field_engineer" }, { onConflict: "user_id,project_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// DELETE — quitar miembro del proyecto
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { member_id } = await req.json();
  if (!member_id) return NextResponse.json({ error: "member_id requerido" }, { status: 400 });

  const sb = svc();
  const membership = await getAdminMembership(sb, user.id, projectId);
  if (!membership) return NextResponse.json({ error: "Solo admins pueden gestionar el equipo" }, { status: 403 });

  const { error } = await sb
    .from("project_members")
    .delete()
    .eq("id", member_id)
    .eq("project_id", projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// PATCH — cambiar rol en proyecto
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { member_id, role } = await req.json();
  if (!member_id || !role) return NextResponse.json({ error: "member_id y role requeridos" }, { status: 400 });

  const sb = svc();
  const membership = await getAdminMembership(sb, user.id, projectId);
  if (!membership) return NextResponse.json({ error: "Solo admins pueden gestionar el equipo" }, { status: 403 });

  const { error } = await sb
    .from("project_members")
    .update({ role })
    .eq("id", member_id)
    .eq("project_id", projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
