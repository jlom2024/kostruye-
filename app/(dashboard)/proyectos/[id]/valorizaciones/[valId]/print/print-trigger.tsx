"use client";

import { useEffect } from "react";

export function PrintTrigger() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 800);
    return () => clearTimeout(t);
  }, []);
  return null;
}

export function PrintButton() {
  return (
    <button
      className="print-btn no-print"
      onClick={() => window.print()}
    >
      🖨 Imprimir / Guardar PDF
    </button>
  );
}
