import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const maxDuration = 600; // permite extracciones largas (PDFs grandes)
export const dynamic = "force-dynamic";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string; numpages: number }>;

// ── Types ──────────────────────────────────────────────────────────────────
type BudgetItem = {
  item_code: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total?: number; // "parcial" impreso S10 — total exacto al céntimo
};
type BudgetChapter = { code: string; name: string; items: BudgetItem[] };

// ── Service-role Supabase client (bypasses RLS) ───────────────────────────
function adminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Capítulo padre de un código de partida: "01.01.01.01" → "01.01.01"
function parentCode(itemCode: string): string {
  const parts = itemCode.split(".");
  return parts.length > 1 ? parts.slice(0, -1).join(".") : itemCode;
}

// ── Parse Claude pipe-format response ────────────────────────────────────
// Inmune a cortes de chunk: las partidas se asignan a su capítulo por código,
// no por proximidad. Una partida huérfana (sin C| en su chunk) crea/usa el
// capítulo derivado de su propio código jerárquico.
function parsePipeText(text: string, chapterMap: Map<string, BudgetChapter>): void {
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("C|")) {
      const p = line.split("|");
      if (p.length >= 3) {
        const code = p[1].trim();
        const name = p.slice(2).join("|").trim();
        const ex = chapterMap.get(code);
        if (ex) {
          if (name && (ex.name === "" || ex.name.length < name.length)) ex.name = name;
        } else {
          chapterMap.set(code, { code, name, items: [] });
        }
      }
    } else if (line.startsWith("I|")) {
      const p = line.split("|");
      if (p.length >= 6) {
        const itemCode = p[1].trim();
        if (!itemCode) continue;
        const chCode = parentCode(itemCode);
        let ch = chapterMap.get(chCode);
        if (!ch) { ch = { code: chCode, name: "", items: [] }; chapterMap.set(chCode, ch); }
        // evitar duplicar la misma partida
        if (ch.items.some(i => i.item_code === itemCode)) continue;
        ch.items.push({
          item_code:   itemCode,
          description: p[2].trim(),
          unit:        p[3].trim() || "und",
          quantity:    parseFloat(p[4].replace(/[,\s]/g, "")) || 0,
          unit_price:  parseFloat(p[5].replace(/[,\s]/g, "")) || 0,
        });
      }
    }
  }
}

// ── Parser determinístico S10 (exacto, sin IA) ───────────────────────────
// El texto S10 es regular: las partidas son "{desc}{unidad}{código} {metrado}
// {pu} {parcial}" y los capítulos "{código}{nombre}". Esto da el total EXACTO
// al céntimo, gratis. Devuelve el COSTO DIRECTO impreso para auto-verificación.
const S10_UNITS = ["GLB","glb","und","UND","pto","PTO","mes","MES","p2","P2","m2","m3","M2","M3",
  "ml","ML","kg","KG","pza","PZA","gal","GAL","bls","BLS","jgo","JGO","par","PAR","hh","HH",
  "hm","HM","día","dia","DIA","DÍA","ha","HA","est","EST","tlb","TLB","glb","u","m","M","l","L"];
const S10_NUM = (s: string) => parseFloat(s.replace(/[,\s]/g, "")) || 0;

