"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus, X, Loader2, Trash2, Users, CalendarDays,
  ChevronDown, ChevronRight, CheckCircle2, Clock, Banknote, Zap,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = "capataz" | "operario" | "oficial" | "peon" | "tecnico" | "administrativo";
type PayrollStatus = "open" | "closed" | "paid";

interface Worker {
  id: string;
  full_name: string;
  dni: string | null;
  category: Category;
  daily_wage: number;
  is_active: boolean;
  notes: string | null;
}

interface PayrollEntry {
  id: string;
  worker_id: string;
  days_worked: number;
  daily_wage: number;
  gross_pay: number;
  deductions: number;
  net_pay: number;
  notes: string | null;
}

interface PayrollPeriod {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  status: PayrollStatus;
  total_gross: number;
  total_net: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: Record<Category, string> = {
  capataz:       "Capataz",
  operario:      "Operario",
  oficial:       "Oficial",
  peon:          "Peón",
  tecnico:       "Técnico",
  administrativo:"Administrativo",
};

const DEFAULT_WAGES: Record<Category, number> = {
  capataz:        85.00,
  operario:       68.20,
  oficial:        55.40,
  peon:           49.60,
  tecnico:        90.00,
  administrativo: 75.00,
};

const PERIOD_STATUS: Record<PayrollStatus, { label: string; color: string; bg: string }> = {
  open:   { label: "Abierta", color: "text-blue-700",  bg: "bg-blue-50"  },
  closed: { label: "Cerrada", color: "text-amber-700", bg: "bg-amber-50" },
  paid:   { label: "Pagada",  color: "text-green-700", bg: "bg-green-50" },
};

const EMPTY_WORKER = { full_name: "", dni: "", category: "peon" as Category, daily_wage: 49.60, notes: "" };

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props { projectId: string; currency: string }

// ── Component ─────────────────────────────────────────────────────────────────

export function NominasClient({ projectId, currency }: Props) {
  const supabase = createClient();
  const sym = currency === "PEN" ? "S/" : "$";

  const [tab, setTab] = useState<"periodos" | "trabajadores">("periodos");

  // Trabajadores
  const [workers, setWorkers]         = useState<Worker[]>([]);
  const [workerPanel, setWorkerPanel] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [workerForm, setWorkerForm]   = useState({ ...EMPTY_WORKER });
  const [savingWorker, setSavingWorker] = useState(false);

  // Períodos
  const [periods, setPeriods]           = useState<PayrollPeriod[]>([]);
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [entries, setEntries]           = useState<Record<string, PayrollEntry[]>>({});
  const [periodPanel, setPeriodPanel]   = useState(false);
  const [periodForm, setPeriodForm]     = useState({ period_name: "", start_date: "", end_date: "" });
  const [savingPeriod, setSavingPeriod] = useState(false);

  const [loading, setLoading] = useState(true);

  // ── Load ───────────────────────────────────────────────────────────────────

  async function loadAll() {
    const [{ data: w }, { data: p }] = await Promise.all([
      supabase.from("workers").select("*").eq("project_id", projectId).order("full_name"),
      supabase.from("payroll_periods").select("*").eq("project_id", projectId).order("start_date", { ascending: false }),
    ]);
    setWorkers(w ?? []);
    setPeriods(p ?? []);
  }

  useEffect(() => { loadAll().finally(() => setLoading(false)); }, [projectId]); // eslint-disable-line

  // ── Workers ────────────────────────────────────────────────────────────────

  function openNewWorker() {
    setEditingWorker(null);
    setWorkerForm({ ...EMPTY_WORKER });
    setWorkerPanel(true);
  }

  function openEditWorker(w: Worker) {
    setEditingWorker(w);
    setWorkerForm({ full_name: w.full_name, dni: w.dni ?? "", category: w.category, daily_wage: w.daily_wage, notes: w.notes ?? "" });
    setWorkerPanel(true);
  }

  async function saveWorker() {
    if (!workerForm.full_name.trim()) { toast.error("Nombre requerido"); return; }
    setSavingWorker(true);
    const payload = {
      project_id: projectId,
      full_name:  workerForm.full_name.trim(),
      dni:        workerForm.dni.trim() || null,
      category:   workerForm.category,
      daily_wage: workerForm.daily_wage,
      notes:      workerForm.notes.trim() || null,
    };
    if (editingWorker) {
      const { error } = await supabase.from("workers").update(payload).eq("id", editingWorker.id);
      if (error) { toast.error(error.message); setSavingWorker(false); return; }
      toast.success("Trabajador actualizado");
    } else {
      const { error } = await supabase.from("workers").insert(payload);
      if (error) { toast.error(error.message); setSavingWorker(false); return; }
      toast.success("Trabajador registrado");
    }
    setSavingWorker(false);
    setWorkerPanel(false);
    await loadAll();
  }

  async function toggleWorkerActive(w: Worker) {
    await supabase.from("workers").update({ is_active: !w.is_active }).eq("id", w.id);
    await loadAll();
  }

  async function deleteWorker(w: Worker) {
    if (!confirm(`¿Eliminar a ${w.full_name}?`)) return;
    const { error } = await supabase.from("workers").delete().eq("id", w.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Trabajador eliminado");
    setWorkerPanel(false);
    await loadAll();
  }

  // ── Períodos ───────────────────────────────────────────────────────────────

  async function expandPeriod(periodId: string) {
    if (expandedId === periodId) { setExpandedId(null); return; }
    setExpandedId(periodId);
    if (entries[periodId]) return; // ya cargado
    const { data } = await supabase
      .from("payroll_entries")
      .select("*")
      .eq("period_id", periodId);
    setEntries((prev) => ({ ...prev, [periodId]: data ?? [] }));
  }

  async function createPeriod() {
    if (!periodForm.start_date || !periodForm.end_date) { toast.error("Fechas requeridas"); return; }
    const name = periodForm.period_name.trim() || `Semana ${new Date(periodForm.start_date).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })} – ${new Date(periodForm.end_date).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}`;
    setSavingPeriod(true);
    const { data: period, error } = await supabase
      .from("payroll_periods")
      .insert({ project_id: projectId, period_name: name, start_date: periodForm.start_date, end_date: periodForm.end_date })
      .select()
      .single();
    if (error) { toast.error(error.message); setSavingPeriod(false); return; }

    // Crear entradas para todos los trabajadores activos
    const activeWorkers = workers.filter((w) => w.is_active);
    if (activeWorkers.length > 0) {
      await supabase.from("payroll_entries").insert(
        activeWorkers.map((w) => ({
          period_id:   period.id,
          worker_id:   w.id,
          days_worked: 0,
          daily_wage:  w.daily_wage,
          gross_pay:   0,
          deductions:  0,
          net_pay:     0,
        }))
      );
    }
    setSavingPeriod(false);
    setPeriodPanel(false);
    setPeriodForm({ period_name: "", start_date: "", end_date: "" });
    toast.success("Período creado");
    await loadAll();
    setExpandedId(period.id);
    setEntries((prev) => ({
      ...prev,
      [period.id]: activeWorkers.map((w) => ({
        id: "", period_id: period.id, worker_id: w.id,
        days_worked: 0, daily_wage: w.daily_wage,
        gross_pay: 0, deductions: 0, net_pay: 0, notes: null,
      })),
    }));
  }

  async function updateEntry(periodId: string, workerId: string, field: "days_worked" | "deductions" | "notes", value: number | string) {
    const periodEntries = entries[periodId] ?? [];
    const entry = periodEntries.find((e) => e.worker_id === workerId);
    if (!entry) return;

    const updated = { ...entry, [field]: value };
    updated.gross_pay = updated.days_worked * updated.daily_wage;
    updated.net_pay   = Math.max(0, updated.gross_pay - updated.deductions);

    setEntries((prev) => ({
      ...prev,
      [periodId]: prev[periodId].map((e) => e.worker_id === workerId ? updated : e),
    }));
  }

  async function saveEntry(periodId: string, workerId: string) {
    const entry = (entries[periodId] ?? []).find((e) => e.worker_id === workerId);
    if (!entry) return;
    const payload = {
      period_id:   periodId,
      worker_id:   workerId,
      days_worked: entry.days_worked,
      daily_wage:  entry.daily_wage,
      gross_pay:   entry.gross_pay,
      deductions:  entry.deductions,
      net_pay:     entry.net_pay,
      notes:       entry.notes,
    };
    if (entry.id) {
      await supabase.from("payroll_entries").update(payload).eq("id", entry.id);
    } else {
      const { data } = await supabase.from("payroll_entries").upsert(payload, { onConflict: "period_id,worker_id" }).select().single();
      if (data) {
        setEntries((prev) => ({
          ...prev,
          [periodId]: prev[periodId].map((e) => e.worker_id === workerId ? data as PayrollEntry : e),
        }));
      }
    }
    await loadAll(); // refresh totals
  }

  async function changeStatus(period: PayrollPeriod, status: PayrollStatus) {
    await supabase.from("payroll_periods").update({ status }).eq("id", period.id);
    toast.success(`Período: ${PERIOD_STATUS[status].label}`);
    await loadAll();
  }

  async function deletePeriod(period: PayrollPeriod) {
    if (!confirm(`¿Eliminar período "${period.period_name}"?`)) return;
    await supabase.from("payroll_periods").delete().eq("id", period.id);
    toast.success("Período eliminado");
    if (expandedId === period.id) setExpandedId(null);
    await loadAll();
  }

  // ── Auto-generar desde Tareo ──────────────────────────────────────────────

  async function generateFromTareo(period: PayrollPeriod) {
    if (!confirm(`¿Generar nómina automáticamente desde el Tareo Diario (${period.start_date} al ${period.end_date})?\nEsto reemplazará cualquier entrada existente.`)) return;
    const { data, error } = await supabase.rpc('fn_generate_payroll_from_tareo', { p_period_id: period.id });
    if (error) {
      toast.error('Error al generar: ' + error.message);
    } else {
      toast.success(`Nómina generada: ${data} trabajador(es) con registro de tareo.`);
      // Forzar recarga de entradas del período
      setEntries((prev) => { const n = {...prev}; delete n[period.id]; return n; });
      await loadAll();
      setExpandedId(period.id);
      const { data: newEntries } = await supabase.from('payroll_entries').select('*').eq('period_id', period.id);
      setEntries((prev) => ({ ...prev, [period.id]: newEntries ?? [] }));
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function fmt(n: number) {
    return `${sym} ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function mondayOfCurrentWeek() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split("T")[0];
  }

  function saturdayOfCurrentWeek() {
    const monday = new Date(mondayOfCurrentWeek());
    monday.setDate(monday.getDate() + 5);
    return monday.toISOString().split("T")[0];
  }

  function openNewPeriod() {
    setPeriodForm({ period_name: "", start_date: mondayOfCurrentWeek(), end_date: saturdayOfCurrentWeek() });
    setPeriodPanel(true);
  }

  const activeWorkers = workers.filter((w) => w.is_active);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className={cn("flex flex-1 flex-col overflow-y-auto", (workerPanel || periodPanel) && "mr-[460px]")}>

        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex gap-1 rounded-lg border border-slate-200 p-1">
            {(["periodos", "trabajadores"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                  tab === t ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {t === "periodos" ? "Períodos" : "Trabajadores"}
              </button>
            ))}
          </div>
          <button
            onClick={tab === "trabajadores" ? openNewWorker : openNewPeriod}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {tab === "trabajadores" ? "Agregar trabajador" : "Nueva semana"}
          </button>
        </div>

        {/* ── Tab: Trabajadores ───────────────────────────────────────────── */}
        {tab === "trabajadores" && (
          <div className="p-6">
            {workers.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
                <Users className="mb-3 h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">Sin trabajadores registrados</p>
                <p className="mt-1 text-xs text-slate-400">Agrega el primero con "Agregar trabajador"</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Nombre</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">DNI</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Categoría</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Jornal/día</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {workers.map((w) => (
                      <tr key={w.id} className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => openEditWorker(w)}>
                        <td className="px-4 py-3 font-medium text-slate-900">{w.full_name}</td>
                        <td className="px-4 py-3 font-mono text-slate-500">{w.dni ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{CATEGORIES[w.category]}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800">{fmt(w.daily_wage)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                            w.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                          )}>
                            {w.is_active ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
                  {activeWorkers.length} activo{activeWorkers.length !== 1 ? "s" : ""} · {workers.length} total
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Períodos ───────────────────────────────────────────────── */}
        {tab === "periodos" && (
          <div className="p-6 space-y-3">
            {periods.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
                <CalendarDays className="mb-3 h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">Sin períodos de nómina</p>
                <p className="mt-1 text-xs text-slate-400">Crea la primera semana con "Nueva semana"</p>
              </div>
            ) : (
              periods.map((period) => {
                const isOpen  = expandedId === period.id;
                const pEntries = entries[period.id] ?? [];
                const meta = PERIOD_STATUS[period.status];

                return (
                  <div key={period.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    {/* Period header */}
                    <div
                      className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => expandPeriod(period.id)}
                    >
                      <div className="flex items-center gap-3">
                        {isOpen
                          ? <ChevronDown className="h-4 w-4 text-slate-400" />
                          : <ChevronRight className="h-4 w-4 text-slate-400" />}
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{period.period_name}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(period.start_date + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short" })} —{" "}
                            {new Date(period.end_date + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Bruto / Neto</p>
                          <p className="text-sm font-bold text-slate-900">{fmt(period.total_gross)} / {fmt(period.total_net)}</p>
                        </div>
                        <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", meta.bg, meta.color)}>
                          {meta.label}
                        </span>
                      </div>
                    </div>

                    {/* Period detail */}
                    {isOpen && (
                      <div className="border-t border-slate-100">
                        {pEntries.length === 0 ? (
                          <p className="px-6 py-4 text-xs text-slate-400">
                            {workers.length === 0
                              ? "Registra trabajadores primero en la pestaña Trabajadores."
                              : "Sin entradas. Vuelve a crear el período con trabajadores activos."}
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Trabajador</th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Categoría</th>
                                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 w-20">Jornal</th>
                                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 w-20">Días</th>
                                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 w-24">Bruto</th>
                                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 w-24">Descuentos</th>
                                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 w-24">Neto</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {pEntries.map((entry) => {
                                  const worker = workers.find((w) => w.id === entry.worker_id);
                                  if (!worker) return null;
                                  const editable = period.status === "open";
                                  return (
                                    <tr key={entry.worker_id} className="hover:bg-slate-50/50">
                                      <td className="px-4 py-2 font-medium text-slate-800">{worker.full_name}</td>
                                      <td className="px-4 py-2 text-xs text-slate-500">{CATEGORIES[worker.category]}</td>
                                      <td className="px-4 py-2 text-right text-xs text-slate-500 tabular-nums">{fmt(entry.daily_wage)}</td>
                                      <td className="px-4 py-2 text-right">
                                        {editable ? (
                                          <input
                                            type="number" min={0} max={7} step={0.5}
                                            value={entry.days_worked}
                                            onChange={(e) => updateEntry(period.id, worker.id, "days_worked", parseFloat(e.target.value) || 0)}
                                            onBlur={() => saveEntry(period.id, worker.id)}
                                            className="w-16 rounded border border-slate-200 px-1.5 py-1 text-right text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 tabular-nums"
                                          />
                                        ) : (
                                          <span className="tabular-nums text-slate-700">{entry.days_worked}</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-right font-medium text-slate-800 tabular-nums">{fmt(entry.gross_pay)}</td>
                                      <td className="px-4 py-2 text-right">
                                        {editable ? (
                                          <input
                                            type="number" min={0} step={0.01}
                                            value={entry.deductions}
                                            onChange={(e) => updateEntry(period.id, worker.id, "deductions", parseFloat(e.target.value) || 0)}
                                            onBlur={() => saveEntry(period.id, worker.id)}
                                            className="w-20 rounded border border-slate-200 px-1.5 py-1 text-right text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 tabular-nums"
                                          />
                                        ) : (
                                          <span className="tabular-nums text-slate-700">{fmt(entry.deductions)}</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-right font-bold text-green-700 tabular-nums">{fmt(entry.net_pay)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="border-t-2 border-slate-200 bg-slate-50">
                                  <td colSpan={4} className="px-4 py-2.5 text-xs font-bold text-slate-700 uppercase tracking-wider">Total período</td>
                                  <td className="px-4 py-2.5 text-right font-bold text-slate-900 tabular-nums">{fmt(period.total_gross)}</td>
                                  <td className="px-4 py-2.5 text-right font-bold text-slate-900 tabular-nums">
                                    {fmt(pEntries.reduce((s, e) => s + e.deductions, 0))}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-bold text-green-700 tabular-nums">{fmt(period.total_net)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 bg-slate-50">
                          <div className="flex gap-2">
                            {period.status === "open" && (
                              <>
                              <button onClick={() => generateFromTareo(period)}
                                className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors">
                                <Zap className="h-3.5 w-3.5" /> Generar desde Tareo
                              </button>
                              <button onClick={() => changeStatus(period, "closed")}
                                className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors">
                                <Clock className="h-3.5 w-3.5" /> Cerrar período
                              </button>
                              </>
                            )}
                            {period.status !== "open" && period.status === "closed" && (
                              <>
                                <button onClick={() => changeStatus(period, "open")}
                                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                                  Reabrir
                                </button>
                                <button onClick={() => changeStatus(period, "paid")}
                                  className="flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors">
                                  <Banknote className="h-3.5 w-3.5" /> Marcar como pagada
                                </button>
                              </>
                            )}
                            {period.status === "paid" && (
                              <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Período pagado
                              </span>
                            )}
                          </div>
                          {period.status !== "paid" && (
                            <button onClick={() => deletePeriod(period)}
                              className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" /> Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── Panel: Trabajador ──────────────────────────────────────────────── */}
      {workerPanel && (
        <div className="fixed right-0 top-0 z-40 flex h-screen w-[460px] flex-col border-l border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingWorker ? "Editar trabajador" : "Nuevo trabajador"}
            </h3>
            <div className="flex items-center gap-1">
              {editingWorker && (
                <button onClick={() => deleteWorker(editingWorker)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button onClick={() => setWorkerPanel(false)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <Fld label="Nombre completo *">
              <input value={workerForm.full_name} onChange={(e) => setWorkerForm((p) => ({ ...p, full_name: e.target.value }))}
                className={inp()} placeholder="Juan Quispe Mamani" autoFocus />
            </Fld>
            <div className="grid grid-cols-2 gap-4">
              <Fld label="DNI">
                <input value={workerForm.dni} onChange={(e) => setWorkerForm((p) => ({ ...p, dni: e.target.value }))}
                  className={inp()} placeholder="12345678" maxLength={8} />
              </Fld>
              <Fld label="Categoría">
                <select value={workerForm.category}
                  onChange={(e) => {
                    const cat = e.target.value as Category;
                    setWorkerForm((p) => ({ ...p, category: cat, daily_wage: DEFAULT_WAGES[cat] }));
                  }}
                  className={inp()}>
                  {Object.entries(CATEGORIES).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Fld>
            </div>
            <Fld label={`Jornal diario (${currency === "PEN" ? "S/" : "$"})`}>
              <input type="number" min={0} step={0.01}
                value={workerForm.daily_wage}
                onChange={(e) => setWorkerForm((p) => ({ ...p, daily_wage: parseFloat(e.target.value) || 0 }))}
                className={inp()} />
              <p className="mt-1 text-xs text-slate-400">Se pre-llena con la tarifa CAPECO por categoría. Ajusta si es diferente.</p>
            </Fld>
            <Fld label="Notas">
              <textarea value={workerForm.notes} onChange={(e) => setWorkerForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2} className={inp() + " resize-none"} placeholder="Especialidad, observaciones..." />
            </Fld>
            {editingWorker && (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                <span className="text-sm text-slate-600">Estado</span>
                <button onClick={() => { toggleWorkerActive(editingWorker); setWorkerPanel(false); }}
                  className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    editingWorker.is_active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  )}>
                  {editingWorker.is_active ? "Activo — clic para desactivar" : "Inactivo — clic para activar"}
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 px-6 py-4">
            <div className="flex gap-3">
              <button onClick={saveWorker} disabled={savingWorker}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
                {savingWorker && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editingWorker ? "Guardar cambios" : "Registrar trabajador"}
              </button>
              <button onClick={() => setWorkerPanel(false)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Panel: Nuevo período ───────────────────────────────────────────── */}
      {periodPanel && (
        <div className="fixed right-0 top-0 z-40 flex h-screen w-[460px] flex-col border-l border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h3 className="text-base font-bold text-slate-900">Nueva semana / período</h3>
            <button onClick={() => setPeriodPanel(false)}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 p-6 space-y-4">
            <Fld label="Nombre del período (opcional)">
              <input value={periodForm.period_name}
                onChange={(e) => setPeriodForm((p) => ({ ...p, period_name: e.target.value }))}
                className={inp()} placeholder="Se genera automáticamente si lo dejas vacío" />
            </Fld>
            <div className="grid grid-cols-2 gap-4">
              <Fld label="Fecha inicio *">
                <input type="date" value={periodForm.start_date}
                  onChange={(e) => setPeriodForm((p) => ({ ...p, start_date: e.target.value }))}
                  className={inp()} />
              </Fld>
              <Fld label="Fecha fin *">
                <input type="date" value={periodForm.end_date}
                  onChange={(e) => setPeriodForm((p) => ({ ...p, end_date: e.target.value }))}
                  className={inp()} />
              </Fld>
            </div>
            {activeWorkers.length > 0 ? (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                Se crearán entradas automáticamente para <strong>{activeWorkers.length}</strong> trabajador{activeWorkers.length !== 1 ? "es" : ""} activo{activeWorkers.length !== 1 ? "s" : ""}.
              </div>
            ) : (
              <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                No hay trabajadores activos. Regístralos primero en la pestaña Trabajadores.
              </div>
            )}
          </div>
          <div className="border-t border-slate-200 px-6 py-4">
            <div className="flex gap-3">
              <button onClick={createPeriod} disabled={savingPeriod}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
                {savingPeriod && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Crear período
              </button>
              <button onClick={() => setPeriodPanel(false)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
