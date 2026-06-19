import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string; numpages: number }>;

// ── Types ──────────────────────────────────────────────────────────────────
type BudgetItem = {
  item_code: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
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
  const { data } = await sb.from("budget_items").select("total").eq("budget_id", budgetId).limit(100000);
  const total = (data ?? []).reduce((s, i) => s + Number(i.total), 0);
  await sb.from("budgets").update({ total }).eq("id", budgetId);
  return NextResponse.json({ ok: true, total });
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

  // ── Paso 2: Claude texto (digital) o Claude visión (escaneado) ───────
  // Map compartido código→capítulo: inmune a cortes de chunk y duplicados
  const chapterMap = new Map<string, BudgetChapter>();

  if (!isScanned) {
    // Claude lee el texto — barato, maneja cualquier formato de número/descripción
    const MAX_CHARS = 15_000; // chunks pequeños → salida nunca toca el techo de tokens
    const chunks = splitText(extractedText, MAX_CHARS);
    console.log(`Texto → ${chunks.length} chunk(s) para Claude`);

    const BATCH = 5;
    for (let b = 0; b < chunks.length; b += BATCH) {
      await Promise.all(
        chunks.slice(b, b + BATCH).map((chunk, j) => parseChunkWithClaude(chunk, apiKey, b + j, chapterMap))
      );
    }
  } else {
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
  const method = isScanned ? "OCR visión" : "Claude texto";
  console.log(`OK (${method}): ${chapters.length} capítulos, ${totalItems} partidas`);
  return NextResponse.json({ ok: true, data: { chapters }, stats: { totalChapters: chapters.length, totalItems } });
}
