import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Admin client con service role (solo server-side)
function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { email, name, role, projectId, organizationId } = await req.json();
  if (!email || !projectId || !organizationId || !role) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  // Verificar que el solicitante es admin del proyecto
  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  const { data: orgMembership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .single();

  const isAdmin =
    (membership as any)?.role === "admin" ||
    (orgMembership as any)?.role === "admin";

  if (!isAdmin) {
    return NextResponse.json({ error: "Solo admins pueden invitar usuarios" }, { status: 403 });
  }

  const admin = getAdminClient();

  // Buscar si el usuario ya existe en Supabase Auth
  const { data: existingList } = await admin.auth.admin.listUsers();
  const existing = existingList?.users.find((u) => u.email === email.toLowerCase().trim());

  let invitedUserId: string;

  if (existing) {
    // Usuario ya existe — solo lo agregamos a org y proyecto
    invitedUserId = existing.id;
  } else {
    // Crear usuario e invitarlo por email
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      email.toLowerCase().trim(),
      { data: { name: name || email.split("@")[0] } }
    );
    if (inviteErr || !invited.user) {
      return NextResponse.json({ error: inviteErr?.message ?? "Error al invitar" }, { status: 500 });
    }
    invitedUserId = invited.user.id;

    // Crear perfil si no existe
    await admin.from("profiles").upsert({
      id: invitedUserId,
      email: email.toLowerCase().trim(),
      name: name || email.split("@")[0],
    }, { onConflict: "id" });
  }

  // Agregar a organization_members si no está
  const { data: orgMem } = await admin
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", invitedUserId)
    .maybeSingle();

  if (!orgMem) {
    await admin.from("organization_members").insert({
      organization_id: organizationId,
      user_id: invitedUserId,
      role: role,
    });
  }

  // Agregar a project_members si no está
  const { data: projMem } = await admin
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", invitedUserId)
    .maybeSingle();

  if (projMem) {
    return NextResponse.json({ error: "El usuario ya es miembro de este proyecto" }, { status: 409 });
  }

  const { error: pmErr } = await admin.from("project_members").insert({
    project_id: projectId,
    user_id: invitedUserId,
    role: role,
  });

  if (pmErr) {
    return NextResponse.json({ error: pmErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    isNew: !existing,
    message: existing
      ? "Usuario agregado al proyecto"
      : "Invitación enviada por email",
  });
}
