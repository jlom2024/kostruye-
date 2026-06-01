import { NextRequest, NextResponse } from "next/server";

const EXTRACTION_PROMPT = `Analiza este presupuesto de construcción (puede ser imagen escaneada o texto) y extrae su estructura completa.

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
- Extrae TODOS los capítulos y partidas visibles en el documento
- Los capítulos son las partidas de nivel superior (ej: "01 TRABAJOS PRELIMINARES")
- Las partidas son las filas con metrado y precio unitario
- Si una fila agrupa sub-partidas sin metrado propio, es un capítulo
- code / item_code: el código de partida tal cual aparece (ej: "01", "01.01", "01.01.01")
- unit: unidad de medida exacta (m2, m3, kg, GLB, ml, und, hh, etc.)
- quantity: metrado numérico — usa 0 si no es legible
- unit_price: precio unitario numérico — usa 0 si no es legible
- NO incluyas columnas de parcial/total/subtotal, solo los datos de entrada
- Si el formato es S10 de Perú, respeta su jerarquía de partidas
- Si hay múltiples páginas, extrae todo el presupuesto
- Responde SOLO con el JSON, sin texto adicional ni markdown`;

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
  if (!file) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Solo se aceptan archivos PDF" }, { status: 400 });
  }
  if (file.size > 32 * 1024 * 1024) {
    return NextResponse.json({ error: "El PDF no puede superar 32 MB" }, { status: 400 });
  }

  const bytes  = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key":          apiKey,
      "anthropic-version":  "2023-06-01",
      "anthropic-beta":     "pdfs-2024-09-25",
      "content-type":       "application/json",
    },
    body: JSON.stringify({
      model:      "claude-opus-4-5",
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type:       "base64",
              media_type: "application/pdf",
              data:       base64,
            },
          },
          {
            type: "text",
            text: EXTRACTION_PROMPT,
          },
        ],
      }],
    }),
  });

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    console.error("Anthropic API error:", errText);
    return NextResponse.json({ error: "Error en extracción OCR" }, { status: 502 });
  }

  const anthropicData = await anthropicRes.json();
  const rawText: string = anthropicData.content?.[0]?.text ?? "";

  // Extraer JSON de la respuesta (puede venir con o sin markdown fences)
  const jsonMatch =
    rawText.match(/```json\s*([\s\S]*?)\s*```/) ||
    rawText.match(/```\s*([\s\S]*?)\s*```/)      ||
    rawText.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    return NextResponse.json(
      { error: "No se pudo identificar estructura de presupuesto en el PDF" },
      { status: 422 },
    );
  }

  try {
    const extracted = JSON.parse(jsonMatch[1].trim());

    // Validación mínima
    if (!Array.isArray(extracted?.chapters)) {
      return NextResponse.json({ error: "Estructura extraída incompleta" }, { status: 422 });
    }

    // Calcular estadísticas para el preview
    const totalItems    = extracted.chapters.reduce((s: number, c: { items?: unknown[] }) => s + (c.items?.length ?? 0), 0);
    const totalChapters = extracted.chapters.length;

    return NextResponse.json({ ok: true, data: extracted, stats: { totalChapters, totalItems } });
  } catch {
    return NextResponse.json({ error: "La respuesta del OCR no es JSON válido" }, { status: 422 });
  }
}
