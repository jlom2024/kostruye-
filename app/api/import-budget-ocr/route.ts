import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

const CHUNK_PAGES = 5;
const MAX_TOKENS  = 8192;
const BATCH_SIZE  = 5;

// Formato pipe-delimited: 3x más compacto que JSON
// C|code|name          → capítulo
// I|item_code|desc|unit|qty|pu  → partida
const EXTRACTION_PROMPT = `Analiza este fragmento de presupuesto de construcción formato S10 (Perú).
Extrae TODOS los capítulos y partidas visibles.

Responde SOLO con líneas en este formato exacto (sin texto adicional):
C|<código>|<nombre del capítulo>
I|<código partida>|<descripción>|<unidad>|<metrado>|<precio unitario>

Reglas:
- C = capítulo (fila sin metrado propio, agrupa sub-partidas)
- I = partida (fila con metrado y precio unitario)
- Los códigos son exactamente como aparecen: 01, 01.01, 01.01.01.02, etc.
- Números con punto decimal (no coma): 1234.56
- Si el metrado o precio no es legible usa 0
- NO incluyas totales, parciales ni subtotales
- NO uses markdown, comillas adicionales ni texto explicativo
- Extrae ABSOLUTAMENTE TODAS las partidas visibles, no omitas ninguna

Ejemplo de salida:
C|01|OBRAS PRELIMINARES
I|01.01|MOVILIZACION DE EQUIPOS|GLB|1.00|5000.00
I|01.02|TRAZO Y REPLANTEO|m2|450.00|1.25
C|02|MOVIMIENTO DE TIERRAS
I|02.01|EXCAVACION MANUAL|m3|120.00|18.50`;

type BudgetItem = {
  item_code: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
};

type BudgetChapter = {
  code: string;
  name: string;
  items: BudgetItem[];
};

function parsePipeText(text: string): BudgetChapter[] {
  const chapters: BudgetChapter[] = [];
  let current: BudgetChapter | null = null;

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("C|")) {
      const parts = line.split("|");
      if (parts.length >= 3) {
        current = { code: parts[1].trim(), name: parts.slice(2).join("|").trim(), items: [] };
        chapters.push(current);
      }
    } else if (line.startsWith("I|")) {
      const parts = line.split("|");
      if (parts.length >= 6 && current) {
        current.items.push({
          item_code:  parts[1].trim(),
          description: parts[2].trim(),
          unit:       parts[3].trim() || "und",
          quantity:   parseFloat(parts[4]) || 0,
          unit_price: parseFloat(parts[5]) || 0,
        });
      }
    }
  }

  return chapters.filter(c => c.code);
}

async function extractChunk(base64Pdf: string, apiKey: string, idx: number): Promise<BudgetChapter[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key":         apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta":    "pdfs-2024-09-25",
      "content-type":      "application/json",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: MAX_TOKENS,
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Pdf } },
          { type: "text", text: EXTRACTION_PROMPT },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Chunk ${idx} API error:`, err.slice(0, 200));
    return [];
  }

  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? "";

  if (!text.trim()) {
    console.warn(`Chunk ${idx}: empty response. stop_reason=${data.stop_reason}`);
    return [];
  }

  if (data.stop_reason === "max_tokens") {
    console.warn(`Chunk ${idx}: max_tokens hit, extracting partial data (${text.length} chars)`);
  }

  // El formato pipe-delimited es parcialmente recuperable: cada línea es independiente
  const chapters = parsePipeText(text);
  console.log(`Chunk ${idx}: ${chapters.length} caps, ${chapters.reduce((s, c) => s + c.items.length, 0)} items, stop=${data.stop_reason}`);
  return chapters;
}

function mergeChapters(allChunks: BudgetChapter[][]): BudgetChapter[] {
  const map = new Map<string, BudgetChapter>();

  for (const chunks of allChunks) {
    for (const chapter of chunks) {
      const key = chapter.code?.trim();
      if (!key) continue;

      if (map.has(key)) {
        const existing = map.get(key)!;
        const seen = new Set(existing.items.map(i => i.item_code));
        for (const item of chapter.items) {
          if (!seen.has(item.item_code)) {
            existing.items.push(item);
            seen.add(item.item_code);
          }
        }
      } else {
        map.set(key, { ...chapter, items: [...chapter.items] });
      }
    }
  }

  return Array.from(map.values());
}

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

  const bytes  = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(bytes);
  const total  = srcPdf.getPageCount();
  const count  = Math.ceil(total / CHUNK_PAGES);

  console.log(`OCR: ${total} páginas → ${count} chunks de ${CHUNK_PAGES}`);

  // Construir buffers de cada chunk
  const buffers = await Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const start = i * CHUNK_PAGES;
      const end   = Math.min(start + CHUNK_PAGES, total);
      const pdf   = await PDFDocument.create();
      const pages = await pdf.copyPages(srcPdf, Array.from({ length: end - start }, (_, j) => start + j));
      pages.forEach(p => pdf.addPage(p));
      return Buffer.from(await pdf.save()).toString("base64");
    })
  );

  // Procesar en lotes
  const allResults: BudgetChapter[][] = [];
  for (let b = 0; b < buffers.length; b += BATCH_SIZE) {
    const batch = buffers.slice(b, b + BATCH_SIZE);
    const res   = await Promise.all(batch.map((buf, j) => extractChunk(buf, apiKey, b + j)));
    allResults.push(...res);
  }

  const chapters = mergeChapters(allResults);

  if (chapters.length === 0) {
    return NextResponse.json({ error: "No se pudo identificar estructura de presupuesto en el PDF" }, { status: 422 });
  }

  const totalItems = chapters.reduce((s, c) => s + c.items.length, 0);
  console.log(`OCR OK: ${chapters.length} capítulos, ${totalItems} partidas`);

  return NextResponse.json({ ok: true, data: { chapters }, stats: { totalChapters: chapters.length, totalItems } });
}