function parseS10Text(text: string, chapterMap: Map<string, BudgetChapter>): number | null {
  const unitAlt = S10_UNITS.join("|");
  const itemRe = new RegExp(
    "^(.+?)(" + unitAlt + ")(\\d{2}(?:\\.\\d{2,})+)\\s+([\\d.,]+)\\s+([\\d.,]+)\\s+([\\d.,]+)\\s*$"
  );
  const itemReNoUnit = /^(.+?)(\d{2}(?:\.\d{2,})+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s*$/;
  const chapRe = /^(\d{2}(?:\.\d{2,})*)([A-Za-zÁÉÍÓÚÑáéíóúñ].*)$/;
  let costoDirecto: number | null = null;

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    const cd = line.match(/^COSTO\s+DIRECTO\s+([\d.,]+)$/i);
    if (cd) { costoDirecto = S10_NUM(cd[1]); continue; }

    let unit = "";
    let m = line.match(itemRe);
    if (m) {
      unit = m[2];
    } else {
      const mn = line.match(itemReNoUnit);
      if (mn) m = [mn[0], mn[1], "", mn[2], mn[3], mn[4], mn[5]] as RegExpMatchArray;
    }
    if (m) {
      const itemCode = m[3];
      const chCode = parentCode(itemCode);
      let ch = chapterMap.get(chCode);
      if (!ch) { ch = { code: chCode, name: "", items: [] }; chapterMap.set(chCode, ch); }
      // OJO: no deduplicar por código — en S10 un mismo código puede repetirse
      // como filas distintas (sub-presupuestos/metrados); cada parcial cuenta.
      ch.items.push({
        item_code:   itemCode,
        description: m[1].trim(),
        unit:        (unit || "und").trim(),
        quantity:    S10_NUM(m[4]),
        unit_price:  S10_NUM(m[5]),
        total:       S10_NUM(m[6]), // parcial impreso = total exacto
      });
      continue;
    }

    const c = line.match(chapRe);
    if (c) {
      const code = c[1], name = c[2].trim();
      const ex = chapterMap.get(code);
      if (!ex) chapterMap.set(code, { code, name, items: [] });
      else if (name && (ex.name === "" || name.length > ex.name.length)) ex.name = name;
    }
  }
  return costoDirecto;
}

// ── Split text into chunks on line boundaries ─────────────────────────────
function splitText(text: string, maxChars: number): string[] {
  const chunks: string[] = [];
  const lines = text.split("\n");
  let current = "";
  for (const line of lines) {
    if (current.length + line.length + 1 > maxChars && current.length > 0) {
      chunks.push(current);
      current = line + "\n";
    } else {
      current += line + "\n";
    }
  }
  if (current.trim()) chunks.push(current);
  return chunks;
}

// ── Claude text parser (cheap — no vision, no PDF beta) ──────────────────
const TEXT_PROMPT = `Analiza este texto extraído de un presupuesto de construcción formato S10 (Perú).
Extrae TODOS los capítulos y partidas que encuentres.

FORMATO DE RESPUESTA (solo estas líneas, sin texto adicional):
C|<código>|<nombre del capítulo>
I|<código>|<descripción>|<unidad>|<metrado>|<precio unitario>

REGLAS:
- Capítulos: códigos numéricos como 01, 01.01, 01.01.01 seguidos de texto descriptivo
- Partidas: códigos hoja tipo 01.01.01.01 con unidad, metrado y precio unitario
- Los números pueden usar coma O espacio como separador de miles (10,672.00 o 10 672.00) — normalízalos sin separador
- Si la descripción ocupa múltiples líneas, únelas en una sola
- NO incluyas filas de totales, subtotales, gastos generales, IGV ni encabezados de columna
- Si no encuentras partidas en algún fragmento, igual devuelve los capítulos que identifiques`;

async function callClaudeText(text: string, apiKey: string): Promise<{ body: string; stop: string } | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 16000,
      messages: [{ role: "user", content: `${TEXT_PROMPT}\n\nTEXTO A ANALIZAR:\n${text}` }],
    }),
  });
  if (!res.ok) {
    console.error("Claude text error:", (await res.text()).slice(0, 200));
    return null;
  }
  const data = await res.json();
  return { body: data.content?.[0]?.text ?? "", stop: data.stop_reason ?? "" };
}

