"use client";

import { useState } from "react";
import { ImportS10Modal } from "./import-s10-modal";

export function ImportS10Button({
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
        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        Importar Excel S10
      </button>

      {open && (
        <ImportS10Modal
          budgetId={budgetId}
          onClose={() => setOpen(false)}
          onImported={() => {
            setOpen(false);
            onImported?.();
            window.location.reload(); // refrescar la vista del presupuesto (igual que el importador OCR)
          }}
        />
      )}
    </>
  );
}
