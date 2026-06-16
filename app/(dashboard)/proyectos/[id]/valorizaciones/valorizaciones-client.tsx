"use client";

import React, { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus, X, Loader2, ChevronDown, ChevronRight,
  TrendingUp, Trash2, FileCheck, FileText, CheckCircle2, Sigma, RefreshCw,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ValStatus = "draft" | "submitted" | "approved";

interface Valorizacion {
  id: string;
  val_number: number;
  period_name: string;
  start_date: string;
  end_date: string;
  status: ValStatus;
  total_amount: number;
  notes: string | null;
  reajuste_formula_id: string | null;
  factor_k: number;
  monto_reajuste: number;
}

interface FormulaLite {
  id: string;
  name: string;
  contract_date: string | null;
}

interface BudgetItemRaw {
  id: string;
  item_code: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number;
  chapter_id: string | null;
  budget_chapters: { id: string; name: string; code: string } | null;
}

interface ValItem {
  id: string;
  budget_item_id: string;
  prev_percent: number;
  period_percent: number;
  cumul_percent: number;
  item_total: number;
  period_amount: number;
  cumul_amount: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ValStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  draft:     { label: "Borrador",    color: "text-slate-600",  bg: "bg-slate-100",  icon: <FileText className="h-3.5 w-3.5" /> },
  submitted: { label: "Presentada",  color: "text-blue-700",   bg: "bg-blue-100",   icon: <FileCheck className="h-3.5 w-3.5" /> },
  approved:  { label: "Aprobada",    color: "text-green-700",  bg: "bg-green-100",  icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
  currency: string;
  budgetId: string | null;
  ventaTotal: number;
  initialValorizaciones: Valorizacion[];
  /** ¿El usuario puede aprobar valorizaciones? (permiso valorizaciones.approve) */
  canApprove: boolean;
  /** Fórmulas polinómicas del proyecto (para reajuste por factor K) */
  formulas: FormulaLite[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ValorizacionesClient({
  projectId,
  currency,
  budgetId,
  ventaTotal,
  initialValorizaciones,
  canApprove,
  formulas,
}: Props) {
  const supabase = createClient();
  const sym = currency === "PEN" ? "S/" : "$";

  const [vals, setVals] = useState<Valorizacion[]>(initialValorizaciones);

  // Expanded period data
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [budgetItems, setBudgetItems] = useState<BudgetItemRaw[]>([]);  // cached once
  const [valItems, setValItems] = useState<Record<string, ValItem[]>>({}); // by valId
  const [loadingExpand, setLoadingExpand] = useState(false);

  // New period panel
  const [panel, setPanel] = useState(false);
  const [form, setForm] = useState({ period_name: "", start_date: "", end_date: "", notes: "" });
  const [saving, setSaving] = useState(false);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function fmt(n: number) {
    return `${sym} ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function fmtPct(n: number) {
    return `${n.toFixed(2)}%`;
  }

  // Obtener budget items (cacheados)
  const getBudgetItems = useCallback(async (): Promise<BudgetItemRaw[]> => {
    if (budgetItems.length > 0) return budgetItems;
    if (!budgetId) return [];
    const { data, error } = await supabase
      .from("budget_items")
      .select("*, budget_chapters(id, name, code)")
      .eq("budget_id", budgetId)
      .order("sort_order");
    if (error) { toast.error(error.message); return []; }
    const items = (data ?? []) as BudgetItemRaw[];
    setBudgetItems(items);
    return items;
  }, [budgetItems, budgetId, supabase]);

  // ── Expand period ──────────────────────────────────────────────────────────

  async function expandVal(valId: string) {
    if (expandedId === valId) { setExpandedId(null); return; }
    setExpandedId(valId);
    if (valItems[valId]) return; // ya cargado

    setLoadingExpand(true);
    const [items, { data: vi }] = await Promise.all([
      getBudgetItems(),
      supabase.from("valorizacion_items").select("*").eq("valorizacion_id", valId),
    ]);
    setLoadingExpand(false);

    // Map items con val data
    const viMap = new Map((vi ?? []).map((x) => [x.budget_item_id, x as ValItem]));
    const merged: ValItem[] = items.map((it) => {
      const existing = viMap.get(it.id);
      return existing ?? {
        id: "",
        budget_item_id: it.id,
        prev_percent: 0,
        period_percent: 0,
        cumul_percent: 0,
        item_total: it.total,
        period_amount: 0,
        cumul_amount: 0,
      };
    });
    setValItems((p) => ({ ...p, [valId]: merged }));
  }

  // ── Update item locally ────────────────────────────────────────────────────

  function updateValItem(valId: string, budgetItemId: string, periodPct: number) {
    setValItems((prev) => {
      const list = prev[valId] ?? [];
      return {
        ...prev,
        [valId]: list.map((vi) => {
          if (vi.budget_item_id !== budgetItemId) return vi;
          const item = budgetItems.find((b) => b.id === budgetItemId);
          const itemTotal = item?.total ?? vi.item_total;
          const safePct = Math.min(Math.max(0, periodPct), 100 - vi.prev_percent);
          const cumulPct = vi.prev_percent + safePct;
          return {
            ...vi,
            period_percent: safePct,
            cumul_percent: cumulPct,
            item_total: itemTotal,
            period_amount: (safePct / 100) * itemTotal,
            cumul_amount: (cumulPct / 100) * itemTotal,
          };
        }),
      };
    });
  }

  // ── Save item on blur ──────────────────────────────────────────────────────

  async function saveValItem(valId: string, budgetItemId: string) {
    const vi = (valItems[valId] ?? []).find((x) => x.budget_item_id === budgetItemId);
    if (!vi) return;

    const payload = {
      valorizacion_id: valId,
      budget_item_id:  budgetItemId,
      prev_percent:    vi.prev_percent,
      period_percent:  vi.period_percent,
      cumul_percent:   vi.cumul_percent,
      item_total:      vi.item_total,
      period_amount:   vi.period_amount,
      cumul_amount:    vi.cumul_amount,
    };

    if (vi.id) {
      await supabase.from("valorizacion_items").update(payload).eq("id", vi.id);
    } else {
      const { data } = await supabase
        .from("valorizacion_items")
        .upsert(payload, { onConflict: "valorizacion_id,budget_item_id" })
        .select()
        .single();
      if (data) {
        setValItems((prev) => ({
          ...prev,
          [valId]: prev[valId].map((x) =>
            x.budget_item_id === budgetItemId ? { ...x, id: (data as ValItem).id } : x
          ),
        }));
      }
    }

    // Refresh val totals
    const { data: updated } = await supabase
      .from("valorizaciones")
      .select("total_amount")
      .eq("id", valId)
      .single();
    if (updated) {
      setVals((prev) =>
        prev.map((v) => v.id === valId ? { ...v, total_amount: (updated as { total_amount: number }).total_amount } : v)
      );
    }
  }

  // ── Create new valorización ────────────────────────────────────────────────

  async function createVal() {
    if (!form.start_date || !form.end_date) { toast.error("Fechas requeridas"); return; }
    if (!budgetId) { toast.error("Este proyecto no tiene presupuesto venta"); return; }

    setSaving(true);

    // Número siguiente
    const nextNum = vals.length > 0 ? Math.max(...vals.map((v) => v.val_number)) + 1 : 1;
    const name = form.period_name.trim() ||
      `Valorización N° ${nextNum}`;

    // Crear valorización
    const { data: newVal, error } = await supabase
      .from("valorizaciones")
      .insert({
        project_id:  projectId,
        val_number:  nextNum,
        period_name: name,
        start_date:  form.start_date,
        end_date:    form.end_date,
        notes:       form.notes.trim() || null,
      })
      .select()
      .single();

    if (error) { toast.error(error.message); setSaving(false); return; }

    // Obtener items previos (para prev_percent)
    const prevVal = vals.length > 0 ? vals[vals.length - 1] : null;
    let prevMap: Map<string, number> = new Map();
    if (prevVal) {
      const { data: prevItems } = await supabase
        .from("valorizacion_items")
        .select("budget_item_id, cumul_percent")
        .eq("valorizacion_id", prevVal.id);
      prevMap = new Map((prevItems ?? []).map((x) => [x.budget_item_id, x.cumul_percent]));
    }

    // Obtener budget items
    const items = await getBudgetItems();

    // Insertar val_items con prev_percent
    if (items.length > 0) {
      await supabase.from("valorizacion_items").insert(
        items.map((it) => {
          const prev = prevMap.get(it.id) ?? 0;
          return {
            valorizacion_id: (newVal as Valorizacion).id,
            budget_item_id:  it.id,
            prev_percent:    prev,
            period_percent:  0,
            cumul_percent:   prev,
            item_total:      it.total,
            period_amount:   0,
            cumul_amount:    (prev / 100) * it.total,
          };
        })
      );
    }

    setSaving(false);
    setPanel(false);
    setForm({ period_name: "", start_date: "", end_date: "", notes: "" });
    toast.success(`${name} creada`);
    setVals((p) => [...p, newVal as Valorizacion]);
    // Expandir automáticamente
    setExpandedId((newVal as Valorizacion).id);
    setValItems((prev) => ({
      ...prev,
      [(newVal as Valorizacion).id]: items.map((it) => {
        const prevPct = prevMap.get(it.id) ?? 0;
        return {
          id: "",
          budget_item_id: it.id,
          prev_percent: prevPct,
          period_percent: 0,
          cumul_percent: prevPct,
          item_total: it.total,
          period_amount: 0,
          cumul_amount: (prevPct / 100) * it.total,
        };
      }),
    }));
  }

  // ── Change status ──────────────────────────────────────────────────────────

  async function changeStatus(val: Valorizacion, status: ValStatus) {
    // Guard de UI: aprobar requiere permiso valorizaciones.approve.
    // La RLS de la BD es la barrera definitiva; esto evita el intento inútil.
    if (status === "approved" && !canApprove) {
      toast.error("No tienes permiso para aprobar valorizaciones");
      return;
    }
    const { error } = await supabase
      .from("valorizaciones")
      .update({ status })
      .eq("id", val.id);
    if (error) { toast.error(error.message); return; }
    toast.success(STATUS_CFG[status].label);
    setVals((p) => p.map((v) => v.id === val.id ? { ...v, status } : v));
  }

  // ── Reajuste polinómico (factor K) ───────────────────────────────────────────
  // K se calcula en BD vía fn_calc_factor_k usando:
  //   período base (Io) = fecha de contrato de la fórmula
  //   período valorización (Ir) = mes del end_date de la valorización
  // monto_reajuste = (K − 1) × monto valorizado
  async function calcReajuste(val: Valorizacion, formulaId: string) {
    const formula = formulas.find((f) => f.id === formulaId);
    if (!formula) { toast.error("Fórmula no encontrada"); return; }
    if (!formula.contract_date) {
      toast.error("La fórmula necesita una fecha base (contrato) para calcular K");
      return;
    }
    if (!val.end_date) { toast.error("La valorización necesita fecha de fin de período"); return; }

    const base = new Date(formula.contract_date);
    const period = new Date(val.end_date);

    const { data, error } = await supabase.rpc("fn_calc_factor_k", {
      p_formula_id: formulaId,
      p_base_year:  base.getUTCFullYear(),
      p_base_month: base.getUTCMonth() + 1,
      p_val_year:   period.getUTCFullYear(),
      p_val_month:  period.getUTCMonth() + 1,
    });
    if (error) { toast.error(error.message); return; }

    const k = Number(data ?? 1);
    const montoReajuste = (k - 1) * Number(val.total_amount);

    const { error: upErr } = await supabase
      .from("valorizaciones")
      .update({ reajuste_formula_id: formulaId, factor_k: k, monto_reajuste: montoReajuste })
      .eq("id", val.id);
    if (upErr) { toast.error(upErr.message); return; }

    setVals((p) =>
      p.map((v) =>
        v.id === val.id
          ? { ...v, reajuste_formula_id: formulaId, factor_k: k, monto_reajuste: montoReajuste }
          : v
      )
    );
    toast.success(`Factor K = ${k.toFixed(4)} aplicado`);
  }

  async function deleteVal(val: Valorizacion) {
    if (!confirm(`¿Eliminar ${val.period_name}?`)) return;
    const { error } = await supabase.from("valorizaciones").delete().eq("id", val.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Valorización eliminada");
    setVals((p) => p.filter((v) => v.id !== val.id));
    if (expandedId === val.id) setExpandedId(null);
  }

  // ── Derived KPIs ──────────────────────────────────────────────────────────

  const approvedTotal = vals.filter((v) => v.status === "approved").reduce((s, v) => s + v.total_amount, 0);
  const submittedTotal = vals.filter((v) => v.status === "submitted").reduce((s, v) => s + v.total_amount, 0);
  const pctApproved = ventaTotal > 0 ? Math.min(100, (approvedTotal / ventaTotal) * 100) : 0;
  const pctSubmitted = ventaTotal > 0 ? Math.min(100, (submittedTotal / ventaTotal) * 100) : 0;

  // Agrupar items por capítulo
  function groupByChapter(items: BudgetItemRaw[], viList: ValItem[]) {
    const viMap = new Map(viList.map((x) => [x.budget_item_id, x]));
    const chapters: Map<string, { name: string; code: string; rows: Array<{ item: BudgetItemRaw; vi: ValItem }> }> = new Map();
    const NO_CHAPTER = "__none__";

    for (const item of items) {
      const key = item.chapter_id ?? NO_CHAPTER;
      const chapterName = item.budget_chapters?.name ?? "Sin capítulo";
      const chapterCode = item.budget_chapters?.code ?? "";
      if (!chapters.has(key)) {
        chapters.set(key, { name: chapterName, code: chapterCode, rows: [] });
      }
      const vi = viMap.get(item.id) ?? {
        id: "", budget_item_id: item.id,
        prev_percent: 0, period_percent: 0, cumul_percent: 0,
        item_total: item.total, period_amount: 0, cumul_amount: 0,
      };
      chapters.get(key)!.rows.push({ item, vi });
    }
    return [...chapters.values()];
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className={cn("flex flex-1 flex-col overflow-y-auto", panel && "mr-[460px]")}>

        {/* ── Toolbar ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <h2 className="text-sm font-semibold text-slate-700">
            {vals.length} valorización{vals.length !== 1 ? "es" : ""}
          </h2>
          <button
            onClick={() => setPanel(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nueva valorización
          </button>
        </div>

        {/* ── KPI bar ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 p-6 pb-0">
          <KpiCard
            label="Contrato (venta)"
            value={fmt(ventaTotal)}
            sub="Presupuesto base"
            color="text-slate-700"
          />
          <KpiCard
            label="Valorizado aprobado"
            value={fmt(approvedTotal)}
            sub={`${fmtPct(pctApproved)} del contrato`}
            color="text-green-700"
          />
          <KpiCard
            label="En revisión"
            value={fmt(submittedTotal)}
            sub={`${fmtPct(pctSubmitted)} del contrato`}
            color="text-blue-700"
          />
        </div>

        {/* Barra de progreso */}
        {ventaTotal > 0 && (
          <div className="mx-6 mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avance valorizado</span>
              <span className="text-xs font-bold text-slate-700">{fmtPct(pctApproved + pctSubmitted)}</span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${pctApproved}%` }} />
              <div className="h-full bg-blue-400 transition-all" style={{ width: `${pctSubmitted}%` }} />
            </div>
            <div className="flex gap-4 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" /> Aprobado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-400" /> En revisión
              </span>
            </div>
          </div>
        )}

        {/* ── Lista de valorizaciones ───────────────────────────────────────── */}
        <div className="p-6 space-y-3">

          {vals.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
              <TrendingUp className="mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">Sin valorizaciones</p>
              <p className="mt-1 text-xs text-slate-400">Crea la primera con "Nueva valorización"</p>
            </div>
          ) : (
            vals.map((val) => {
              const isOpen = expandedId === val.id;
              const cfg = STATUS_CFG[val.status];
              const viList = valItems[val.id] ?? [];
              const periodTotal = viList.reduce((s, x) => s + x.period_amount, 0);

              return (
                <div key={val.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">

                  {/* Header */}
                  <div
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => expandVal(val.id)}
                  >
                    <div className="flex items-center gap-3">
                      {isOpen
                        ? <ChevronDown className="h-4 w-4 text-slate-400" />
                        : <ChevronRight className="h-4 w-4 text-slate-400" />}
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{val.period_name}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(val.start_date + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short" })} —{" "}
                          {new Date(val.end_date + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <div className="text-right mr-1">
                        <p className="text-xs text-slate-400">Monto período</p>
                        <p className="text-sm font-bold text-slate-900">{fmt(val.total_amount)}</p>
                      </div>

                      {/* Status badge */}
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", cfg.bg, cfg.color)}>
                        {cfg.icon}
                        {cfg.label}
                      </span>

                      {/* Inline action buttons */}
                      {val.status === "draft" && (
                        <button
                          onClick={() => changeStatus(val, "submitted")}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors whitespace-nowrap"
                        >
                          <FileCheck className="h-3 w-3" /> En revisión
                        </button>
                      )}
                      {val.status === "submitted" && (
                        <>
                          <button
                            onClick={() => changeStatus(val, "draft")}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors whitespace-nowrap"
                          >
                            Borrador
                          </button>
                          {canApprove && (
                            <button
                              onClick={() => changeStatus(val, "approved")}
                              className="inline-flex items-center gap-1 rounded-lg border border-green-300 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors whitespace-nowrap"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Aprobar
                            </button>
                          )}
                        </>
                      )}
                      {val.status === "approved" && (
                        <button
                          onClick={() => changeStatus(val, "submitted")}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-400 hover:bg-slate-100 transition-colors whitespace-nowrap"
                        >
                          En revisión
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Detail */}
                  {isOpen && (
                    <div className="border-t border-slate-100">
                      {loadingExpand && !valItems[val.id] ? (
                        <div className="flex items-center gap-2 px-6 py-6 text-xs text-slate-400">
                          <Loader2 className="h-4 w-4 animate-spin" /> Cargando partidas...
                        </div>
                      ) : budgetItems.length === 0 ? (
                        <p className="px-6 py-4 text-xs text-slate-400">
                          Este proyecto no tiene partidas en el presupuesto venta.
                        </p>
                      ) : (
                        <ValGrid
                          val={val}
                          budgetItems={budgetItems}
                          viList={viList}
                          fmt={fmt}
                          fmtPct={fmtPct}
                          groupByChapter={groupByChapter}
                          onUpdate={(bItemId, pct) => updateValItem(val.id, bItemId, pct)}
                          onBlur={(bItemId) => saveValItem(val.id, bItemId)}
                        />
                      )}

                      {/* Reajuste polinómico (factor K) */}
                      {formulas.length > 0 && (
                        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-blue-50/40 px-5 py-3">
                          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                            <Sigma className="h-3.5 w-3.5 text-blue-600" /> Reajuste polinómico
                          </span>
                          <select
                            value={val.reajuste_formula_id ?? ""}
                            disabled={val.status === "approved"}
                            onChange={(e) => { if (e.target.value) calcReajuste(val, e.target.value); }}
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs disabled:bg-slate-100"
                          >
                            <option value="">— Sin fórmula —</option>
                            {formulas.map((f) => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                          </select>
                          {val.reajuste_formula_id && val.status !== "approved" && (
                            <button
                              onClick={() => calcReajuste(val, val.reajuste_formula_id!)}
                              className="flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                              title="Recalcular con índices actuales"
                            >
                              <RefreshCw className="h-3 w-3" /> Recalcular
                            </button>
                          )}
                          {val.reajuste_formula_id && (
                            <span className="ml-auto flex items-center gap-3 text-xs">
                              <span className="text-slate-500">
                                K = <span className="font-mono font-semibold text-slate-700">{Number(val.factor_k).toFixed(4)}</span>
                              </span>
                              <span className={cn(
                                "font-medium",
                                Number(val.monto_reajuste) >= 0 ? "text-green-700" : "text-red-600"
                              )}>
                                Reajuste: {fmt(Number(val.monto_reajuste))}
                              </span>
                              <span className="text-slate-400">
                                Total c/reajuste: {fmt(Number(val.total_amount) + Number(val.monto_reajuste))}
                              </span>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
                        <div className="flex gap-2">
                          {val.status === "draft" && (
                            <button
                              onClick={() => changeStatus(val, "submitted")}
                              className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                            >
                              <FileCheck className="h-3.5 w-3.5" /> Presentar valorización
                            </button>
                          )}
                          {val.status === "submitted" && (
                            <>
                              <button
                                onClick={() => changeStatus(val, "draft")}
                                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                              >
                                Devolver a borrador
                              </button>
                              {canApprove && (
                                <button
                                  onClick={() => changeStatus(val, "approved")}
                                  className="flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Aprobar
                                </button>
                              )}
                            </>
                          )}
                          {val.status === "approved" && (
                            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Valorización aprobada
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => window.open(`/proyectos/${projectId}/valorizaciones/${val.id}/print`, "_blank")}
                            className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            🖨 PDF
                          </button>
                          {val.status !== "approved" && (
                            <button
                              onClick={() => deleteVal(val)}
                              className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Panel: Nueva valorización ──────────────────────────────────────── */}
      {panel && (
        <div className="fixed right-0 top-0 z-40 flex h-screen w-[460px] flex-col border-l border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h3 className="text-base font-bold text-slate-900">Nueva valorización</h3>
            <button
              onClick={() => setPanel(false)}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <Fld label="Nombre (opcional)">
              <input
                value={form.period_name}
                onChange={(e) => setForm((p) => ({ ...p, period_name: e.target.value }))}
                className={inp()}
                placeholder={`Valorización N° ${vals.length + 1} — se genera automáticamente`}
                autoFocus
              />
            </Fld>
            <div className="grid grid-cols-2 gap-4">
              <Fld label="Fecha inicio *">
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                  className={inp()}
                />
              </Fld>
              <Fld label="Fecha fin *">
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                  className={inp()}
                />
              </Fld>
            </div>
            <Fld label="Notas">
              <textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
                className={inp() + " resize-none"}
                placeholder="Observaciones, acuerdos, referencias..."
              />
            </Fld>

            {!budgetId ? (
              <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                Este proyecto no tiene presupuesto venta. Regístralo en Presupuesto primero.
              </div>
            ) : (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                Se crearán entradas para todas las partidas del presupuesto venta.
                {vals.length > 0 && (
                  <> Los porcentajes acumulados de la valorización anterior se heredan automáticamente.</>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 px-6 py-4">
            <div className="flex gap-3">
              <button
                onClick={createVal}
                disabled={saving || !budgetId}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Crear valorización
              </button>
              <button
                onClick={() => setPanel(false)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ValGrid ───────────────────────────────────────────────────────────────────

function ValGrid({
  val,
  budgetItems,
  viList,
  fmt,
  fmtPct,
  groupByChapter,
  onUpdate,
  onBlur,
}: {
  val: Valorizacion;
  budgetItems: BudgetItemRaw[];
  viList: ValItem[];
  fmt: (n: number) => string;
  fmtPct: (n: number) => string;
  groupByChapter: (
    items: BudgetItemRaw[],
    viList: ValItem[]
  ) => Array<{ name: string; code: string; rows: Array<{ item: BudgetItemRaw; vi: ValItem }> }>;
  onUpdate: (budgetItemId: string, pct: number) => void;
  onBlur: (budgetItemId: string) => void;
}) {
  const editable = val.status === "draft";
  const groups = groupByChapter(budgetItems, viList);
  const periodTotal = viList.reduce((s, x) => s + x.period_amount, 0);
  const cumulTotal  = viList.reduce((s, x) => s + x.cumul_amount, 0);
  const contractTotal = viList.reduce((s, x) => s + x.item_total, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100 text-left">
            <th className="px-3 py-2.5 text-slate-500 font-semibold w-24">Código</th>
            <th className="px-3 py-2.5 text-slate-500 font-semibold">Descripción</th>
            <th className="px-3 py-2.5 text-slate-500 font-semibold text-center w-10">Ud</th>
            <th className="px-3 py-2.5 text-slate-500 font-semibold text-right w-20">Metrado</th>
            <th className="px-3 py-2.5 text-slate-500 font-semibold text-right w-24">P.U.</th>
            <th className="px-3 py-2.5 text-slate-500 font-semibold text-right w-28">Total</th>
            <th className="px-3 py-2.5 text-slate-400 font-semibold text-right w-20">% Ant.</th>
            <th className="px-3 py-2.5 text-blue-600 font-semibold text-right w-24">% Período</th>
            <th className="px-3 py-2.5 text-slate-500 font-semibold text-right w-20">% Acum.</th>
            <th className="px-3 py-2.5 text-blue-700 font-semibold text-right w-28">Monto período</th>
            <th className="px-3 py-2.5 text-slate-500 font-semibold text-right w-28">Monto acum.</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const groupPeriodTotal = group.rows.reduce((s, r) => s + r.vi.period_amount, 0);
            const groupCumulTotal  = group.rows.reduce((s, r) => s + r.vi.cumul_amount, 0);
            return (
              <React.Fragment key={`group-${group.name}`}>
                {/* Chapter header row */}
                <tr className="bg-slate-50/80 border-y border-slate-100">
                  <td className="px-3 py-1.5 font-mono text-slate-400">{group.code}</td>
                  <td colSpan={5} className="px-3 py-1.5 font-semibold text-slate-700 uppercase text-xs tracking-wide">
                    {group.name}
                  </td>
                  <td /><td /><td />
                  <td className="px-3 py-1.5 text-right font-bold text-blue-700 tabular-nums">
                    {groupPeriodTotal > 0 ? fmt(groupPeriodTotal) : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right font-semibold text-slate-600 tabular-nums">
                    {groupCumulTotal > 0 ? fmt(groupCumulTotal) : "—"}
                  </td>
                </tr>
                {/* Item rows */}
                {group.rows.map(({ item, vi }) => {
                  const remaining = Math.max(0, 100 - vi.prev_percent);
                  return (
                    <tr key={item.id} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors">
                      <td className="px-3 py-2 font-mono text-slate-400">{item.item_code}</td>
                      <td className="px-3 py-2 text-slate-700 max-w-[220px]">
                        <span className="line-clamp-2">{item.description}</span>
                      </td>
                      <td className="px-3 py-2 text-center text-slate-500">{item.unit}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                        {Number(item.quantity).toLocaleString("es-PE", { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                        {Number(item.unit_price).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-800">
                        {fmt(item.total)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                        {fmtPct(vi.prev_percent)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {editable ? (
                          <input
                            type="number"
                            min={0}
                            max={remaining}
                            step={0.1}
                            value={vi.period_percent}
                            onChange={(e) => onUpdate(item.id, parseFloat(e.target.value) || 0)}
                            onBlur={() => onBlur(item.id)}
                            className={cn(
                              "w-20 rounded border px-1.5 py-1 text-right text-xs outline-none tabular-nums transition-colors",
                              "border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-100",
                              vi.period_percent > 0 && "border-blue-300 bg-blue-50"
                            )}
                          />
                        ) : (
                          <span className="tabular-nums text-blue-700 font-medium">{fmtPct(vi.period_percent)}</span>
                        )}
                      </td>
                      <td className={cn(
                        "px-3 py-2 text-right tabular-nums font-medium",
                        vi.cumul_percent >= 100 ? "text-green-600" : "text-slate-700"
                      )}>
                        {fmtPct(vi.cumul_percent)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-blue-700">
                        {vi.period_amount > 0 ? fmt(vi.period_amount) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                        {vi.cumul_amount > 0 ? fmt(vi.cumul_amount) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-xs">
            <td colSpan={5} className="px-3 py-3 text-slate-700 uppercase tracking-wider">TOTAL VALORIZACIÓN</td>
            <td className="px-3 py-3 text-right tabular-nums text-slate-800">{fmt(contractTotal)}</td>
            <td />
            <td />
            <td />
            <td className="px-3 py-3 text-right tabular-nums text-blue-700">{fmt(periodTotal)}</td>
            <td className="px-3 py-3 text-right tabular-nums text-slate-700">{fmt(cumulTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className={cn("text-lg font-bold leading-tight", color)}>{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}

function inp() {
  return "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition-colors bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}
