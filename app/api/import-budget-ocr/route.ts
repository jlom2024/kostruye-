import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

const CHUNK_SIZE = 20; // páginas por chunk
const MAX_TOKENS  = 8192;

const EXTRACTION_PROMPT = `Analiza este fragmento de presupuesto de construcción (formato S10 peruano) y extrae su estructura.

Devuelve ÚNICAMENTE JSON válido con esta estructura exacta:
{
  "chapters": [
    {
      "code": "01",
      "name": "TRABAJOS PRELIMINARES",
      "items": [
        {
          "item_code": "01.01",
          "description": "MOVILIZACIÓN Y DESMOVILIZACIÓN DE EQUIPOS",
          "unit": "GLB",
          "quantity": 1.00,
          "unit_price": 5000.00
        }
      ]
    }
  ]
}

Reglas:
- Extrae TODOS los capítulos y partidas visibles en este fragmento
- Los capítulos son las partidas de nivel superior (ej: "01 TRABAJOS PRELIMINARES")
- Las partidas son las filas con metrado y precio unitario
- Si una fila agrupa sub-partidas sin metrado propio, es un capítulo
- code / item_code: el código tal cual aparece (ej: "01", "01.01", "01.01.01")
- unit: unidad de medida exacta (m2, m3, kg, GLB, ml, und, hh, etc.)
- quantity: metrado numérico — usa 0 si no es legible
- unit_price: precio unitario numérico — usa 0 si no es legible
- NO incluyas columnas de parcial/total/subtotal
- Responde SOLO con el JSON, sin texto adicional ni markdown`;

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

async function extractChunk(base64Pdf: string, apiKey: string, chunkIndex: number): Promise<BudgetChapter[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key":         apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta":    "pdfs-2024-09-25",
      "content-type":      "application/json",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: MAX_TOKENS,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64Pdf },
          },
          { type: "text", text: EXTRACTION_PROMPT },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Chunk ${chunkIndex} Anthropic error:`, err);
    return [];
  }

  const data = await res.json();
  const rawText: string = data.content?.[0]?.text ?? "";

  const jsonMatch =
    rawText.match(/```json\s*([\s\S]*?)\s*```/) ||
    rawText.match(/```\s*([\s\S]*?)\s*```/)      ||
    rawText.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    console.warn(`Chunk ${chunkIndex}: no JSON found. stop_reason=${data.stop_reason}, length=${rawText.length}`);
    return [];
  }

  try {
    const parsed = JSON.parse(jsonMatch[1].trim());
    return Array.isArray(parsed?.chapters) ? parsed.chapters : [];
  } catch (e) {
    console.error(`Chunk ${chunkIndex} parse error:`, e, "| stop_reason:", data.stop_reason, "| tail:", jsonMatch[1].slice(-300));
    return [];
  }
}

function mergeChapters(allChunks: BudgetChapter[][]): BudgetChapter[] {
  const map = new Map<string, BudgetChapter>();

  for (const chapters of allChunks) {
    for (const chapter of chapters) {
      const key = chapter.code?.trim();
      if (!key) continue;

      if (map.has(key)) {
        // Mismo capítulo en otro chunk → fusionar partidas (deduplicar por item_code)
        const existing = map.get(key)!;
        const existingCodes = new Set(existing.items.map(i => i.item_code));
        for (const item of chapter.items ?? []) {
          if (!existingCodes.has(item.item_code)) {
            existing.items.push(item);
            existingCodes.add(item.item_code);
          }
        }
      } else {
        map.set(key, { ...chapter, items: [...(chapter.items ?? [])] });
      }
    }
  }

  return Array.from(map.values());
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formato de solicitud inválido" }, { status: 400 });
  }

  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "Solo se aceptan archivos PDF" }, { status: 400 });
  if (file.size > 32 * 1024 * 1024) return NextResponse.json({ error: "El PDF no puede superar 32 MB" }, { status: 400 });

  const bytes = await file.arrayBuffer();

  // Cargar PDF y calcular chunks
  const srcPdf = await PDFDocument.load(bytes);
  const totalPages = srcPdf.getPageCount();
  const chunkCount = Math.ceil(totalPages / CHUNK_SIZE);

  console.log(`OCR: PDF de ${totalPages} páginas → ${chunkCount} chunks de ${CHUNK_SIZE}`);

  // Generar PDFs de cada chunk en paralelo
  const chunkBuffers = await Promise.all(
    Array.from({ length: chunkCount }, async (_, i) => {
      const start = i * CHUNK_SIZE;
      const end   = Math.min(start + CHUNK_SIZE, totalPages);

      const chunkPdf = await PDFDocument.create();
      const pageIndices = Array.from({ length: end - start }, (_, j) => start + j);
      const copiedPages = await chunkPdf.copyPages(srcPdf, pageIndices);
      copiedPages.forEach(p => chunkPdf.addPage(p));

      const buf = await chunkPdf.save();
      return Buffer.from(buf).toString("base64");
    })
  );

  // Llamar a Anthropic en paralelo para todos los chunks
  const chunkResults = await Promise.all(
    chunkBuffers.map((b64, i) => extractChunk(b64, apiKey, i))
  );

  const chapters = mergeChapters(chunkResults);

  if (chapters.length === 0) {
    return NextResponse.json(
      { error: "No se pudo identificar estructura de presupuesto en el PDF" },
      { status: 422 },
    );
  }

  const totalItems = chapters.reduce((s, c) => s + (c.items?.length ?? 0), 0);

  console.log(`OCR OK: ${chapters.length} capítulos, ${totalItems} partidas, ${chunkCount} chunks`);

  return NextResponse.json({
    ok: true,
    data: { chapters },
    stats: { totalChapters: chapters.length, totalItems },
  });
}