// Procesa un chunk; si Claude trunca la salida, parte el chunk a la mitad y reintenta.
async function parseChunkWithClaude(
  text: string, apiKey: string, idx: number, chapterMap: Map<string, BudgetChapter>, depth = 0
): Promise<void> {
  const r = await callClaudeText(text, apiKey);
  if (!r) return;
  if (r.stop === "max_tokens" && depth < 3) {
    // Salida truncada → el chunk tenía demasiadas partidas. Partir y reintentar.
    console.warn(`⚠️ Chunk ${idx} truncado — partiendo (depth ${depth})`);
    const lines = text.split("\n");
    const mid = Math.floor(lines.length / 2);
    await parseChunkWithClaude(lines.slice(0, mid).join("\n"), apiKey, idx, chapterMap, depth + 1);
    await parseChunkWithClaude(lines.slice(mid).join("\n"), apiKey, idx, chapterMap, depth + 1);
    return;
  }
  parsePipeText(r.body, chapterMap);
}

// ── Claude vision OCR fallback (for scanned PDFs) ────────────────────────
import { PDFDocument } from "pdf-lib";

const OCR_PROMPT = `Analiza este fragmento de presupuesto de construcción formato S10 (Perú).
Extrae TODOS los capítulos y partidas visibles.

FORMATO (solo estas líneas):
C|<código>|<nombre del capítulo>
I|<código>|<descripción>|<unidad>|<metrado>|<precio unitario>`;

async function ocrChunk(base64Pdf: string, apiKey: string, idx: number, chapterMap: Map<string, BudgetChapter>): Promise<void> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "pdfs-2024-09-25",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 16000,
      messages: [{ role: "user", content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Pdf } },
        { type: "text", text: OCR_PROMPT },
      ]}],
    }),
  });
  if (!res.ok) { console.error(`OCR chunk ${idx} error:`, (await res.text()).slice(0, 200)); return; }
  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? "";
  parsePipeText(text, chapterMap);
  console.log(`OCR chunk ${idx} procesado (stop=${data.stop_reason})`);
}

// ── Recalculate budget total (server-side) ────────────────────────────────
export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budget_id");
  if (!budgetId) return NextResponse.json({ error: "budget_id requerido" }, { status: 400 });
  const sb = adminClient();
  // Paginar: .limit() no garantiza traer todo (PostgREST capa la respuesta).
  const PAGE = 1000;
  let from = 0;
  let total = 0;
  let n = 0;
  for (;;) {
    const { data, error } = await sb
      .from("budget_items")
      .select("total")
      .eq("budget_id", budgetId)
      .range(from, from + PAGE - 1);
    if (error || !data) break;
    total += data.reduce((s, i) => s + Number(i.total), 0);
    n += data.length;
    if (data.length < PAGE) break;
    from += PAGE;
  }
  await sb.from("budgets").update({ total }).eq("id", budgetId);
  return NextResponse.json({ ok: true, total, items: n });
}

// ── Wipe budget data (server-side, bypasses RLS) ──────────────────────────
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budget_id");
  if (!budgetId) return NextResponse.json({ error: "budget_id requerido" }, { status: 400 });
  const sb = adminClient();
  await sb.from("budget_items").delete().eq("budget_id", budgetId);
  await sb.from("budget_chapters").delete().eq("budget_id", budgetId);
  await sb.from("budgets").update({ total: 0 }).eq("id", budgetId);
  return NextResponse.json({ ok: true });
}

