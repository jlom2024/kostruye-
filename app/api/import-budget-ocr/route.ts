import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import pdfParse from "pdf-parse";

// ── Types ──────────────────────────────────────────────────────────────────
type BudgetItem = {
  item_code: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
};
type BudgetChapter = { code: string; name: string; items: BudgetItem[] };

// ── S10 text parser ────────────────────────────────────────────────────────
// Unidades de medida reconocidas en presupuestos peruanos
const UNITS = [
  "m2","m3","ml","km","ha","m",
  "kg","tn","ton","lb","gal","lt","lts",
  "glb","und","unid","pza","jgo","pto","rll","rol","bls","sac","bolsa",
  "hh","hm","hd","he","día","dia","mes","sem",
  "pie2","pie3","pie","p2","p3","pulg","plg",
  "vje","viaje","eq","und\\.",
].join("|");

const UNIT_RE = new RegExp(
  `^(.*?)\\s+(${UNITS})\\s+([\\d,]+\\.\\d+)\\s+([\\d,]+\\.\\d+)(?:\\s+[\\d,]+\\.\\d+)?\\s*$`,
  "i"
);
const CODE_RE = /^(\d{2}(?:\.\d{2,})*)\s+(.+)/;

function parseNum(s: string): number {
  return parseFloat(s.replace(/,/g, "")) || 0;
}

function parseS10Text(text: string): BudgetChapter[] {
  const chapters: BudgetChapter[] = [];
  let current: BudgetChapter | null = null;

  // Normalizar: unir líneas que son continuación de descripción multi-línea
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const codeMatch = line.match(CODE_RE);
    if (!codeMatch) continue;

    const code = codeMatch[1];
    const rest = codeMatch[2].trim();

    const unitMatch = rest.match(UNIT_RE);
    if (unitMatch) {
      // Es una partida con metrado
      if (!current) {
        // Partida sin capítulo padre — crear capítulo raíz
        current = { code: code.split(".")[0], name: "SIN CAPÍTULO", items: [] };
        chapters.push(current);
      }
      current.items.push({
        item_code:   code,
        description: unitMatch[1].trim(),
        unit:        unitMatch[2].toLowerCase(),
        quantity:    parseNum(unitMatch[3]),
        unit_price:  parseNum(unitMatch[4]),
      });
    } else {
      // Es un capítulo/subcapítulo
      current = { code, name: rest, items: [] };
      chapters.push(current);
    }
  }

  return chapters.filter(c => c.code && c.name);
}

// ── Merge chapters (mismo código → fusionar items) ────────────────────────
function mergeChapters(groups: BudgetChapter[][]): BudgetChapter[] {
  const map = new Map<string, BudgetChapter>();
  for (const list of groups) {
    for (const ch of list) {
      const key = ch.code.trim();
      if (!key) continue;
      if (map.has(key)) {
        const ex = map.get(key)!;
        const seen = new Set(ex.items.map(i => i.item_code));
        for (const item of ch.items) {
          if (!seen.has(item.item_code)) { ex.items.push(item); seen.add(item.item_code); }
        }
      } else {
        map.set(key, { ...ch, items: [...ch.items] });
      }
    }
  }
  return Array.from(map.values());
}

// ── Claude OCR fallback (para páginas escaneadas sin texto) ───────────────
const OCR_PROMPT = `Analiza este fragmento de presupuesto de construcción formato S10 (Perú).
Extrae TODOS los capítulos y partidas visibles.

Responde SOLO con líneas en este formato (sin texto adicional):
C|<código>|<nombre del capítulo>
I|<código>|<descripción>|<unidad>|<metrado>|<precio unitario>

Ejemplo:
C|01|OBRAS PRELIMINARES
I|01.01|MOVILIZACION DE EQUIPOS|GLB|1.00|5000.00`;

