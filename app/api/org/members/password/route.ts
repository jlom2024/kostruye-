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

  const { data: membership } = await sb()
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin")
    return NextResponse.json({ error: "Solo admins pueden cambiar contraseñas" }, { status: 403 });

  const { user_id, new_password } = await req.json();
  if (!user_id || !new_password) return NextResponse.json({ error: "user_id y new_password requeridos" }, { status: 400 });

  const { error } = await sb().auth.admin.updateUserById(user_id, { password: new_password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
