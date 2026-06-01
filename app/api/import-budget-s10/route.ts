import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

// ── Types ────────────────────────────────────────────────────────────────────
export type S10Resource = {
  code: string;
  description: string;
  unit: string;
  resource_type: "mano_de_obra" | "material" | "equipo" | "subcontrato";
  unit_price: number;
  crew_size: number;       // cuadrilla
  quantity_per_unit: number; // rendimiento / cantidad
};

export type S10Item = {
  item_code: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  apu_lines: S10Resource[];
};

export type S10Chapter = {
  code: string;
  name: string;
  items: S10Item[];
};

export type S10Budget = {
  chapters: S10Chapter[];
  resources: S10Resource[]; // catálogo unificado
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Limpia un valor de celda a string */
function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/** Limpia a número, devuelve 0 si no es parseable */
function num(v: unknown): number {
  const n = parseFloat(String(v ?? "").replace(/,/g, ".").replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

/**
 * Detecta el tipo de recurso según el código S10:
 *  - Códigos que empiezan con 01 → Mano de obra
 *  - 02 → Material
 *  - 03/04 → Equipo
 *  - 05 → Subcontrato
 *  - Fallback por descripción de la sección
 */
function detectResourceType(
  code: string,
  sectionHint: string
): S10Resource["resource_type"] {
  const c = code.replace(/\D/g, "").substring(0, 2);
  if (c === "01" || /mano.de.obra|mo\b/i.test(sectionHint)) return "mano_de_obra";
  if (c === "02" || /material/i.test(sectionHint)) return "material";
  if (c === "03" || c === "04" || /equipo|herramienta/i.test(sectionHint)) return "equipo";
  if (c === "05" || /subcontrat/i.test(sectionHint)) return "subcontrato";
  // Fallback heurístico por descripción
  return "material";
}

/**
 * Detecta si una fila es cabecera de capítulo (código de 2 dígitos sin punto)
 * Ej: "01", "02", "03"
 */
function isChapter(code: string, desc: string): boolean {
  return /^\d{2}$/.test(code) && desc.length > 0;
}

/**
 * Detecta si una fila es partida (código con al menos un punto)
 * Ej: "01.01.01", "02.03"
 */
function isItem(code: string): boolean {
  return /^\d{2}[.\d]+$/.test(code) && code.includes(".");
}

/**
 * Detecta si una fila es encabezado de sección APU
 * Ej: "Mano de Obra", "Materiales", "Equipos"
 */
function isApuSection(desc: string): boolean {
  return /^(mano\s*de\s*obra|materiales?|equipos?|herramientas?|subcontratos?|otros?)/i.test(desc.trim());
}

// ── Parser principal ─────────────────────────────────────────────────────────
function parseS10Excel(buffer: Buffer): S10Budget {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });

  // Intentar hoja "Presupuesto" primero, luego la primera hoja
  const sheetName =
    wb.SheetNames.find((n) =>
      /presupuesto|budget|partidas/i.test(n)
    ) ?? wb.SheetNames[0];

  const ws = wb.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
    blankrows: false,
  }) as unknown[][];

  const chapters: S10Chapter[] = [];
  const resourceMap = new Map<string, S10Resource>(); // dedup por código

  let currentChapter: S10Chapter | null = null;
  let currentItem: S10Item | null = null;
  let apuSection = "";   // sección activa de APU
  let inApu = false;

  for (const row of rows) {
    if (row.every((c) => str(c) === "")) continue; // skip blank rows

    // Detectar columnas dinámicamente: S10 puede tener entre 6 y 10 columnas
    // Layout típico S10 venta:
    //   [0]=Código  [1]=Descripción  [2]=Und  [3]=Metrado  [4]=P.U.  [5]=Parcial
    // Layout APU dentro de presupuesto:
    //   [0]=Código  [1]=Descripción  [2]=Und  [3]=Cuadrilla  [4]=Cantidad  [5]=P.U.  [6]=Parcial

    const colCode  = str(row[0]);
    const colDesc  = str(row[1]);
    const colUnit  = str(row[2]);
    const colC3    = num(row[3]); // metrado o cuadrilla
    const colC4    = num(row[4]); // P.U. o rendimiento/cantidad
    const colC5    = num(row[5]); // parcial o P.U. (si hay 7 cols)
    const colC6    = num(row[6]); // parcial (si hay 7 cols)

    // ── Capítulo ──────────────────────────────────────────────────
    if (isChapter(colCode, colDesc)) {
      inApu = false;
      apuSection = "";
      currentItem = null;
      currentChapter = {
        code: colCode,
        name: colDesc.toUpperCase(),
        items: [],
      };
      chapters.push(currentChapter);
      continue;
    }

    // ── Partida ───────────────────────────────────────────────────
    if (isItem(colCode) && colDesc.length > 0 && colUnit.length > 0) {
      inApu = false;
      apuSection = "";
      // quantity y unit_price en presupuesto: col3=metrado, col4=P.U.
      const qty = colC3;
      const pu  = colC4 > 0 ? colC4 : colC5; // a veces P.U. está en col5
      currentItem = {
        item_code:   colCode,
        description: colDesc,
        unit:        colUnit,
        quantity:    qty,
        unit_price:  pu,
        apu_lines:   [],
      };
      if (!currentChapter) {
        // Si no hay capítulo aún, creamos uno genérico
        currentChapter = { code: "01", name: "PRESUPUESTO", items: [] };
        chapters.push(currentChapter);
      }
      currentChapter.items.push(currentItem);
      continue;
    }

    // ── Sección APU ("Mano de Obra", "Materiales", etc.) ──────────
    if (isApuSection(colDesc) && colCode === "") {
      apuSection = colDesc;
      inApu = true;
      continue;
    }

    // ── Línea de recurso APU ───────────────────────────────────────
    if (inApu && currentItem && colCode !== "" && colDesc.length > 0) {
      const rtype = detectResourceType(colCode, apuSection);

      // Layout APU S10: [0]=cod [1]=desc [2]=und [3]=cuadrilla [4]=rendimiento [5]=P.U. [6]=parcial
      // Si solo 6 cols: [3]=cantidad, [4]=P.U., [5]=parcial
      const hasCrew = row.length >= 7 && colC5 > 0;
      const crewSize     = hasCrew ? colC3 : 1;
      const qtyPerUnit   = hasCrew ? colC4 : colC3;
      const unitPrice    = hasCrew ? colC5 : colC4;

      const resource: S10Resource = {
        code:             colCode,
        description:      colDesc,
        unit:             colUnit,
        resource_type:    rtype,
        unit_price:       unitPrice,
        crew_size:        crewSize,
        quantity_per_unit: qtyPerUnit,
      };

      currentItem.apu_lines.push(resource);

      // Agregar al catálogo global (dedup)
      if (!resourceMap.has(colCode)) {
        resourceMap.set(colCode, resource);
      }
      continue;
    }
  }

  // Intentar también hoja APU dedicada (algunos S10 exportan APU en hoja separada)
  const apuSheetName = wb.SheetNames.find((n) => /apu|analisis/i.test(n));
  if (apuSheetName && apuSheetName !== sheetName) {
    const apuWs = wb.Sheets[apuSheetName];
    const apuRows: unknown[][] = XLSX.utils.sheet_to_json(apuWs, {
      header: 1,
      defval: "",
      blankrows: false,
    }) as unknown[][];

    let targetItem: S10Item | null = null;
    let apuSec = "";

    for (const row of apuRows) {
      const c0 = str(row[0]);
      const c1 = str(row[1]);
      const c2 = str(row[2]);
      const c3 = num(row[3]);
      const c4 = num(row[4]);
      const c5 = num(row[5]);
      const c6 = num(row[6]);

      // Referencia a partida
      if (isItem(c0) && c1.length > 0) {
        targetItem = chapters
          .flatMap((ch) => ch.items)
          .find((it) => it.item_code === c0) ?? null;
        apuSec = "";
        continue;
      }

      if (isApuSection(c1) && c0 === "") {
        apuSec = c1;
        continue;
      }

      if (targetItem && c0 !== "" && c1.length > 0) {
        const rtype = detectResourceType(c0, apuSec);
        const hasCrew7 = row.length >= 7 && c5 > 0;
        const res: S10Resource = {
          code:             c0,
          description:      c1,
          unit:             c2,
          resource_type:    rtype,
          unit_price:       hasCrew7 ? c5 : c4,
          crew_size:        hasCrew7 ? c3 : 1,
          quantity_per_unit: hasCrew7 ? c4 : c3,
        };
        // Solo agregar si no existe ya (la hoja presupuesto pudo haberlo incluido)
        if (!targetItem.apu_lines.find((l) => l.code === c0)) {
          targetItem.apu_lines.push(res);
        }
        if (!resourceMap.has(c0)) resourceMap.set(c0, res);
      }
    }
  }

  return {
    chapters: chapters.filter((ch) => ch.items.length > 0),
    resources: Array.from(resourceMap.values()),
  };
}

// ── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "No se recibió archivo" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls"].includes(ext ?? "")) {
      return NextResponse.json(
        { ok: false, error: "Solo se aceptan archivos .xlsx o .xls exportados desde S10" },
        { status: 400 }
      );
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: "El archivo excede 20 MB" },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const data = parseS10Excel(buf);

    if (data.chapters.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se detectaron capítulos ni partidas. Verifica que el archivo sea un Excel exportado desde S10 (Archivo → Exportar → Excel).",
        },
        { status: 422 }
      );
    }

    const totalItems = data.chapters.reduce((s, ch) => s + ch.items.length, 0);
    const totalApu   = data.chapters
      .flatMap((ch) => ch.items)
      .reduce((s, it) => s + it.apu_lines.length, 0);

    return NextResponse.json({
      ok: true,
      data,
      stats: {
        totalChapters: data.chapters.length,
        totalItems,
        totalApu,
        totalResources: data.resources.length,
      },
    });
  } catch (err: unknown) {
    console.error("[import-budget-s10]", err);
    return NextResponse.json(
      { ok: false, error: "Error al parsear el archivo. ¿Es un Excel válido de S10?" },
      { status: 500 }
    );
  }
}
