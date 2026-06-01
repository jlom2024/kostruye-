import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verify user is authenticated and is admin of the project's org
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check the project belongs to an org where user is admin
  const sb = serviceClient();
  const { data: project } = await sb
    .from("projects")
    .select("organization_id")
    .eq("id", id)
    .single();

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: membership } = await sb
    .from("organization_members")
    .select("role")
    .eq("organization_id", project.organization_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await sb.from("projects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