function parsePipeText(text: string): BudgetChapter[] {
  const chapters: BudgetChapter[] = [];
  let current: BudgetChapter | null = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("C|")) {
      const p = line.split("|");
      if (p.length >= 3) { current = { code: p[1], name: p.slice(2).join("|"), items: [] }; chapters.push(current); }
    } else if (line.startsWith("I|") && current) {
      const p = line.split("|");
      if (p.length >= 6) {
        current.items.push({ item_code: p[1], description: p[2], unit: p[3] || "und", quantity: parseFloat(p[4]) || 0, unit_price: parseFloat(p[5]) || 0 });
      }
    }
  }
  return chapters.filter(c => c.code);
}

async function ocrChunk(base64Pdf: string, apiKey: string, idx: number): Promise<BudgetChapter[]> {
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
      max_tokens: 8192,
      messages: [{ role: "user", content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Pdf } },
        { type: "text", text: OCR_PROMPT },
      ]}],
    }),
  });
  if (!res.ok) { console.error(`OCR chunk ${idx} error:`, (await res.text()).slice(0, 200)); return []; }
  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? "";
  const chapters = parsePipeText(text);
  console.log(`OCR chunk ${idx}: ${chapters.length} caps, ${chapters.reduce((s,c) => s+c.items.length, 0)} items`);
  return chapters;
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

  // ── Paso 1: extracción de texto (gratis, sin IA) ──────────────────────
  let textChapters: BudgetChapter[] = [];
  let isScanned = false;

  try {
    const parsed = await pdfParse(buffer);
    const extractedText = parsed.text;
    const charCount = extractedText.replace(/\s/g, "").length;

    console.log(`PDF text: ${charCount} chars extraídos de ${parsed.numpages} páginas`);

    if (charCount > 500) {
      // PDF digital — parsear directamente
      textChapters = parseS10Text(extractedText);
      console.log(`S10 parser: ${textChapters.length} capítulos, ${textChapters.reduce((s,c)=>s+c.items.length,0)} partidas`);
    } else {
      isScanned = true;
      console.log("PDF escaneado detectado — usando OCR");
    }
  } catch (e) {
    console.error("pdf-parse error:", e);
    isScanned = true;
  }

  // Si el parser extrajo partidas, devolver directamente
  const textItems = textChapters.reduce((s, c) => s + c.items.length, 0);
  if (!isScanned && textItems > 0) {
    const totalChapters = textChapters.length;
    console.log(`OCR OK (texto): ${totalChapters} capítulos, ${textItems} partidas — sin costo de API`);
    return NextResponse.json({ ok: true, data: { chapters: textChapters }, stats: { totalChapters, totalItems: textItems } });
  }

  // ── Paso 2: fallback OCR con Claude (solo para PDFs escaneados) ───────
  if (!apiKey) return NextResponse.json({ error: "PDF escaneado requiere ANTHROPIC_API_KEY" }, { status: 500 });

  const srcPdf = await PDFDocument.load(bytes);
  const totalPages = srcPdf.getPageCount();
  const CHUNK = 5;
  const count = Math.ceil(totalPages / CHUNK);

  console.log(`OCR fallback: ${totalPages} páginas → ${count} chunks`);

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
  const allResults: BudgetChapter[][] = [];
  for (let b = 0; b < buffers.length; b += BATCH) {
    const res = await Promise.all(buffers.slice(b, b + BATCH).map((buf, j) => ocrChunk(buf, apiKey, b + j)));
    allResults.push(...res);
  }

  const chapters = mergeChapters(allResults);
  if (chapters.length === 0) {
    return NextResponse.json({ error: "No se pudo identificar estructura de presupuesto en el PDF" }, { status: 422 });
  }

  const totalItems = chapters.reduce((s, c) => s + c.items.length, 0);
  console.log(`OCR OK (Claude): ${chapters.length} capítulos, ${totalItems} partidas`);
  return NextResponse.json({ ok: true, data: { chapters }, stats: { totalChapters: chapters.length, totalItems } });
}
