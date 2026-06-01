import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant } = await params;
  const formData = await request.formData();
  const email    = (formData.get("email")    as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  // Build base URL from forwarded headers (nginx proxy) to avoid 0.0.0.0 redirects
  const host  = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const base  = `${proto}://${host}`;

  if (error) {
    return NextResponse.redirect(new URL(`/${tenant}?error=1`, base), 303);
  }

  return NextResponse.redirect(new URL("/proyectos", base), 303);
}
