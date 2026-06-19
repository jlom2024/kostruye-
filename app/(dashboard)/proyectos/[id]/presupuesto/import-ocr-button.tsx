"use client";

import { useState } from "react";
import { ImportOcrModal } from "./import-ocr-modal";

export function ImportOcrButton({
  budgetId,
  onImported,
}: {
  budgetId: string;
  onImported?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="group relative">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          📄 Importar PDF (OCR)
        </button>
        {/* Tooltip: PDF digital sale exacto; el escaneado puede traer mínimos errores */}
        <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-72 rounded-lg bg-slate-800 px-3 py-2.5 text-xs leading-relaxed text-slate-100 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
          En PDFs <strong>digitales</strong> la importación es exacta (se verifica contra el costo directo del propio PDF). En PDFs <strong>escaneados</strong> puede haber mínimos errores de lectura — para máxima seguridad, usa siempre el <strong>Importar Excel S10</strong>.
          <span className="absolute -top-1 right-6 h-2 w-2 rotate-45 bg-slate-800" />
        </div>
      </div>

      {open && (
        <ImportOcrModal
          budgetId={budgetId}
          onClose={() => setOpen(false)}
          onImported={() => { onImported?.(); window.location.reload(); }}
        />
      )}
    </>
  );
}
