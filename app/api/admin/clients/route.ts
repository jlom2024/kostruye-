import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function guardAdmin(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("kostruye_admin")?.value;
  if (token !== ADMIN_TOKEN) return false;
  return true;
}

export async function GET(req: NextRequest) {
  if (!(await guardAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sb = adminClient();
    const { data, error } = await sb
      .from("app_clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error fetching clients:", error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error("Critical error in GET /api/admin/clients:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await guardAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const sb = adminClient();

  // 1. Validaciones básicas
  if (!body.contact_email || !body.password || !body.name || !body.slug) {
    return NextResponse.json({ error: "Faltan campos obligatorios (nombre, slug, email, contraseña)" }, { status: 400 });
  }

  try {
    // 2. Crear la Organización (Tenant real en el core)
    const { data: org, error: orgError } = await sb
      .from("organizations")
      .insert({
        name: body.name,
        plan: body.plan ?? "pilot"
      })
      .select()
      .single();

    if (orgError) throw new Error(`Error al crear organización: ${orgError.message}`);

    // 3. Crear el usuario en Supabase Auth
    const { data: authUser, error: authError } = await sb.auth.admin.createUser({
      email: body.contact_email,
      password: body.password,
      email_confirm: true,
      user_metadata: { name: body.contact_name, client_slug: body.slug }
    });

    if (authError) {
      // Cleanup: borrar la org si falla el auth
      await sb.from("organizations").delete().eq("id", org.id);
      throw new Error(`Error al crear usuario de acceso: ${authError.message}`);
    }

    // 4. Vincular usuario a la organización como ADMIN
    const { error: memberError } = await sb
      .from("organization_members")
      .insert({
        organization_id: org.id,
        user_id:         authUser.user.id,
        role:            "admin"
      });

    if (memberError) {
      // Cleanup
      await sb.auth.admin.deleteUser(authUser.user.id);
      await sb.from("organizations").delete().eq("id", org.id);
      throw new Error(`Error al vincular miembro: ${memberError.message}`);
    }

    // 5. Crear el App Client (para la landing/login) vinculado a la Org
    const { data, error: clientError } = await sb
      .from("app_clients")
      .insert({
        name:            body.name,
        slug:            body.slug,
        plan:            body.plan ?? "pilot",
        active:          true,
        organization_id: org.id,
        contact_name:    body.contact_name ?? null,
        contact_email:   body.contact_email ?? null,
        monthly_price:   body.monthly_price ?? 0,
        notes:           body.notes ?? null,
        logo_url:        body.logo_url ?? null,
      })
      .select()
      .single();

    if (clientError) {
      // Cleanup
      await sb.auth.admin.deleteUser(authUser.user.id);
      await sb.from("organizations").delete().eq("id", org.id);
      throw new Error(`Error al crear cliente de aplicación: ${clientError.message}`);
    }

    return NextResponse.json(data, { status: 201 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