// ── Main route ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });

  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: "Formato de solicitud inválido" }, { status: 400 }); }

  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "Solo se aceptan archivos PDF" }, { status: 400 });
  if (file.size > 32 * 1024 * 1024) return NextResponse.json({ error: "El PDF no puede superar 32 MB" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // ── Paso 1: extraer texto del PDF ────────────────────────────────────
  let extractedText = "";
  let isScanned = false;

  try {
    const parsed = await pdfParse(buffer);
    extractedText = parsed.text;
    const charCount = extractedText.replace(/\s/g, "").length;
    console.log(`PDF: ${charCount} chars, ${parsed.numpages} páginas`);
    if (charCount < 500) isScanned = true;
  } catch (e) {
    console.error("pdf-parse error:", e);
    isScanned = true;
  }

  // ── Paso 2: parser determinístico (primario) → Claude (fallback) ─────
  // Map compartido código→capítulo: inmune a cortes de chunk y duplicados
  let chapterMap = new Map<string, BudgetChapter>();
  let method = "";
  let verified = false;
  let costoDirecto: number | null = null;
  let parsedSum = 0;

  if (!isScanned) {
    // 2a. Parser determinístico: exacto y gratis para S10 estándar
    const detMap = new Map<string, BudgetChapter>();
    costoDirecto = parseS10Text(extractedText, detMap);
    parsedSum = Array.from(detMap.values())
      .reduce((s, c) => s + c.items.reduce((t, i) => t + (i.total ?? i.quantity * i.unit_price), 0), 0);
    parsedSum = Math.round(parsedSum * 100) / 100;
    const detItems = Array.from(detMap.values()).reduce((s, c) => s + c.items.length, 0);

    // Auto-verificación: la suma de parciales debe igualar el COSTO DIRECTO
    // impreso al céntimo (tolerancia 0.05 por flotantes). Si no hay costo
    // directo pero sí partidas, se usa igual (PDF sin línea de total).
    const reconciles = costoDirecto != null && Math.abs(parsedSum - costoDirecto) <= 0.05;
    if (detItems > 0 && (reconciles || costoDirecto == null)) {
      chapterMap = detMap;
      method = "determinístico";
      verified = reconciles;
      console.log(`Determinístico: ${detItems} partidas, suma ${parsedSum.toFixed(2)}, costo directo ${costoDirecto?.toFixed(2) ?? "—"}, verificado=${verified}`);
    } else {
      // 2b. Fallback a Claude texto (formato no estándar)
      console.warn(`Determinístico no reconcilia (suma ${parsedSum.toFixed(2)} vs ${costoDirecto?.toFixed(2)}) — usando Claude`);
      method = "Claude texto";
      const MAX_CHARS = 15_000;
      const chunks = splitText(extractedText, MAX_CHARS);
      const BATCH = 12;
      for (let b = 0; b < chunks.length; b += BATCH) {
        await Promise.all(
          chunks.slice(b, b + BATCH).map((chunk, j) => parseChunkWithClaude(chunk, apiKey, b + j, chapterMap))
        );
      }
    }
  } else {
    method = "OCR visión";
    // Fallback visión para PDFs escaneados
    console.log("PDF escaneado — usando OCR visión");
    const srcPdf = await PDFDocument.load(bytes);
    const totalPages = srcPdf.getPageCount();
    const CHUNK = 5;
    const count = Math.ceil(totalPages / CHUNK);

    const buffers = await Promise.all(
      Array.from({ length: count }, async (_, i) => {
        const start = i * CHUNK;
        const end = Math.min(start + CHUNK, totalPages);
        const pdf = await PDFDocument.create();
        const pages = await pdf.copyPages(srcPdf, Array.from({ length: end - start }, (_, j) => start + j));
        pages.forEach(p => pdf.addPage(p));
        return Buffer.from(await pdf.save()).toString("base64");
      })
    );

    const BATCH = 5;
    for (let b = 0; b < buffers.length; b += BATCH) {
      await Promise.all(buffers.slice(b, b + BATCH).map((buf, j) => ocrChunk(buf, apiKey, b + j, chapterMap)));
    }
  }

  // Ordenar capítulos por código y descartar los vacíos sin nombre
  const chapters = Array.from(chapterMap.values())
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  if (chapters.length === 0) {
    return NextResponse.json({ error: "No se pudo identificar estructura de presupuesto en el PDF" }, { status: 422 });
  }

  const totalItems = chapters.reduce((s, c) => s + c.items.length, 0);
  const importSum = chapters.reduce((s, c) => s + c.items.reduce((t, i) => t + (i.total ?? i.quantity * i.unit_price), 0), 0);
  console.log(`OK (${method}): ${chapters.length} capítulos, ${totalItems} partidas, suma ${importSum.toFixed(2)}`);
  return NextResponse.json({
    ok: true,
    data: { chapters },
    stats: {
      totalChapters: chapters.length,
      totalItems,
      method,
      verified,
      costoDirecto,
      sum: Math.round(importSum * 100) / 100,
    },
  });
}
