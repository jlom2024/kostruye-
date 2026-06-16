"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronDown, ChevronRight, Plus, Pencil, Trash2, ShieldCheck, Search,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type Operation = "INSERT" | "UPDATE" | "DELETE";

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  operation: Operation;
  changed_by: string | null;
  changed_at: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
}

interface Props {
  logs: AuditLog[];
  actors: Record<string, string>;
}

// ── Config ───────────────────────────────────────────────────────────────────────

const TABLE_LABELS: Record<string, string> = {
  budgets: "Presupuesto",
  budget_items: "Partida",
  apu_lines: "Recurso APU",
};

const OP_CFG: Record<Operation, { label: string; cls: string; icon: React.ReactNode }> = {
  INSERT: { label: "Creó", cls: "bg-green-100 text-green-700", icon: <Plus className="h-3 w-3" /> },
  UPDATE: { label: "Editó", cls: "bg-blue-100 text-blue-700", icon: <Pencil className="h-3 w-3" /> },
  DELETE: { label: "Eliminó", cls: "bg-red-100 text-red-600", icon: <Trash2 className="h-3 w-3" /> },
};

// Campos de ruido que no aportan al diff legible
const IGNORED_FIELDS = new Set(["id", "created_at", "updated_at", "sort_order", "budget_id", "chapter_id", "budget_item_id"]);

// Etiquetas legibles para los campos más comunes
const FIELD_LABELS: Record<string, string> = {
  item_code: "Código", description: "Descripción", unit: "Unidad",
  quantity: "Cantidad", unit_price: "P. Unitario", total: "Total",
  name: "Nombre", code: "Código", crew_size: "Cuadrilla",
  quantity_per_unit: "Rendimiento", subtotal: "Subtotal",
  resource_type: "Tipo recurso", level: "Nivel",
};

function fieldLabel(k: string) {
  return FIELD_LABELS[k] ?? k;
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return v.toLocaleString("es-PE", { maximumFractionDigits: 2 });
  return String(v);
}

// ── Component ────────────────────────────────────────────────────────────────────

export function AuditoriaClient({ logs, actors }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [opFilter, setOpFilter] = useState<Operation | "ALL">("ALL");

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (opFilter !== "ALL" && l.operation !== opFilter) return false;
      if (!q) return true;
      const hay = `${TABLE_LABELS[l.table_name] ?? l.table_name} ${actors[l.changed_by ?? ""] ?? ""} ${JSON.stringify(l.new_values ?? l.old_values ?? {})}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [logs, q, opFilter, actors]);

  // Agrupar por día
  const byDay = useMemo(() => {
    const groups: Record<string, AuditLog[]> = {};
    for (const l of filtered) {
      const day = new Date(l.changed_at).toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });
      (groups[day] ??= []).push(l);
    }
    return groups;
  }, [filtered]);

  function changedFields(l: AuditLog): { field: string; from: unknown; to: unknown }[] {
    const oldV = l.old_values ?? {};
    const newV = l.new_values ?? {};
    const keys = new Set([...Object.keys(oldV), ...Object.keys(newV)]);
    const out: { field: string; from: unknown; to: unknown }[] = [];
    for (const k of keys) {
      if (IGNORED_FIELDS.has(k)) continue;
      const a = (oldV as Record<string, unknown>)[k];
      const b = (newV as Record<string, unknown>)[k];
      if (l.operation === "UPDATE" && JSON.stringify(a) === JSON.stringify(b)) continue;
      out.push({ field: k, from: a, to: b });
    }
    return out;
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por campo, valor o autor…"
            className="w-64 text-sm outline-none"
          />
        </div>
        <div className="flex gap-1">
          {(["ALL", "INSERT", "UPDATE", "DELETE"] as const).map((op) => (
            <button
              key={op}
              onClick={() => setOpFilter(op)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                opFilter === op ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              {op === "ALL" ? "Todos" : OP_CFG[op].label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-400">{filtered.length} evento{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <ShieldCheck className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-400">Sin eventos de auditoría {q || opFilter !== "ALL" ? "para este filtro" : "registrados"}.</p>
        </div>
      ) : (
        Object.entries(byDay).map(([day, items]) => (
          <div key={day} className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{day}</p>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {items.map((l, idx) => {
                const cfg = OP_CFG[l.operation];
                const isOpen = expanded === l.id;
                const fields = changedFields(l);
                const actor = actors[l.changed_by ?? ""] ?? (l.changed_by ? l.changed_by.slice(0, 8) : "Sistema");
                const time = new Date(l.changed_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={l.id} className={cn(idx && "border-t border-slate-100")}>
                    <button
                      onClick={() => setExpanded(isOpen ? null : l.id)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                    >
                      {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                      <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", cfg.cls)}>
                        {cfg.icon} {cfg.label}
                      </span>
                      <span className="text-sm font-medium text-slate-700">{TABLE_LABELS[l.table_name] ?? l.table_name}</span>
                      <span className="text-xs text-slate-400">· {fields.length} campo{fields.length !== 1 ? "s" : ""}</span>
                      <span className="ml-auto flex items-center gap-3 text-xs text-slate-400">
                        <span className="text-slate-500">{actor}</span>
                        <span>{time}</span>
                      </span>
                    </button>

                    {isOpen && (
                      <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                        {fields.length === 0 ? (
                          <p className="text-xs text-slate-400">Sin cambios de campos relevantes.</p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">
                                <th className="pb-1.5 font-medium">Campo</th>
                                {l.operation === "UPDATE" && <th className="pb-1.5 font-medium">Antes</th>}
                                <th className="pb-1.5 font-medium">{l.operation === "DELETE" ? "Valor" : l.operation === "UPDATE" ? "Después" : "Valor"}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fields.map((f) => (
                                <tr key={f.field} className="border-t border-slate-200/60">
                                  <td className="py-1 pr-3 font-medium text-slate-600">{fieldLabel(f.field)}</td>
                                  {l.operation === "UPDATE" && (
                                    <td className="py-1 pr-3 text-red-600 line-through decoration-red-300">{fmtVal(f.from)}</td>
                                  )}
                                  <td className="py-1 text-slate-800">
                                    {fmtVal(l.operation === "DELETE" ? f.from : f.to)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
