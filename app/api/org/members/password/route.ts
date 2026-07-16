import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function sb() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const target_user_id = body.user_id;
  const new_pwd = body.new_password || body.newPassword;

  if (!new_pwd) {
    return NextResponse.json({ error: "Contraseña nueva requerida" }, { status: 400 });
  }

  // 1. Caso: El usuario cambia su propia contraseña
  if (!target_user_id || target_user_id === user.id) {
    const { error } = await sb().auth.admin.updateUserById(user.id, { password: new_pwd });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  // 2. Caso: Un administrador cambia la contraseña de otro miembro de su organización
  const { data: myMembership } = await sb()
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!myMembership || myMembership.role !== "admin") {
    return NextResponse.json({ error: "Solo admins pueden cambiar contraseñas de otros miembros" }, { status: 403 });
  }

  // Verificar que el usuario objetivo pertenezca a la misma organización
  const { data: targetMembership } = await sb()
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", target_user_id)
    .eq("organization_id", myMembership.organization_id)
    .limit(1)
    .single();

  if (!targetMembership) {
    return NextResponse.json({ error: "El usuario no pertenece a tu organización" }, { status: 403 });
  }

  const { error } = await sb().auth.admin.updateUserById(target_user_id, { password: new_pwd });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

