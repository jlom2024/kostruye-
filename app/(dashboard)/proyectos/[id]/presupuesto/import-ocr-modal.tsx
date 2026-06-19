"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────
type ExtractedItem = {
  item_code: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
};

type ExtractedChapter = {
  code: string;
  name: string;
  items: ExtractedItem[];
};

type ExtractedBudget = {
  chapters: ExtractedChapter[];
};

type Phase = "idle" | "uploading" | "preview" | "importing" | "done";

// ── Component ──────────────────────────────────────────────────────
export function ImportOcrModal({
  budgetId,
  onClose,
  onImported,
}: {
  budgetId: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const sb        = createClient();
  const inputRef  = useRef<HTMLInputElement>(null);

  const [phase,     setPhase]     = useState<Phase>("idle");
  const [file,      setFile]      = useState<File | null>(null);
  const [extracted, setExtracted] = useState<ExtractedBudget | null>(null);
  const [stats,     setStats]     = useState<{ totalChapters: number; totalItems: number } | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [progress,  setProgress]  = useState("");

  // ── Step 1: OCR extraction ─────────────────────────────────────
  async function handleExtract() {
    if (!file) return;
    setError(null);
    setPhase("uploading");
    setProgress("Enviando PDF a Claude Vision...");

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/import-budget-ocr", {
        method: "POST",
        body: form,
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Error desconocido en OCR");
      }

      setExtracted(json.data);
      setStats(json.stats);
      setPhase("preview");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al extraer presupuesto");
      setPhase("idle");
    }
  }

  // ── Step 2: Import to Supabase ─────────────────────────────────
  async function handleImport() {
    if (!extracted) return;
    setPhase("importing");
    setError(null);

    try {
      // Limpiar datos previos antes de insertar
      await sb.from("budget_items").delete().eq("budget_id", budgetId);
      await sb.from("budget_chapters").delete().eq("budget_id", budgetId);

      let sortChapter = 0;
      for (const chapter of extracted.chapters) {
        sortChapter++;
        setProgress(`Importando capítulo ${chapter.code}...`);

        // Insert chapter
        const { data: chap, error: chapErr } = await sb
          .from("budget_chapters")
          .insert({
            budget_id:  budgetId,
            code:       chapter.code,
            name:       chapter.name,
            level:      1,
            sort_order: sortChapter * 10,
            total:      chapter.items.reduce((s, i) => s + i.quantity * i.unit_price, 0),
          })
          .select("id")
          .single();

        if (chapErr) throw new Error(`Capítulo ${chapter.code}: ${chapErr.message}`);

        // Insert items
        let sortItem = 0;
        for (const item of chapter.items) {
          sortItem++;
          const { error: itemErr } = await sb.from("budget_items").insert({
            budget_id:   budgetId,
            chapter_id:  chap.id,
            item_code:   item.item_code,
            description: item.description,
            unit:        item.unit || "und",
            quantity:    item.quantity || 0,
            unit_price:  item.unit_price || 0,
            sort_order:  sortItem * 10,
          });
          if (itemErr) throw new Error(`Partida ${item.item_code}: ${itemErr.message}`);
        }
      }

      // Recalculate budget total
      const { data: allItems } = await sb
        .from("budget_items")
        .select("total")
        .eq("budget_id", budgetId);
      const newTotal = (allItems ?? []).reduce((s, i) => s + Number(i.total), 0);
      await sb.from("budgets").update({ total: newTotal }).eq("id", budgetId);

      setPhase("done");
      toast.success(`${stats?.totalItems ?? 0} partidas importadas correctamente`);
      setTimeout(() => { onImported(); onClose(); }, 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al importar");
      setPhase("preview");
    }
  }

  // ── UI ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Importar presupuesto por OCR</h2>
            <p className="text-xs text-slate-400 mt-0.5">Sube un PDF (incluso escaneado) — Claude extrae la estructura automáticamente</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-5">

          {/* IDLE / UPLOAD */}
          {(phase === "idle" || phase === "uploading") && (
            <>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  file ? "border-blue-400 bg-blue-50" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
                }`}
                onClick={() => inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); }}
                onDrop={e => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f?.type === "application/pdf") setFile(f);
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                />
                <div className="text-3xl mb-3">📄</div>
                {file ? (
                  <>
                    <p className="text-sm font-semibold text-blue-700">{file.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(0)} KB · Haz clic para cambiar</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-slate-600">Arrastra el PDF aquí o haz clic para seleccionar</p>
                    <p className="text-xs text-slate-400 mt-1">PDF de presupuesto · Máx 32 MB · Funciona con PDFs escaneados</p>
                  </>
                )}
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700">
                <strong>¿Cómo funciona?</strong> Claude analiza cada página del PDF — incluso si es una imagen escaneada — e identifica capítulos, partidas, unidades, metrados y precios unitarios. El resultado se muestra para revisión antes de importar.
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
                  {error}
                </div>
              )}

              {phase === "uploading" && (
                <div className="flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700">
                  <span className="animate-spin text-base">⏳</span>
                  {progress || "Procesando PDF con OCR..."}
                </div>
              )}
            </>
          )}

          {/* PREVIEW */}
          {phase === "preview" && extracted && stats && (
            <>
              <div className="flex items-center gap-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Extracción exitosa</p>
                  <p className="text-xs text-emerald-600">
                    {stats.totalChapters} capítulos · {stats.totalItems} partidas detectadas
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-auto rounded-xl border border-slate-200 max-h-80">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-slate-500 w-20">Código</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-500">Descripción</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-500 w-16">Und</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500 w-20">Metrado</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500 w-24">P.U.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extracted.chapters.map((chapter, ci) => (
                      <>
                        <tr key={`ch-${ci}`} className="bg-slate-100">
                          <td className="px-3 py-1.5 font-bold text-slate-700">{chapter.code}</td>
                          <td className="px-3 py-1.5 font-bold text-slate-700 uppercase" colSpan={4}>
                            {chapter.name}
                          </td>
                        </tr>
                        {chapter.items.map((item, ii) => (
                          <tr key={`it-${ci}-${ii}`} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="px-3 py-1 pl-5 text-slate-500">{item.item_code}</td>
                            <td className="px-3 py-1 text-slate-700">{item.description}</td>
                            <td className="px-3 py-1 text-slate-500">{item.unit}</td>
                            <td className="px-3 py-1 text-right text-slate-600">{Number(item.quantity).toFixed(2)}</td>
                            <td className="px-3 py-1 text-right text-slate-600">{Number(item.unit_price).toFixed(2)}</td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
                  {error}
                </div>
              )}

              <p className="text-xs text-slate-400">
                Revisa los datos extraídos. Si hay errores menores, puedes editarlos manualmente después de importar.
              </p>
            </>
          )}

          {/* IMPORTING */}
          {phase === "importing" && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <span className="text-3xl animate-spin">⏳</span>
              <p className="text-sm font-medium text-slate-600">{progress || "Importando partidas..."}</p>
              <p className="text-xs text-slate-400">Esto puede tomar unos segundos</p>
            </div>
          )}

          {/* DONE */}
          {phase === "done" && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <span className="text-3xl">🎉</span>
              <p className="text-sm font-semibold text-emerald-700">¡Presupuesto importado!</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          {phase === "preview" && (
            <button
              onClick={() => { setPhase("idle"); setExtracted(null); }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              ← Volver
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          {phase === "idle" && (
            <button
              onClick={handleExtract}
              disabled={!file}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Extraer presupuesto
            </button>
          )}
          {phase === "preview" && (
            <button
              onClick={handleImport}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Importar al presupuesto
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
