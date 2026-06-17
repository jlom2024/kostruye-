import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import * as XLSX from "xlsx";

// Sync automático de Índices Unificados INEI (Base Dic 2025 = 100).
// Descarga el Excel más reciente del INEI y hace upsert en inei_indices.
// Acepta auth por cookie (admin panel) o header x-admin-token (cron).

const ADMIN_TOKEN = process.env.ADMIN_TOKEN!;
const MONTHS_ES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const header = req.headers.get("x-admin-token");
  if (header === ADMIN_TOKEN) return true;
  const cookieStore = await cookies();
  return cookieStore.get("kostruye_admin")?.value === ADMIN_TOKEN;
}

function ineiUrl(year: number, month: number): string {
  const mon = MONTHS_ES[month - 1];
  const yy = String(year).slice(-2);
  return `https://www.inei.gob.pe/media/MenuRecursivo/indices_tematicos/n07_indices_unificados_de_precios_de_la_construccion_${mon}${yy}.xlsx`;
}

function parseExcel(buffer: ArrayBuffer): { index_code: string; index_name: string; period_year: number; period_month: number; index_value: number }[] {
  const wb = XLSX.read(buffer, { type: "array" });

  // Leer nombres desde hoja Relación
  const relSheet = wb.Sheets["Relación índices Base dic 2025"];
  const names: Record<string, string> = {};
  if (relSheet) {
    const cleanName = (n: unknown) => n ? String(n).replace(/ \([abc]\)$/i, "").trim() : "";
    XLSX.utils.sheet_to_json<unknown[]>(relSheet, { header: 1 }).forEach((row: unknown) => {
      const r = row as unknown[];
      [[r[0], r[1]], [r[2], r[3]]].forEach(([code, name]) => {
        const c = String(code ?? "").trim();
        if (/^\d+(-\d+)?$/.test(c) && typeof name === "string") {
          names[c.includes("-") ? c : c.padStart(2, "0")] = cleanName(name);
        }
      });
    });
  }

  // Sheets mensuales disponibles (Ene_2026, Feb_2026, …)
  const monthSheets = wb.SheetNames.filter(s => /^[A-Za-z]{3}_\d{4}$/.test(s));
  const records: ReturnType<typeof parseExcel> = [];

  monthSheets.forEach(sheetName => {
    const [monAbbr, yearStr] = sheetName.split("_");
    const year = Number(yearStr);
    const month = MONTHS_ES.findIndex(m => m.toLowerCase() === monAbbr.toLowerCase()) + 1;
    if (!month) return;

    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
    const hi = data.findIndex((r: unknown) => (r as unknown[])[0] === "Cód.");
    if (hi < 0) return;

    for (let i = hi + 1; i < data.length; i++) {
      const row = data[i] as unknown[];
      const cs = String(row[0] ?? "").trim();
      if (!/^\d+(-\d+)?$/.test(cs)) continue;
      const code = cs.includes("-") ? cs : cs.padStart(2, "0");
      const value = row[1]; // Área 1 = Lima Metropolitana
      if (typeof value === "number") {
        records.push({ index_code: code, index_name: names[code] || code, period_year: year, period_month: month, index_value: value });
      }
    }
  });

  return records;
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  // Intentar mes actual, si falla bajar un mes
  let buffer: ArrayBuffer | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const url = ineiUrl(year, month);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (res.ok) { buffer = await res.arrayBuffer(); break; }
    } catch {}
    // Retroceder un mes
    month--;
    if (month < 1) { month = 12; year--; }
  }

  if (!buffer) {
    return NextResponse.json({ error: "No se pudo descargar el Excel del INEI" }, { status: 502 });
  }

  let records: ReturnType<typeof parseExcel>;
  try {
    records = parseExcel(buffer);
  } catch (e) {
    return NextResponse.json({ error: `Error al parsear Excel: ${e}` }, { status: 500 });
  }

  if (!records.length) {
    return NextResponse.json({ error: "Excel sin datos válidos" }, { status: 500 });
  }

  const { error } = await supabase()
    .from("inei_indices")
    .upsert(records, { onConflict: "index_code,period_year,period_month" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, imported: records.length, lastMonth: `${year}-${String(month).padStart(2,"0")}` });
}

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    description: "POST /api/admin/inei/sync — descarga Excel INEI y hace upsert en inei_indices",
    auth: "cookie kostruye_admin o header x-admin-token",
    source: "https://www.inei.gob.pe/estadisticas/indice-tematico/price-indexes/",
    base: "Diciembre 2025 = 100 (R.J. 016-2026-INEI)",
    area: "Área 1 — Lima Metropolitana",
  });
}
