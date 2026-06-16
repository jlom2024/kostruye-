"use client";

import { useMemo, useState } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import {
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, TrendingUp, PackageX,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Chapter {
  id: string;
  code: string;
  name: string;
  sort_order: number;
}

interface Item {
  id: string;
  item_code: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total: number;
  chapter_id: string | null;
  sort_order: number;
}

interface Props {
  currency: string;
  chapters: Chapter[];
  items: Item[];
  realByItem: Record<string, number>;
  hasBudget: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────────

export function ControlCostosClient({ currency, chapters, items, realByItem, hasBudget }: Props) {
  const cur = currency as "PEN" | "USD";
  const fmt = (n: number) => formatCurrency(n, cur);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [onlyOverrun, setOnlyOverrun] = useState(false);

  function toggle(chId: string) {
    setExpanded((p) => {
      const n = new Set(p);
      n.has(chId) ? n.delete(chId) : n.add(chId);
      return n;
    });
  }

  // Solo consideramos partidas que ya tienen consumo real registrado
  const itemReal = (itemId: string) => realByItem[itemId] ?? 0;

  // KPIs globales
  const totals = useMemo(() => {
    let presupuestado = 0, consumido = 0, partidasSobrecosto = 0, partidasConConsumo = 0;
    for (const it of items) {
      const real = itemReal(it.id);
      presupuestado += Number(it.total ?? 0);
      consumido += real;
      if (real > 0) partidasConConsumo++;
      if (real > Number(it.total ?? 0) && Number(it.total ?? 0) > 0) partidasSobrecosto++;
    }
    return { presupuestado, consumido, partidasSobrecosto, partidasConConsumo };
  }, [items, realByItem]);

  // Agrupar items por capítulo
  const grouped = useMemo(() => {
    return chapters.map((ch) => {
      const chItems = items
        .filter((i) => i.chapter_id === ch.id)
        .map((i) => {
          const real = itemReal(i.id);
          const presup = Number(i.total ?? 0);
          const desv = real - presup;
          const pct = presup > 0 ? (real / presup) * 100 : (real > 0 ? 999 : 0);
          return { ...i, real, presup, desv, pct };
        })
        .filter((i) => (onlyOverrun ? i.real > i.presup && i.presup > 0 : true));
      const presup = chItems.reduce((s, i) => s + i.presup, 0);
      const real = chItems.reduce((s, i) => s + i.real, 0);
      return { ch, chItems, presup, real, desv: real - presup };
    }).filter((g) => g.chItems.length > 0);
  }, [chapters, items, realByItem, onlyOverrun]);

  if (!hasBudget) {
    return (
      <div className="flex-1 p-6">
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center text-sm text-slate-400">
          Este proyecto no tiene presupuesto venta configurado.
        </div>
      </div>
    );
  }

  const consumoPct = totals.presupuestado > 0 ? (totals.consumido / totals.presupuestado) * 100 : 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Aviso de alcance */}
      <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        El costo real mostrado es el <strong>consumo de materiales (Kardex)</strong> imputado a cada partida de control.
        La mano de obra y los servicios se controlan a nivel de proyecto en el Dashboard.
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Presupuestado (venta)" value={fmt(totals.presupuestado)} color="text-slate-700" />
        <Kpi label="Consumido (materiales)" value={fmt(totals.consumido)} sub={`${consumoPct.toFixed(1)}% del presupuesto`} color="text-blue-700" />
        <Kpi label="Partidas con consumo" value={String(totals.partidasConConsumo)} color="text-slate-700" />
        <Kpi
          label="Partidas en sobrecosto"
          value={String(totals.partidasSobrecosto)}
          color={totals.partidasSobrecosto > 0 ? "text-red-600" : "text-green-700"}
          icon={totals.partidasSobrecosto > 0 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOnlyOverrun((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            onlyOverrun ? "bg-red-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5" /> Solo sobrecostos
        </button>
      </div>

      {/* Tabla por capítulo */}
      {grouped.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <PackageX className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">
            {onlyOverrun ? "Ninguna partida en sobrecosto. 👌" : "Aún no hay consumo de materiales imputado a partidas."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(({ ch, chItems, presup, real, desv }) => {
            const isOpen = expanded.has(ch.id);
            return (
              <div key={ch.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <button onClick={() => toggle(ch.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
                  {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  <span className="font-mono text-xs text-slate-400">{ch.code}</span>
                  <span className="text-sm font-semibold text-slate-700">{ch.name}</span>
                  <span className="ml-auto flex items-center gap-4 text-xs">
                    <span className="text-slate-500">Presup: <span className="font-medium text-slate-700">{fmt(presup)}</span></span>
                    <span className="text-slate-500">Real: <span className="font-medium text-blue-700">{fmt(real)}</span></span>
                    <DesvBadge desv={desv} fmt={fmt} />
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-400">
                          <th className="px-4 py-2 font-medium">Partida</th>
                          <th className="px-2 py-2 font-medium">Descripción</th>
                          <th className="px-2 py-2 text-right font-medium">Presupuesto</th>
                          <th className="px-2 py-2 text-right font-medium">Consumido</th>
                          <th className="px-2 py-2 text-right font-medium">Desviación</th>
                          <th className="px-4 py-2 text-right font-medium">% Consumo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chItems.map((i) => {
                          const over = i.real > i.presup && i.presup > 0;
                          const pctClamped = Math.min(100, i.pct);
                          return (
                            <tr key={i.id} className="border-t border-slate-100">
                              <td className="px-4 py-2 font-mono text-slate-500">{i.item_code}</td>
                              <td className="px-2 py-2 text-slate-700">{i.description}</td>
                              <td className="px-2 py-2 text-right text-slate-600">{fmt(i.presup)}</td>
                              <td className="px-2 py-2 text-right font-medium text-blue-700">{fmt(i.real)}</td>
                              <td className={cn("px-2 py-2 text-right font-medium", i.desv > 0 ? "text-red-600" : "text-green-700")}>
                                {i.desv > 0 ? "+" : ""}{fmt(i.desv)}
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                      className={cn("h-full rounded-full", over ? "bg-red-500" : i.pct > 85 ? "bg-amber-500" : "bg-green-500")}
                                      style={{ width: `${pctClamped}%` }}
                                    />
                                  </div>
                                  <span className={cn("w-12 text-right tabular-nums", over ? "text-red-600 font-semibold" : "text-slate-500")}>
                                    {i.presup > 0 ? `${i.pct.toFixed(0)}%` : "—"}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────────────

function Kpi({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className={cn("mt-1 flex items-center gap-1.5 text-xl font-bold", color)}>{icon}{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function DesvBadge({ desv, fmt }: { desv: number; fmt: (n: number) => string }) {
  if (Math.abs(desv) < 0.005) return <span className="text-slate-400">—</span>;
  const over = desv > 0;
  return (
    <span className={cn("rounded-md px-2 py-0.5 font-medium", over ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
      {over ? "+" : ""}{fmt(desv)}
    </span>
  );
}
