import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? "admin@kreoiastudio.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "***REDACTED***";
const ADMIN_TOKEN    = process.env.ADMIN_TOKEN    ?? "***REDACTED***";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("kostruye_admin")?.value;
  if (token !== ADMIN_TOKEN) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true });
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("kostruye_admin", ADMIN_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("kostruye_admin");
  return res;
}
