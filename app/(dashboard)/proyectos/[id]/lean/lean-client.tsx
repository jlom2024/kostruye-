"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────
type Week = {
  id: string;
  week_number: number;
  start_date: string;
  end_date: string;
};

type Task = {
  id: string;
  lean_week_id: string;
  description: string;
  responsible: string | null;
  trade: string | null;
  planned_date: string | null;
  committed: boolean;
  status: "pending" | "completed" | "not_completed";
  reason_if_not: string | null;
};

type Constraint = {
  id: string;
  lean_task_id: string | null;
  type: string;
  description: string;
  responsible: string | null;
  due_date: string | null;
  status: "open" | "resolved";
  resolved_at: string | null;
};

type Panel =
  | { type: "week" }
  | { type: "task"; weekId: string }
  | { type: "constraint"; taskId?: string }
  | { type: "reason"; task: Task }
  | null;

const CONSTRAINT_TYPES = [
  { value: "material",  label: "Material" },
  { value: "design",    label: "Diseño / Planos" },
  { value: "permit",    label: "Permiso" },
  { value: "equipment", label: "Equipo" },
  { value: "labor",     label: "Mano de obra" },
  { value: "rfi",       label: "RFI" },
  { value: "other",     label: "Otro" },
];

const STATUS_COLORS: Record<string, string> = {
  pending:       "bg-slate-100 text-slate-600",
  committed:     "bg-blue-100 text-blue-700",
  completed:     "bg-emerald-100 text-emerald-700",
  not_completed: "bg-red-100 text-red-700",
};

function fmt(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("es-PE", {
    day: "2-digit", month: "short",
  });
}

function ppcColor(ppc: number) {
  if (ppc >= 80) return "text-emerald-600";
  if (ppc >= 60) return "text-amber-500";
  return "text-red-500";
}

