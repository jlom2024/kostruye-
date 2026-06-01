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
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        📄 Importar PDF (OCR)
      </button>

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
