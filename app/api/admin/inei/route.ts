import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Gestión de índices unificados INEI (data nacional, curada por KREO).
// Protegida por el cookie de admin de la plataforma + service role.

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function guardAdmin() {
  const cookieStore = await cookies();
  return cookieStore.get("kostruye_admin")?.value === ADMIN_TOKEN;
}

// GET — lista de índices (opcional ?year=&month= para filtrar)
export async function GET(req: NextRequest) {
  if (!(await guardAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  let q = adminClient()
    .from("inei_indices")
    .select("*")
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false })
    .order("index_code", { ascending: true });

  if (year) q = q.eq("period_year", Number(year));
  if (month) q = q.eq("period_month", Number(month));

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST — upsert de un índice o bulk (array) desde importación Excel
export async function POST(req: NextRequest) {
  if (!(await guardAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Bulk import
  if (Array.isArray(body)) {
    const rows = body.map((r) => ({
      index_code: String(r.index_code).trim(),
      index_name: String(r.index_name).trim(),
      period_year: Number(r.period_year),
      period_month: Number(r.period_month),
      index_value: Number(r.index_value),
    }));

    const invalid = rows.find((r) => !r.index_code || !r.index_name || !r.period_year || r.period_month < 1 || r.period_month > 12 || isNaN(r.index_value));
    if (invalid) return NextResponse.json({ error: `Fila inválida: ${JSON.stringify(invalid)}` }, { status: 400 });

    const { error } = await adminClient()
      .from("inei_indices")
      .upsert(rows, { onConflict: "index_code,period_year,period_month" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, imported: rows.length });
  }

  // Single upsert
  const { index_code, index_name, period_year, period_month, index_value } = body;
  if (!index_code || !index_name || !period_year || !period_month || index_value == null) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }
  if (period_month < 1 || period_month > 12) {
    return NextResponse.json({ error: "Mes inválido (1-12)" }, { status: 400 });
  }

  const { data, error } = await adminClient()
    .from("inei_indices")
    .upsert(
      {
        index_code: String(index_code).trim(),
        index_name: String(index_name).trim(),
        period_year: Number(period_year),
        period_month: Number(period_month),
        index_value: Number(index_value),
      },
      { onConflict: "index_code,period_year,period_month" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, index: data });
}

// DELETE — eliminar un índice por id
export async function DELETE(req: NextRequest) {
  if (!(await guardAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const { error } = await adminClient().from("inei_indices").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