function nextMonday(from: Date) {
  const d = new Date(from);
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

// ── Shared UI ─────────────────────────────────────────────────────
function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inp  = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const sel  = inp;
const area = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none";

// ── Main component ─────────────────────────────────────────────────
export function LeanClient({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const sb = createClient();

  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [tab, setTab] = useState<"tasks" | "constraints">("tasks");

  // ── Queries ──────────────────────────────────────────────────────
  const { data: weeks = [] } = useQuery<Week[]>({
    queryKey: ["lean_weeks", projectId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("lean_weeks")
        .select("id, week_number, start_date, end_date")
        .eq("project_id", projectId)
        .order("week_number");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Auto-select current week on first load
  useEffect(() => {
    if (weeks.length > 0 && !selectedWeekId) {
      const today = new Date().toISOString().slice(0, 10);
      const current = weeks.find(w => w.start_date <= today && w.end_date >= today);
      setSelectedWeekId(current?.id ?? weeks[weeks.length - 1].id);
    }
  }, [weeks, selectedWeekId]);

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["lean_tasks", projectId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("lean_tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: constraints = [] } = useQuery<Constraint[]>({
    queryKey: ["lean_constraints", projectId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("lean_constraints")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Derived ───────────────────────────────────────────────────────
  const selectedWeek = weeks.find(w => w.id === selectedWeekId);
  const weekTasks = tasks.filter(t => t.lean_week_id === selectedWeekId);
  const committed = weekTasks.filter(t => t.committed);
  const completed = committed.filter(t => t.status === "completed");
  const ppc = committed.length > 0 ? Math.round((completed.length / committed.length) * 100) : null;
  const openConstraints = constraints.filter(c => c.status === "open");

  // ── Mutations ──────────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["lean_weeks", projectId] });
    qc.invalidateQueries({ queryKey: ["lean_tasks", projectId] });
    qc.invalidateQueries({ queryKey: ["lean_constraints", projectId] });
  };

  const addWeek = useMutation({
    mutationFn: async (f: { week_number: number; start_date: string; end_date: string }) => {
      const { error } = await sb.from("lean_weeks").insert({ project_id: projectId, ...f });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Semana creada"); setPanel(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addTask = useMutation({
    mutationFn: async (f: Omit<Task, "id" | "status" | "reason_if_not">) => {
      const { error } = await sb.from("lean_tasks").insert({ project_id: projectId, status: "pending", ...f });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Tarea agregada"); setPanel(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTaskStatus = useMutation({
    mutationFn: async ({ id, status, reason_if_not }: { id: string; status: Task["status"]; reason_if_not?: string }) => {
      const { error } = await sb.from("lean_tasks").update({ status, reason_if_not: reason_if_not ?? null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Estado actualizado"); setPanel(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleCommitted = useMutation({
    mutationFn: async ({ id, committed }: { id: string; committed: boolean }) => {
      const { error } = await sb.from("lean_tasks").update({ committed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("lean_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Tarea eliminada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addConstraint = useMutation({
    mutationFn: async (f: Omit<Constraint, "id" | "status" | "resolved_at">) => {
      const { error } = await sb.from("lean_constraints").insert({ project_id: projectId, status: "open", ...f });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Restricción registrada"); setPanel(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const resolveConstraint = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb
        .from("lean_constraints")
        .update({ status: "resolved", resolved_at: new Date().toISOString().slice(0, 10) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Restricción resuelta"); },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Week form ──────────────────────────────────────────────────────
  const WeekPanel = () => {
    const lastWeek = weeks[weeks.length - 1];
    const defaultStart = lastWeek
      ? toDateStr(nextMonday(new Date(lastWeek.end_date + "T00:00:00")))
      : toDateStr(nextMonday(new Date()));
    const defaultEnd = (() => {
      const d = new Date(defaultStart + "T00:00:00");
      d.setDate(d.getDate() + 6);
      return toDateStr(d);
    })();
    const [start, setStart] = useState(defaultStart);
    const [end,   setEnd]   = useState(defaultEnd);

    const nextNum = (lastWeek?.week_number ?? 0) + 1;

    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          addWeek.mutate({ week_number: nextNum, start_date: start, end_date: end });
        }}
      >
        <p className="text-sm font-semibold text-slate-700">Semana {nextNum}</p>
        <Fld label="Inicio">
          <input type="date" className={inp} value={start} onChange={e => setStart(e.target.value)} required />
        </Fld>
        <Fld label="Fin">
          <input type="date" className={inp} value={end} onChange={e => setEnd(e.target.value)} required />
        </Fld>
        <button type="submit" disabled={addWeek.isPending}
          className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {addWeek.isPending ? "Creando..." : "Crear semana"}
        </button>
      </form>
    );
  };

  // ── Task form ──────────────────────────────────────────────────────
  const TaskPanel = ({ weekId }: { weekId: string }) => {
    const [desc, setDesc]   = useState("");
    const [resp, setResp]   = useState("");
    const [trade, setTrade] = useState("");
    const [date, setDate]   = useState("");
    const [comm, setComm]   = useState(false);

    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          addTask.mutate({
            lean_week_id: weekId,
            description: desc,
            responsible: resp || null,
            trade: trade || null,
            planned_date: date || null,
            committed: comm,
          });
        }}
      >
        <Fld label="Descripción">
          <textarea className={area} rows={3} value={desc} onChange={e => setDesc(e.target.value)} required />
        </Fld>
        <Fld label="Responsable">
          <input className={inp} value={resp} onChange={e => setResp(e.target.value)} />
        </Fld>
        <Fld label="Especialidad / Cuadrilla">
          <input className={inp} value={trade} onChange={e => setTrade(e.target.value)} />
        </Fld>
        <Fld label="Fecha planeada">
          <input type="date" className={inp} value={date} onChange={e => setDate(e.target.value)} />
        </Fld>
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input type="checkbox" checked={comm} onChange={e => setComm(e.target.checked)}
            className="rounded" />
          Comprometer esta tarea para la semana
        </label>
        <button type="submit" disabled={addTask.isPending}
          className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {addTask.isPending ? "Guardando..." : "Agregar tarea"}
        </button>
      </form>
    );
  };

  // ── Constraint form ────────────────────────────────────────────────
  const ConstraintPanel = ({ taskId }: { taskId?: string }) => {
    const [type,  setType]  = useState("material");
    const [desc,  setDesc]  = useState("");
    const [resp,  setResp]  = useState("");
    const [due,   setDue]   = useState("");

    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          addConstraint.mutate({
            lean_task_id: taskId ?? null,
            type,
            description: desc,
            responsible: resp || null,
            due_date: due || null,
          });
        }}
      >
        <Fld label="Tipo de restricción">
          <select className={sel} value={type} onChange={e => setType(e.target.value)}>
            {CONSTRAINT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Fld>
        <Fld label="Descripción">
          <textarea className={area} rows={3} value={desc} onChange={e => setDesc(e.target.value)} required />
        </Fld>
        <Fld label="Responsable de levantamiento">
          <input className={inp} value={resp} onChange={e => setResp(e.target.value)} />
        </Fld>
        <Fld label="Fecha límite">
          <input type="date" className={inp} value={due} onChange={e => setDue(e.target.value)} />
        </Fld>
        <button type="submit" disabled={addConstraint.isPending}
          className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {addConstraint.isPending ? "Guardando..." : "Registrar restricción"}
        </button>
      </form>
    );
  };

  // ── Reason panel ───────────────────────────────────────────────────
  const ReasonPanel = ({ task }: { task: Task }) => {
    const [reason, setReason] = useState(task.reason_if_not ?? "");
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          updateTaskStatus.mutate({ id: task.id, status: "not_completed", reason_if_not: reason });
        }}
      >
        <p className="text-sm text-slate-600 leading-relaxed">
          <span className="font-medium">Tarea:</span> {task.description}
        </p>
        <Fld label="Razón de incumplimiento">
          <textarea className={area} rows={4} value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Ej: falta de material, lluvia, cambio de prioridad..." required />
        </Fld>
        <button type="submit" disabled={updateTaskStatus.isPending}
          className="mt-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
          {updateTaskStatus.isPending ? "Guardando..." : "Marcar no cumplida"}
        </button>
      </form>
    );
  };

  // ── Panel title ────────────────────────────────────────────────────
  const panelTitle = panel?.type === "week"       ? "Nueva semana"
    : panel?.type === "task"       ? "Nueva tarea"
    : panel?.type === "constraint" ? "Nueva restricción"
    : panel?.type === "reason"     ? "Razón de incumplimiento"
    : "";

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 overflow-hidden">

      {/* ── Main ── */}
      <div className="flex flex-1 flex-col overflow-auto">

        {/* Week tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-6 py-3 overflow-x-auto">
          {weeks.map(w => {
            const today = new Date().toISOString().slice(0, 10);
            const isCurrent = w.start_date <= today && w.end_date >= today;
            return (
              <button
                key={w.id}
                onClick={() => { setSelectedWeekId(w.id); setPanel(null); }}
                className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedWeekId === w.id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                S{w.week_number}
                {isCurrent && <span className="ml-1 text-[10px] opacity-75">(actual)</span>}
                <span className="ml-1 opacity-60">{fmt(w.start_date)}</span>
              </button>
            );
          })}
          <button
            onClick={() => setPanel({ type: "week" })}
            className="flex-shrink-0 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600"
          >
            + Semana
          </button>
        </div>

        {!selectedWeek ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center p-6">
            <p className="text-sm font-medium text-slate-600">Sin semanas</p>
            <p className="text-xs text-slate-400">Crea la primera semana de planificación para comenzar.</p>
            <button onClick={() => setPanel({ type: "week" })}
              className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Crear semana
            </button>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-4 gap-4 border-b border-slate-100 bg-slate-50 px-6 py-4">
              <div>
                <p className="text-xs text-slate-500">PPC semana</p>
                <p className={`text-2xl font-bold ${ppc !== null ? ppcColor(ppc) : "text-slate-400"}`}>
                  {ppc !== null ? `${ppc}%` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Comprometidas</p>
                <p className="text-2xl font-bold text-slate-800">{committed.length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Completadas</p>
                <p className="text-2xl font-bold text-emerald-600">{completed.length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Restricciones abiertas</p>
                <p className="text-2xl font-bold text-amber-500">{openConstraints.length}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-6">
              {(["tasks", "constraints"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`py-3 px-3 text-sm font-medium border-b-2 transition-colors ${
                    tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}>
                  {t === "tasks" ? `Tareas (${weekTasks.length})` : `Restricciones (${constraints.length})`}
                </button>
              ))}
            </div>

            {/* Tasks tab */}
            {tab === "tasks" && (
              <div className="flex flex-col flex-1 overflow-auto">
                <div className="flex items-center justify-between px-6 py-3">
                  <p className="text-xs text-slate-500">
                    Semana {selectedWeek.week_number}: {fmt(selectedWeek.start_date)} – {fmt(selectedWeek.end_date)}
                  </p>
                  <button
                    onClick={() => setPanel({ type: "task", weekId: selectedWeekId! })}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                    + Tarea
                  </button>
                </div>

                {weekTasks.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center p-6">
                    <p className="text-sm text-slate-500">Sin tareas esta semana</p>
                    <p className="text-xs text-slate-400">Agrega tareas del lookahead o compromisos.</p>
                  </div>
                ) : (
                  <div className="overflow-auto px-6 pb-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left">
                          <th className="py-2 pr-4 text-xs font-medium text-slate-500 w-8">✓</th>
                          <th className="py-2 pr-4 text-xs font-medium text-slate-500">Descripción</th>
                          <th className="py-2 pr-4 text-xs font-medium text-slate-500 w-32">Responsable</th>
                          <th className="py-2 pr-4 text-xs font-medium text-slate-500 w-28">Especialidad</th>
                          <th className="py-2 pr-4 text-xs font-medium text-slate-500 w-24">Fecha</th>
                          <th className="py-2 pr-4 text-xs font-medium text-slate-500 w-32">Estado</th>
                          <th className="py-2 text-xs font-medium text-slate-500 w-24"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {weekTasks.map(task => (
                          <tr key={task.id} className="hover:bg-slate-50">
                            <td className="py-2 pr-4">
                              <input
                                type="checkbox"
                                checked={task.committed}
                                onChange={() => toggleCommitted.mutate({ id: task.id, committed: !task.committed })}
                                className="rounded"
                                title="Comprometer"
                              />
                            </td>
                            <td className="py-2 pr-4">
                              <p className="font-medium text-slate-800">{task.description}</p>
                              {task.reason_if_not && (
                                <p className="text-xs text-red-500 mt-0.5">Razón: {task.reason_if_not}</p>
                              )}
                            </td>
                            <td className="py-2 pr-4 text-slate-600">{task.responsible ?? "—"}</td>
                            <td className="py-2 pr-4 text-slate-600">{task.trade ?? "—"}</td>
                            <td className="py-2 pr-4 text-slate-600">
                              {task.planned_date ? fmt(task.planned_date) : "—"}
                            </td>
                            <td className="py-2 pr-4">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                task.committed ? STATUS_COLORS[task.status] : STATUS_COLORS.pending
                              }`}>
                                {!task.committed ? "Lookahead"
                                  : task.status === "pending"       ? "Comprometida"
                                  : task.status === "completed"     ? "Completada"
                                  : "No cumplida"}
                              </span>
                            </td>
                            <td className="py-2">
                              <div className="flex items-center gap-1">
                                {task.committed && task.status === "pending" && (
                                  <>
                                    <button
                                      onClick={() => updateTaskStatus.mutate({ id: task.id, status: "completed" })}
                                      className="rounded px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50"
                                      title="Marcar completada">✓</button>
                                    <button
                                      onClick={() => setPanel({ type: "reason", task })}
                                      className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                                      title="Marcar no cumplida">✕</button>
                                  </>
                                )}
                                <button
                                  onClick={() => setPanel({ type: "constraint", taskId: task.id })}
                                  className="rounded px-2 py-1 text-xs text-amber-500 hover:bg-amber-50"
                                  title="Agregar restricción">!</button>
                                <button
                                  onClick={() => { if (confirm("¿Eliminar tarea?")) deleteTask.mutate(task.id); }}
                                  className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-red-500">✕</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Constraints tab */}
            {tab === "constraints" && (
              <div className="flex flex-col flex-1 overflow-auto">
                <div className="flex items-center justify-between px-6 py-3">
                  <p className="text-xs text-slate-500">Todas las restricciones del proyecto</p>
                  <button
                    onClick={() => setPanel({ type: "constraint" })}
                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600">
                    + Restricción
                  </button>
                </div>
                {constraints.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                    Sin restricciones registradas
                  </div>
                ) : (
                  <div className="overflow-auto px-6 pb-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left">
                          <th className="py-2 pr-4 text-xs font-medium text-slate-500">Tipo</th>
                          <th className="py-2 pr-4 text-xs font-medium text-slate-500">Descripción</th>
                          <th className="py-2 pr-4 text-xs font-medium text-slate-500 w-32">Responsable</th>
                          <th className="py-2 pr-4 text-xs font-medium text-slate-500 w-24">Vence</th>
                          <th className="py-2 pr-4 text-xs font-medium text-slate-500 w-24">Estado</th>
                          <th className="py-2 text-xs font-medium text-slate-500 w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {constraints.map(c => (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="py-2 pr-4">
                              <span className="capitalize text-slate-600">
                                {CONSTRAINT_TYPES.find(t => t.value === c.type)?.label ?? c.type}
                              </span>
                            </td>
                            <td className="py-2 pr-4 text-slate-800">{c.description}</td>
                            <td className="py-2 pr-4 text-slate-600">{c.responsible ?? "—"}</td>
                            <td className="py-2 pr-4 text-slate-600">
                              {c.due_date ? fmt(c.due_date) : "—"}
                            </td>
                            <td className="py-2 pr-4">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                c.status === "open" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                              }`}>
                                {c.status === "open" ? "Abierta" : "Resuelta"}
                              </span>
                            </td>
                            <td className="py-2">
                              {c.status === "open" && (
                                <button
                                  onClick={() => resolveConstraint.mutate(c.id)}
                                  className="rounded px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50">
                                  Resolver
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Side panel ── */}
      {panel && (
        <div className="w-80 flex-shrink-0 border-l border-slate-200 bg-white flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-800">{panelTitle}</h3>
            <button onClick={() => setPanel(null)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="flex-1 overflow-auto p-5">
            {panel.type === "week"       && <WeekPanel />}
            {panel.type === "task"       && <TaskPanel weekId={panel.weekId} />}
            {panel.type === "constraint" && <ConstraintPanel taskId={panel.taskId} />}
            {panel.type === "reason"     && <ReasonPanel task={panel.task} />}
          </div>
        </div>
      )}
    </div>
  );
}
