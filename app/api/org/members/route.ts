import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function sb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getOrgId(userId: string) {
  const { data } = await sb()
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .limit(1);
  return data?.[0] ?? null;
}

// GET /api/org/members — list members with emails and roles
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getOrgId(user.id);
  if (!membership) return NextResponse.json({ error: "No org" }, { status: 403 });

  const svc = sb();

  // Get all members
  const { data: members } = await svc
    .from("organization_members")
    .select("user_id, role")
    .eq("organization_id", membership.organization_id);

  if (!members) return NextResponse.json([]);

  // Fetch emails from auth.users via admin API
  const userIds = members.map((m) => m.user_id);
  const emailMap: Record<string, string> = {};

  for (const uid of userIds) {
    const { data: authUser } = await svc.auth.admin.getUserById(uid);
    if (authUser?.user?.email) emailMap[uid] = authUser.user.email;
  }

  const result = members.map((m) => ({
    user_id: m.user_id,
    role: m.role,
    email: emailMap[m.user_id] ?? m.user_id,
    is_self: m.user_id === user.id,
  }));

  // Fetch org logo from app_clients
  const { data: appClient } = await svc
    .from("app_clients")
    .select("name, logo_url")
    .eq("organization_id", membership.organization_id)
    .single();

  return NextResponse.json({
    members: result,
    my_role: membership.role,
    org_name: appClient?.name ?? null,
    org_logo: appClient?.logo_url ?? null,
  });
}

// POST /api/org/members — invite member by email
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getOrgId(user.id);
  if (!membership || membership.role !== "admin")
    return NextResponse.json({ error: "Solo admins pueden invitar" }, { status: 403 });

  const { email, role, password } = await req.json();
  if (!email || !role) return NextResponse.json({ error: "email y role requeridos" }, { status: 400 });

  const svc = sb();

  // Find or create the user
  const { data: { users: existing } } = await svc.auth.admin.listUsers();
  let targetUser = existing.find((u) => u.email === email);

  if (!targetUser) {
    const { data: created, error } = await svc.auth.admin.createUser({
      email,
      password: password || Math.random().toString(36).slice(-10) + "K!",
      email_confirm: true,
    });
    if (error || !created.user)
      return NextResponse.json({ error: error?.message ?? "No se pudo crear el usuario" }, { status: 400 });
    targetUser = created.user;
  }

  // Add to organization_members
  const { error: memErr } = await svc
    .from("organization_members")
    .upsert({ user_id: targetUser.id, organization_id: membership.organization_id, role }, { onConflict: "user_id,organization_id" });
  if (memErr) return NextResponse.json({ error: memErr.message }, { status: 400 });

  // Add to all org projects as member
  const { data: projects } = await svc
    .from("projects")
    .select("id")
    .eq("organization_id", membership.organization_id);

  if (projects?.length) {
    const projectRoles = projects.map((p) => ({ user_id: targetUser!.id, project_id: p.id, role }));
    await svc.from("project_members").upsert(projectRoles, { onConflict: "user_id,project_id" });
  }

  return NextResponse.json({ ok: true, email: targetUser.email });
}

// PATCH /api/org/members — change role
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getOrgId(user.id);
  if (!membership || membership.role !== "admin")
    return NextResponse.json({ error: "Solo admins pueden cambiar roles" }, { status: 403 });

  const { user_id, role } = await req.json();
  if (!user_id || !role) return NextResponse.json({ error: "user_id y role requeridos" }, { status: 400 });
  if (user_id === user.id) return NextResponse.json({ error: "No puedes cambiar tu propio rol" }, { status: 400 });

  const svc = sb();
  await svc.from("organization_members")
    .update({ role })
    .eq("user_id", user_id)
    .eq("organization_id", membership.organization_id);

  await svc.from("project_members")
    .update({ role })
    .eq("user_id", user_id);

  return NextResponse.json({ ok: true });
}

// DELETE /api/org/members — remove member
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getOrgId(user.id);
  if (!membership || membership.role !== "admin")
    return NextResponse.json({ error: "Solo admins pueden eliminar miembros" }, { status: 403 });

  const { user_id } = await req.json();
  if (!user_id) return NextResponse.json({ error: "user_id requerido" }, { status: 400 });
  if (user_id === user.id) return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });

  const svc = sb();
  await svc.from("project_members").delete().eq("user_id", user_id);
  await svc.from("organization_members")
    .delete()
    .eq("user_id", user_id)
    .eq("organization_id", membership.organization_id);

  return NextResponse.json({ ok: true });
}
