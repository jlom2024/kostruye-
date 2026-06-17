"use client";

// ─────────────────────────────────────────────────────────────
// Panel de Fórmula Polinómica (D.S. 011-79-VC)
// Gestiona reajuste_formulas + reajuste_monomios de un proyecto.
// El factor K = Σ(coef_i × Ir_i/Io_i) se calcula en BD (fn_calc_factor_k);
// aquí se definen los monomios y se valida que Σcoef = 1.00.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus, X, Loader2, ChevronDown, ChevronRight,
  Trash2, Calculator, Sigma,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface IneiIndex {
  index_code: string;
  index_name: string;
  index_value?: number | null;
  period_year?: number | null;
  period_month?: number | null;
}

interface Monomio {
  id: string;
  formula_id: string;
  coefficient: number;
  index_code: string;
  description: string | null;
  symbol: string | null;
  sort_order: number;
}

interface Formula {
  id: string;
  project_id: string;
  name: string;
  budget_id: string | null;
  contract_date: string | null;
  notes: string | null;
  monomios: Monomio[];
}

interface Props {
  projectId: string;
  budgetId: string | null;
  ineiIndices: IneiIndex[];
  canEdit: boolean;
}

// Coeficientes deben sumar 1.00 (tolerancia ±0.001) — la BD lo valida ≤1.00
const COEFF_TOLERANCE = 0.001;

// ── Component ────────────────────────────────────────────────────────────────────

