"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { S10Budget, S10Chapter, S10Item } from "@/app/api/import-budget-s10/route";

type Phase = "idle" | "parsing" | "preview" | "importing" | "done";

export function ImportS10Modal({
  budgetId,
  onClose,
  onImported,
}: {
  budgetId: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const sb       = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [phase,     setPhase]     = useState<Phase>("idle");
  const [file,      setFile]      = useState<File | null>(null);
  const [parsed,    setParsed]    = useState<S10Budget | null>(null);
  const [stats,     setStats]     = useState<{
    totalChapters: number;
    totalItems: number;
    totalApu: number;
    totalResources: number;
  } | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [progress,  setProgress]  = useState("");
  const [importApu, setImportApu] = useState(true);
  const [importRes, setImportRes] = useState(true);

  // ?????? Paso 1: Enviar Excel al parser ???????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
  async function handleParse() {
    if (!file) return;
    setError(null);
    setPhase("parsing");
    setProgress("Leyendo estructura del Excel S10...");

    try {
      const form = new FormData();
      form.append("file", file);

      const { data: sessionData } = await sb.auth.getSession();
      const headers: Record<string, string> = {};
      if (sessionData?.session?.access_token) {
        headers["Authorization"] = `Bearer ${sessionData.session.access_token}`;
      }

      const res = await fetch("/api/import-budget-s10", {
        method: "POST",
        headers,
        body: form,
      });

      if (!res.ok) {
        let errMsg = "Error al procesar el archivo en el servidor";
        try {
          const errJson = await res.json();
          errMsg = errJson.error || errMsg;
        } catch {
          if (res.status === 401 || res.status === 307) {
            errMsg = "Tu sesi??n ha expirado. Por favor recarga la p??gina.";
          }
        }
        throw new Error(errMsg);
      }

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error ?? "Error al parsear el archivo");
      }

      setParsed(json.data as S10Budget);
      setStats(json.stats);
      setPhase("preview");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      setPhase("idle");
    }
  }

  // ?????? Paso 2: Importar a Supabase ????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
  async function handleImport() {
    if (!parsed) return;
    setPhase("importing");
    setError(null);

    try {
      // 0. Reemplazar: limpiar el presupuesto actual antes de re-importar.
      // Nadie reimporta queriendo duplicar ??? el default seguro es reemplazar.
      // budget_items ??? apu_lines cae por CASCADE; chapters se borra despu??s
      // (budget_items.chapter_id es NO ACTION).
      setProgress("Limpiando presupuesto anterior...");
      const { error: delItemsErr } = await sb.from("budget_items").delete().eq("budget_id", budgetId);
      if (delItemsErr) throw new Error(`No se pudo limpiar el presupuesto anterior: ${delItemsErr.message}`);
      const { error: delChapErr } = await sb.from("budget_chapters").delete().eq("budget_id", budgetId);
      if (delChapErr) throw new Error(`No se pudo limpiar el presupuesto anterior: ${delChapErr.message}`);

      // 1. Importar cat??logo de recursos (opcional)
      if (importRes && parsed.resources.length > 0) {
        setProgress("Importando cat??logo de recursos...");

        // Obtener org_id del presupuesto
        const { data: budgetData } = await sb
          .from("budgets")
          .select("project_id, projects(organization_id)")
          .eq("id", budgetId)
          .single();

        const orgId = (budgetData?.projects as { organization_id: string } | null)
          ?.organization_id;

        if (orgId) {
          for (const res of parsed.resources) {
            // Upsert por c??digo + org para no duplicar
            await sb.from("resource_catalog").upsert(
              {
                organization_id: orgId,
                code:            res.code,
                name:            res.description,
                unit:            res.unit,
                resource_type:   res.resource_type,
                unit_price:      res.unit_price,
              },
              { onConflict: "organization_id,code", ignoreDuplicates: true }
            );
          }
        }
      }

      // 2. Importar cap??tulos y partidas usando import_budget_chunk (alta velocidad y sin timeouts)
      const MAX_ITEMS_PER_BATCH = 150;
      const MAX_CHAPTERS_PER_BATCH = 40;
      const batches: S10Chapter[][] = [];
      let currentBatch: S10Chapter[] = [];
      let currentBatchItems = 0;

      for (const ch of parsed.chapters) {
        if (
          (currentBatchItems > 0 && currentBatchItems + ch.items.length > MAX_ITEMS_PER_BATCH) ||
          currentBatch.length >= MAX_CHAPTERS_PER_BATCH
        ) {
          batches.push(currentBatch);
          currentBatch = [];
          currentBatchItems = 0;
        }
        currentBatch.push(ch);
        currentBatchItems += ch.items.length;
      }
      if (currentBatch.length > 0) batches.push(currentBatch);

      const totalItems = stats?.totalItems ?? parsed.chapters.reduce((s, c) => s + c.items.length, 0);
      let done = 0;

      for (let b = 0; b < batches.length; b++) {
        const { error: chunkErr } = await sb.rpc("import_budget_chunk", {
          p_budget_id: budgetId,
          p_chapters: batches[b].map((c) => ({
            code: c.code,
            name: c.name,
            level: c.level ?? 1,
            parent_code: c.parent_code ?? null,
            total: c.total ?? 0,
            items: c.items.map((it) => ({
              item_code: it.item_code,
              description: it.description,
              unit: it.unit || "und",
              quantity: it.quantity,
              unit_price: it.unit_price,
              total: it.total != null && it.total > 0 ? it.total : Number((it.quantity * it.unit_price).toFixed(2)),
            })),
          })),
          p_wipe: b === 0, // el primer lote limpia datos previos
        });
        if (chunkErr) throw new Error(chunkErr.message);
        done += batches[b].reduce((s, c) => s + c.items.length, 0);
        setProgress(`Importando partidas... ${done.toLocaleString("es-PE")} / ${totalItems.toLocaleString("es-PE")}`);
      }

      // 3. Importar l??neas APU (si existen y el usuario seleccion?? incluirlas)
      if (importApu && (stats?.totalApu ?? 0) > 0) {
        setProgress("Asociando an??lisis de precios unitarios (APU)...");
        const { data: dbItems, error: itemsErr } = await sb
          .from("budget_items")
          .select("id, item_code")
          .eq("budget_id", budgetId);
        if (itemsErr) throw new Error(itemsErr.message);

        const itemMap = new Map((dbItems ?? []).map((i) => [i.item_code, i.id]));
        const apuPayloads: any[] = [];

        for (const ch of parsed.chapters) {
          for (const it of ch.items) {
            const dbItemId = itemMap.get(it.item_code);
            if (!dbItemId || !it.apu_lines?.length) continue;
            for (const apu of it.apu_lines) {
              apuPayloads.push({
                budget_item_id:    dbItemId,
                resource_type:     apu.resource_type,
                description:       apu.description,
                unit:              apu.unit,
                crew_size:         apu.crew_size,
                quantity_per_unit: apu.quantity_per_unit,
                unit_price:        apu.unit_price,
              });
            }
          }
        }

        // Insertar en lotes de 100
        for (let i = 0; i < apuPayloads.length; i += 100) {
          const slice = apuPayloads.slice(i, i + 100);
          const { error: apuErr } = await sb.from("apu_lines").insert(slice);
          if (apuErr) throw new Error(apuErr.message);
        }
      }

      // 4. Recalcular totales con import_budget_finalize
      setProgress("Calculando totales del presupuesto...");
      const { data: finData, error: finErr } = await sb.rpc("import_budget_finalize", {
        p_budget_id: budgetId,
      });
      if (finErr) throw new Error(finErr.message);

      const finalInfo = finData as { chapters?: number; items?: number; total?: number } | null;
      const totalAmount = finalInfo?.total ?? 0;

      setPhase("done");
      toast.success(
        `Presupuesto S10 importado: ${stats?.totalItems ?? 0} partidas${
          importApu ? `, ${stats?.totalApu ?? 0} l??neas APU` : ""
        }`
      );
      setTimeout(() => {
        onImported();
        onClose();
      }, 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al importar");
      setPhase("preview");
    }
  }

  // ?????? UI ???????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Importar Excel de S10</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Sube el Excel que exportaste desde S10 ??? cap??tulos, partidas y APU se importan autom??ticamente
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">???</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-4">

          {/* IDLE / PARSING */}
          {(phase === "idle" || phase === "parsing") && (
            <>
              {/* Dropzone */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  file ? "border-emerald-400 bg-emerald-50" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
                }`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f && /\.(xlsx|xls)$/i.test(f.name)) setFile(f);
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <div className="text-3xl mb-3">????</div>
                {file ? (
                  <>
                    <p className="text-sm font-semibold text-emerald-700">{file.name}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {(file.size / 1024).toFixed(0)} KB ?? Haz clic para cambiar
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-slate-600">
                      Arrastra el Excel de S10 aqu?? o haz clic para seleccionar
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      .xlsx o .xls ?? M??x 20 MB
                    </p>
                  </>
                )}
              </div>

              {/* Instrucciones export S10 */}
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700 space-y-1">
                <p className="font-semibold">??C??mo exportar el Excel desde S10?</p>
                <p>En S10 Costos y Presupuestos: <span className="font-mono bg-blue-100 px-1 rounded">Archivo ??? Exportar ??? Microsoft Excel</span></p>
                <p>Exporta el presupuesto con APU incluido. El importador lee archivos .xlsx o .xls generados por S10 ??? no el archivo nativo .s10.</p>
              </div>

              {/* Opciones de importaci??n */}
              <div className="rounded-lg border border-slate-200 px-4 py-3 space-y-2">
                <p className="text-xs font-semibold text-slate-600">??Qu?? importar?</p>
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked
                    disabled
                    className="rounded"
                  />
                  <span>Cap??tulos y partidas <span className="text-slate-400">(siempre)</span></span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importApu}
                    onChange={(e) => setImportApu(e.target.checked)}
                    className="rounded"
                  />
                  <span>APU (l??neas de recursos por partida)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importRes}
                    onChange={(e) => setImportRes(e.target.checked)}
                    className="rounded"
                  />
                  <span>Cat??logo de recursos (materiales, MO, equipos)</span>
                </label>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
                  {error}
                </div>
              )}

              {phase === "parsing" && (
                <div className="flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700">
                  <span className="animate-spin text-base">???</span>
                  {progress}
                </div>
              )}
            </>
          )}

          {/* PREVIEW */}
          {phase === "preview" && parsed && stats && (
            <>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Cap??tulos",  value: stats.totalChapters },
                  { label: "Partidas",   value: stats.totalItems },
                  { label: "L??neas APU", value: stats.totalApu },
                  { label: "Recursos",   value: stats.totalResources },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                    <p className="text-xl font-bold text-slate-800">{s.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex-1 overflow-auto rounded-xl border border-slate-200 max-h-72">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-slate-500 w-24">C??digo</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-500">Descripci??n</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-500 w-14">Und</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500 w-20">Metrado</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500 w-24">P.U.</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500 w-24">Parcial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.chapters.map((chapter: S10Chapter, ci: number) => {
                      const lvl = chapter.level ?? 1;
                      const isMajor = lvl <= 2;
                      const isProcess = lvl === 3;
                      const isSub = lvl === 4;
                      return (
                        <>
                          <tr
                            key={`ch-${ci}`}
                            className={
                              isMajor
                                ? "bg-slate-800 text-white font-bold"
                                : isProcess
                                ? "bg-blue-100/90 text-blue-950 font-bold"
                                : isSub
                                ? "bg-slate-200/80 text-slate-800 font-semibold"
                                : "bg-slate-100 text-slate-700 font-medium"
                            }
                          >
                            <td className="px-3 py-1.5 font-mono text-xs">{chapter.code}</td>
                            <td className="px-3 py-1.5 uppercase" colSpan={4} style={{ paddingLeft: `${Math.max(lvl * 8, 12)}px` }}>
                              {chapter.name}
                            </td>
                            <td className="px-3 py-1.5 text-right font-bold">
                              {chapter.total != null && chapter.total > 0
                                ? chapter.total.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : ""}
                            </td>
                          </tr>
                          {chapter.items.map((item: S10Item, ii: number) => (
                            <>
                              <tr key={`it-${ci}-${ii}`} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-3 py-1 pl-5 text-slate-500 font-mono">{item.item_code}</td>
                                <td className="px-3 py-1 text-slate-700">{item.description}</td>
                                <td className="px-3 py-1 text-slate-500">{item.unit}</td>
                                <td className="px-3 py-1 text-right text-slate-600">{item.quantity.toFixed(2)}</td>
                                <td className="px-3 py-1 text-right text-slate-600">{item.unit_price.toFixed(2)}</td>
                                <td className="px-3 py-1 text-right font-medium text-slate-700">
                                  {(item.total != null && item.total > 0 ? item.total : item.quantity * item.unit_price).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            {importApu && item.apu_lines.map((apu, ai) => (
                              <tr key={`apu-${ci}-${ii}-${ai}`} className="bg-slate-50/50">
                                <td className="px-3 py-0.5 pl-8 text-slate-400 text-[10px]">{apu.code}</td>
                                <td className="px-3 py-0.5 text-slate-400 text-[10px] italic">{apu.description}</td>
                                <td className="px-3 py-0.5 text-slate-400 text-[10px]">{apu.unit}</td>
                                <td className="px-3 py-0.5 text-right text-slate-400 text-[10px]">{apu.quantity_per_unit.toFixed(3)}</td>
                                <td className="px-3 py-0.5 text-right text-slate-400 text-[10px]">{apu.unit_price.toFixed(2)}</td>
                                <td className="px-3 py-0.5 text-right text-slate-400 text-[10px]">
                                  {(apu.crew_size * apu.quantity_per_unit * apu.unit_price).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </>
                        ))}
                      </>
                    );
                  })}
                  </tbody>
                </table>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
                  {error}
                </div>
              )}

              <p className="text-xs text-slate-400">
                Revisa los datos antes de importar. Si hay partidas con valores en 0, puede ser que S10 use un
                formato diferente ??? cont??ctanos con una muestra del archivo.
              </p>
            </>
          )}

          {/* IMPORTING */}
          {phase === "importing" && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <span className="text-3xl animate-spin">???</span>
              <p className="text-sm font-medium text-slate-600">{progress || "Importando..."}</p>
              <p className="text-xs text-slate-400">Esto puede tomar unos segundos</p>
            </div>
          )}

          {/* DONE */}
          {phase === "done" && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <span className="text-3xl">????</span>
              <p className="text-sm font-semibold text-emerald-700">??Presupuesto importado correctamente!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          {phase === "preview" && (
            <button
              onClick={() => { setPhase("idle"); setParsed(null); }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              ??? Volver
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
              onClick={handleParse}
              disabled={!file}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Analizar Excel S10
            </button>
          )}
          {phase === "preview" && (
            <button
              onClick={handleImport}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Importar presupuesto
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