export function ReajustePanel({ projectId, budgetId, ineiIndices, canEdit }: Props) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: fs } = await supabase
      .from("reajuste_formulas")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at");

    const formulaList = (fs ?? []) as Omit<Formula, "monomios">[];
    const ids = formulaList.map((f) => f.id);

    let monomios: Monomio[] = [];
    if (ids.length) {
      const { data: ms } = await supabase
        .from("reajuste_monomios")
        .select("*")
        .in("formula_id", ids)
        .order("sort_order");
      monomios = (ms ?? []) as Monomio[];
    }

    setFormulas(
      formulaList.map((f) => ({
        ...f,
        monomios: monomios.filter((m) => m.formula_id === f.id),
      }))
    );
    setLoading(false);
  }, [supabase, projectId]);

  useEffect(() => {
    if (open && formulas.length === 0 && !loading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Formula actions ────────────────────────────────────────────────────────────
  async function createFormula() {
    if (!canEdit) { toast.error("No tienes permiso para editar fórmulas"); return; }
    setCreating(true);
    const { data, error } = await supabase
      .from("reajuste_formulas")
      .insert({
        project_id: projectId,
        budget_id: budgetId,
        name: `Fórmula ${formulas.length + 1}`,
      })
      .select()
      .single();
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    setFormulas((p) => [...p, { ...(data as Omit<Formula, "monomios">), monomios: [] }]);
    toast.success("Fórmula creada");
  }

  async function updateFormula(id: string, patch: Partial<Pick<Formula, "name" | "contract_date" | "notes">>) {
    setFormulas((p) => p.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  async function saveFormula(f: Formula) {
    if (!canEdit) return;
    const { error } = await supabase
      .from("reajuste_formulas")
      .update({ name: f.name, contract_date: f.contract_date || null, notes: f.notes })
      .eq("id", f.id);
    if (error) toast.error(error.message);
  }

  async function deleteFormula(id: string) {
    if (!canEdit) { toast.error("Sin permiso"); return; }
    if (!confirm("¿Eliminar la fórmula y todos sus monomios?")) return;
    const { error } = await supabase.from("reajuste_formulas").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setFormulas((p) => p.filter((f) => f.id !== id));
    toast.success("Fórmula eliminada");
  }

  // ── Monomio actions ──────────────────────────────────────────────────────────────
  async function addMonomio(formula: Formula) {
    if (!canEdit) { toast.error("Sin permiso"); return; }
    const used = sumCoeff(formula);
    const remaining = Math.max(0, 1 - used);
    const def = ineiIndices[0];
    const { data, error } = await supabase
      .from("reajuste_monomios")
      .insert({
        formula_id: formula.id,
        coefficient: Number(remaining.toFixed(3)),
        index_code: def?.index_code ?? "21",
        symbol: String.fromCharCode(65 + formula.monomios.length), // A, B, C…
        sort_order: formula.monomios.length,
      })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setFormulas((p) =>
      p.map((f) => (f.id === formula.id ? { ...f, monomios: [...f.monomios, data as Monomio] } : f))
    );
  }

  function updateMonomioLocal(formulaId: string, monomioId: string, patch: Partial<Monomio>) {
    setFormulas((p) =>
      p.map((f) =>
        f.id === formulaId
          ? { ...f, monomios: f.monomios.map((m) => (m.id === monomioId ? { ...m, ...patch } : m)) }
          : f
      )
    );
  }

  async function saveMonomio(m: Monomio) {
    if (!canEdit) return;
    const { error } = await supabase
      .from("reajuste_monomios")
      .update({
        coefficient: Number(m.coefficient),
        index_code: m.index_code,
        symbol: m.symbol,
        description: m.description,
      })
      .eq("id", m.id);
    // El trigger fn_check_reajuste_coeff puede rechazar si Σcoef > 1.00
    if (error) {
      toast.error(error.message.includes("Coeficientes") ? "Los coeficientes superan 1.00" : error.message);
      load(); // revertir al estado de BD
    }
  }

  async function deleteMonomio(formulaId: string, monomioId: string) {
    if (!canEdit) return;
    const { error } = await supabase.from("reajuste_monomios").delete().eq("id", monomioId);
    if (error) { toast.error(error.message); return; }
    setFormulas((p) =>
      p.map((f) =>
        f.id === formulaId ? { ...f, monomios: f.monomios.filter((m) => m.id !== monomioId) } : f
      )
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────────
  function sumCoeff(f: Formula) {
    return f.monomios.reduce((s, m) => s + Number(m.coefficient || 0), 0);
  }

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Sigma className="h-4 w-4 text-blue-600" />
          Fórmula Polinómica de Reajuste
          <span className="text-xs font-normal text-slate-400">(D.S. 011-79-VC)</span>
        </span>
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando fórmulas…
            </div>
          ) : (
            <>
              {formulas.length === 0 && (
                <p className="text-xs text-slate-400">
                  No hay fórmulas definidas. {canEdit && "Crea una para reajustar valorizaciones por índices INEI."}
                </p>
              )}

              {formulas.map((f) => {
                const sum = sumCoeff(f);
                const balanced = Math.abs(sum - 1) <= COEFF_TOLERANCE;
                return (
                  <div key={f.id} className="rounded-lg border border-slate-200 p-4 space-y-3">
                    {/* Cabecera fórmula */}
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        value={f.name}
                        disabled={!canEdit}
                        onChange={(e) => updateFormula(f.id, { name: e.target.value })}
                        onBlur={() => saveFormula(f)}
                        className="flex-1 min-w-[160px] rounded-md border border-slate-200 px-2.5 py-1.5 text-sm font-medium disabled:bg-slate-50"
                      />
                      <label className="flex items-center gap-1.5 text-xs text-slate-500">
                        Fecha base (Io)
                        <input
                          type="date"
                          value={f.contract_date ?? ""}
                          disabled={!canEdit}
                          onChange={(e) => updateFormula(f.id, { contract_date: e.target.value })}
                          onBlur={() => saveFormula(f)}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs disabled:bg-slate-50"
                        />
                      </label>
                      {canEdit && (
                        <button
                          onClick={() => deleteFormula(f.id)}
                          className="text-slate-400 hover:text-red-500"
                          title="Eliminar fórmula"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Monomios */}
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-[40px_90px_1fr_32px] gap-2 px-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                        <span>Símb.</span>
                        <span>Coef.</span>
                        <span>Índice INEI</span>
                        <span />
                      </div>
                      {f.monomios.map((m) => (
                        <div key={m.id} className="grid grid-cols-[40px_90px_1fr_32px] gap-2 items-center">
                          <input
                            value={m.symbol ?? ""}
                            disabled={!canEdit}
                            onChange={(e) => updateMonomioLocal(f.id, m.id, { symbol: e.target.value })}
                            onBlur={() => saveMonomio(m)}
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs text-center disabled:bg-slate-50"
                          />
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            max="1"
                            value={m.coefficient}
                            disabled={!canEdit}
                            onChange={(e) => updateMonomioLocal(f.id, m.id, { coefficient: Number(e.target.value) })}
                            onBlur={() => saveMonomio(m)}
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs text-right disabled:bg-slate-50"
                          />
                          <div className="flex flex-col gap-0.5">
                            <select
                              value={m.index_code}
                              disabled={!canEdit}
                              onChange={(e) => {
                                updateMonomioLocal(f.id, m.id, { index_code: e.target.value });
                                saveMonomio({ ...m, index_code: e.target.value });
                              }}
                              className="rounded-md border border-slate-200 px-2 py-1 text-xs disabled:bg-slate-50"
                            >
                              {ineiIndices.map((idx) => (
                                <option key={idx.index_code} value={idx.index_code}>
                                  {idx.index_code} — {idx.index_name}
                                </option>
                              ))}
                            </select>
                            {(() => {
                              const idx = ineiIndices.find((i) => i.index_code === m.index_code);
                              if (!idx?.index_value) return null;
                              const mon = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][(idx.period_month ?? 1) - 1];
                              return (
                                <span className="pl-1 font-mono text-[10px] leading-tight text-slate-400">
                                  Valor actual: <span className="text-slate-600">{idx.index_value.toFixed(2)}</span> · {mon} {idx.period_year}
                                </span>
                              );
                            })()}
                          </div>
                          {canEdit && (
                            <button
                              onClick={() => deleteMonomio(f.id, m.id)}
                              className="text-slate-300 hover:text-red-500"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}

                      {canEdit && (
                        <button
                          onClick={() => addMonomio(f)}
                          className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                        >
                          <Plus className="h-3.5 w-3.5" /> Agregar monomio
                        </button>
                      )}
                    </div>

                    {/* Suma de coeficientes */}
                    <div
                      className={cn(
                        "flex items-center justify-between rounded-md px-3 py-2 text-xs",
                        balanced ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <Calculator className="h-3.5 w-3.5" />
                        Σ coeficientes
                      </span>
                      <span className="font-mono font-semibold">
                        {sum.toFixed(3)} {balanced ? "✓" : "(debe sumar 1.000)"}
                      </span>
                    </div>
                  </div>
                );
              })}

              {canEdit && (
                <button
                  onClick={createFormula}
                  disabled={creating}
                  className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                >
                  {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Nueva fórmula
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
