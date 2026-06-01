"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus, X, Loader2, Trash2,
  CheckCircle2, XCircle, PlayCircle, RotateCcw, Wrench,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ServiceType   = "subcontract" | "equipment" | "transport" | "other";
type ServiceStatus = "pending" | "approved" | "in_progress" | "completed" | "cancelled";

interface Supplier {
  id: string;
  name: string;
  ruc: string | null;
}

interface ServiceOrder {
  id: string;
  os_number: string;
  service_type: ServiceType;
  description: string;
  supplier_id: string | null;
  suppliers: { name: string; ruc: string | null } | null;
  amount: number;
  status: ServiceStatus;
  issue_date: string | null;
  completion_date: string | null;
  notes: string | null;
  created_at: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SERVICE_TYPES: { value: ServiceType; label: string; color: string }[] = [
  { value: "subcontract", label: "Subcontrato",   color: "bg-violet-100 text-violet-700" },
  { value: "equipment",   label: "Equipos",       color: "bg-cyan-100 text-cyan-700"    },
  { value: "transport",   label: "Transporte",    color: "bg-amber-100 text-amber-700"  },
  { value: "other",       label: "Otro",          color: "bg-slate-100 text-slate-600"  },
];

const STATUS_META: Record<ServiceStatus, { label: string; color: string; bg: string }> = {
  pending:     { label: "Pendiente",    color: "text-amber-700",  bg: "bg-amber-100"  },
  approved:    { label: "Aprobada",     color: "text-blue-700",   bg: "bg-blue-100"   },
  in_progress: { label: "En curso",    color: "text-violet-700", bg: "bg-violet-100" },
  completed:   { label: "Completada",  color: "text-green-700",  bg: "bg-green-100"  },
  cancelled:   { label: "Anulada",     color: "text-red-700",    bg: "bg-red-100"    },
};

const FILTER_TABS = [
  { key: "all",         label: "Todas"      },
  { key: "pending",     label: "Pendiente"  },
  { key: "approved",    label: "Aprobadas"  },
  { key: "in_progress", label: "En curso"   },
  { key: "completed",   label: "Completadas"},
  { key: "cancelled",   label: "Anuladas"   },
] as const;

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
  currency: string;
  organizationId: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ServiceOrdersClient({ projectId, currency, organizationId }: Props) {
  const supabase = createClient();
  const sym = currency === "PEN" ? "S/" : "$";

  const [orders, setOrders]       = useState<ServiceOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("all");

  const [panelOpen, setPanelOpen]   = useState(false);
  const [editing, setEditing]       = useState<ServiceOrder | null>(null);
  const [saving, setSaving]         = useState(false);

  const [form, setForm] = useState({
    os_number:       "",
    service_type:    "subcontract" as ServiceType,
    description:     "",
    supplier_id:     "",
    amount:          "",
    issue_date:      "",
    completion_date: "",
    notes:           "",
  });

  const [supplierSearch, setSupplierSearch]     = useState("");
  const [showSupDrop, setShowSupDrop]           = useState(false);
  const [newSupName, setNewSupName]             = useState("");
  const [creatingSupplier, setCreatingSupplier] = useState(false);

  // ── Load ───────────────────────────────────────────────────────────────────

  async function loadOrders() {
    const { data } = await supabase
      .from("service_orders")
      .select("*, suppliers(name, ruc)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setOrders(data ?? []);
  }

  async function loadSuppliers() {
    const { data } = await supabase
      .from("suppliers")
      .select("id, name, ruc")
      .eq("organization_id", organizationId)
      .order("name");
    setSuppliers(data ?? []);
  }

  useEffect(() => {
    Promise.all([loadOrders(), loadSuppliers()]).finally(() => setLoading(false));
  }, [projectId]); // eslint-disable-line

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  const stats = {
    total:     orders.length,
    committed: orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + Number(o.amount), 0),
    active:    orders.filter(o => ["pending", "approved", "in_progress"].includes(o.status)).length,
    completed: orders.filter(o => o.status === "completed").length,
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  // ── Helpers ────────────────────────────────────────────────────────────────

  function fmt(n: number) {
    return `${sym} ${Number(n).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function typeColor(t: ServiceType) {
    return SERVICE_TYPES.find(s => s.value === t)?.color ?? "bg-slate-100 text-slate-600";
  }
  function typeLabel(t: ServiceType) {
    return SERVICE_TYPES.find(s => s.value === t)?.label ?? t;
  }

  async function nextOsNumber() {
    const { data } = await supabase
      .from("service_orders")
      .select("os_number")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (!data?.length) return "OS-001";
    const m = data[0].os_number.match(/(\d+)$/);
    const n = m ? parseInt(m[1]) + 1 : orders.length + 1;
    return `OS-${String(n).padStart(3, "0")}`;
  }

  // ── Panel open/close ───────────────────────────────────────────────────────

  async function openNew() {
    const os_number = await nextOsNumber();
    setEditing(null);
    setForm({
      os_number, service_type: "subcontract", description: "",
      supplier_id: "", amount: "",
      issue_date: new Date().toISOString().slice(0, 10),
      completion_date: "", notes: "",
    });
    setSupplierSearch("");
    setPanelOpen(true);
  }

  function openEdit(o: ServiceOrder) {
    setEditing(o);
    setForm({
      os_number:       o.os_number,
      service_type:    o.service_type,
      description:     o.description,
      supplier_id:     o.supplier_id ?? "",
      amount:          String(o.amount),
      issue_date:      o.issue_date ?? "",
      completion_date: o.completion_date ?? "",
      notes:           o.notes ?? "",
    });
    setSupplierSearch(o.suppliers?.name ?? "");
    setPanelOpen(true);
  }

  function closePanel() { setPanelOpen(false); setEditing(null); }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function save() {
    if (!form.os_number.trim())  { toast.error("N° de OS requerido"); return; }
    if (!form.description.trim()) { toast.error("Descripción requerida"); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error("Monto debe ser mayor a 0"); return; }

    setSaving(true);
    const payload = {
      project_id:      projectId,
      organization_id: organizationId,
      os_number:       form.os_number.trim(),
      service_type:    form.service_type,
      description:     form.description.trim(),
      supplier_id:     form.supplier_id || null,
      amount:          parseFloat(form.amount),
      issue_date:      form.issue_date || null,
      completion_date: form.completion_date || null,
      notes:           form.notes.trim() || null,
    };

    if (editing) {
      const { error } = await supabase.from("service_orders").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("OS actualizada");
    } else {
      const { error } = await supabase.from("service_orders").insert(payload);
      if (error) {
        toast.error(error.message.includes("unique") ? "Ya existe una OS con ese número" : error.message);
        setSaving(false);
        return;
      }
      toast.success("OS creada");
    }
    setSaving(false);
    closePanel();
    await loadOrders();
  }

  // ── Status change ──────────────────────────────────────────────────────────

  async function changeStatus(status: ServiceStatus) {
    if (!editing) return;
    const { error } = await supabase.from("service_orders").update({ status }).eq("id", editing.id);
    if (error) { toast.error(error.message); return; }
    setEditing(prev => prev ? { ...prev, status } : prev);
    await loadOrders();
    toast.success(`Estado: ${STATUS_META[status].label}`);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function deleteOrder() {
    if (!editing) return;
    if (!confirm(`¿Eliminar ${editing.os_number}? Esta acción no se puede deshacer.`)) return;
    await supabase.from("service_orders").delete().eq("id", editing.id);
    toast.success("OS eliminada");
    closePanel();
    await loadOrders();
  }

  // ── Supplier create inline ─────────────────────────────────────────────────

  async function createSupplier() {
    if (!newSupName.trim()) return;
    setCreatingSupplier(true);
    const { data, error } = await supabase
      .from("suppliers")
      .insert({ organization_id: organizationId, name: newSupName.trim() })
      .select()
      .single();
    setCreatingSupplier(false);
    if (error) { toast.error(error.message); return; }
    const s = data as Supplier;
    setSuppliers(prev => [...prev, s].sort((a, b) => a.name.localeCompare(b.name)));
    setForm(prev => ({ ...prev, supplier_id: s.id }));
    setSupplierSearch(s.name);
    setNewSupName("");
    setShowSupDrop(false);
    toast.success("Proveedor creado");
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* ── Contenido principal ─────────────────────────────────────────────── */}
      <div className={cn("flex flex-1 flex-col overflow-y-auto", panelOpen && "mr-[480px]")}>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4 p-6 pb-0">
          {[
            { label: "Total OS",      value: stats.total,          sub: "órdenes" },
            { label: "Comprometido",  value: fmt(stats.committed), sub: "excl. anuladas" },
            { label: "Activas",       value: stats.active,         sub: "en gestión" },
            { label: "Completadas",   value: stats.completed,      sub: "finalizadas" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className="text-xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Filtros + acción */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === tab.key ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nueva OS
          </button>
        </div>

        {/* Tabla */}
        <div className="px-6 pb-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
              <Wrench className="mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">Sin órdenes de servicio</p>
              <p className="mt-1 text-xs text-slate-400">
                {filter === "all" ? 'Crea la primera OS con "Nueva OS"' : "No hay OS con este filtro"}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {["N° OS", "Tipo", "Descripción", "Proveedor", "Fecha", "Monto", "Estado"].map((h, i) => (
                      <th key={h} className={cn(
                        "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500",
                        i >= 5 ? "text-right" : "text-left",
                        i === 6 && "text-center",
                      )}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(o => {
                    const meta = STATUS_META[o.status];
                    return (
                      <tr key={o.id} className="cursor-pointer transition-colors hover:bg-slate-50" onClick={() => openEdit(o)}>
                        <td className="px-4 py-3 font-mono font-medium text-slate-900">{o.os_number}</td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", typeColor(o.service_type))}>
                            {typeLabel(o.service_type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate">{o.description}</td>
                        <td className="px-4 py-3 text-slate-500">{o.suppliers?.name ?? <span className="italic text-slate-400">—</span>}</td>
                        <td className="px-4 py-3 text-slate-500">{o.issue_date ? fmtDate(o.issue_date) : "—"}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">{fmt(o.amount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", meta.bg, meta.color)}>
                            {meta.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Panel lateral ───────────────────────────────────────────────────── */}
      {panelOpen && (
        <div className="fixed right-0 top-0 z-40 flex h-screen w-[480px] flex-col border-l border-slate-200 bg-white shadow-xl">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {editing ? editing.os_number : "Nueva Orden de Servicio"}
              </h3>
              {editing && (
                <span className={cn("mt-0.5 inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                  STATUS_META[editing.status].bg, STATUS_META[editing.status].color)}>
                  {STATUS_META[editing.status].label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {editing && editing.status === "pending" && (
                <button onClick={deleteOrder}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  title="Eliminar OS">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button onClick={closePanel}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <Fld label="N° OS *">
                <input value={form.os_number}
                  onChange={e => setForm(p => ({ ...p, os_number: e.target.value }))}
                  className={inp()} placeholder="OS-001" />
              </Fld>
              <Fld label="Tipo de servicio">
                <select value={form.service_type}
                  onChange={e => setForm(p => ({ ...p, service_type: e.target.value as ServiceType }))}
                  className={inp()}>
                  {SERVICE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Fld>
            </div>

            <Fld label="Descripción del servicio *">
              <textarea value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={3} className={inp() + " resize-none"}
                placeholder="Descripción detallada del servicio contratado..." />
            </Fld>

            {/* Proveedor combobox */}
            <Fld label="Proveedor / Subcontratista">
              <div className="relative">
                <input value={supplierSearch}
                  onChange={e => { setSupplierSearch(e.target.value); setShowSupDrop(true); }}
                  onFocus={() => setShowSupDrop(true)}
                  onBlur={() => setTimeout(() => setShowSupDrop(false), 150)}
                  className={inp()} placeholder="Buscar o crear proveedor..." />
                {showSupDrop && (
                  <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                    <div className="max-h-44 overflow-y-auto">
                      {filteredSuppliers.length > 0 ? (
                        filteredSuppliers.map(s => (
                          <button key={s.id}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors"
                            onMouseDown={() => {
                              setForm(p => ({ ...p, supplier_id: s.id }));
                              setSupplierSearch(s.name);
                              setShowSupDrop(false);
                            }}>
                            <span className="font-medium text-slate-900">{s.name}</span>
                            {s.ruc && <span className="ml-2 text-xs text-slate-400">RUC {s.ruc}</span>}
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-xs text-slate-400">Sin coincidencias</p>
                      )}
                    </div>
                    {supplierSearch.trim() && !suppliers.find(s => s.name.toLowerCase() === supplierSearch.toLowerCase()) && (
                      <div className="border-t border-slate-100 p-2">
                        <div className="flex gap-2">
                          <input value={newSupName || supplierSearch}
                            onChange={e => setNewSupName(e.target.value)}
                            onMouseDown={e => e.stopPropagation()}
                            className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-400"
                            placeholder="Nombre del proveedor" />
                          <button onMouseDown={createSupplier} disabled={creatingSupplier}
                            className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                            {creatingSupplier ? <Loader2 className="h-3 w-3 animate-spin" /> : "Crear"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Fld>

            <Fld label={`Monto (${sym}) *`}>
              <input type="number" step="0.01" min="0.01" value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                className={inp()} placeholder="0.00" />
            </Fld>

            <div className="grid grid-cols-2 gap-4">
              <Fld label="Fecha de inicio">
                <input type="date" value={form.issue_date}
                  onChange={e => setForm(p => ({ ...p, issue_date: e.target.value }))}
                  className={inp()} />
              </Fld>
              <Fld label="Fecha de término">
                <input type="date" value={form.completion_date}
                  onChange={e => setForm(p => ({ ...p, completion_date: e.target.value }))}
                  className={inp()} />
              </Fld>
            </div>

            <Fld label="Notas / Condiciones">
              <textarea value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={2} className={inp() + " resize-none"}
                placeholder="Condiciones especiales, lugar de trabajo, penalidades..." />
            </Fld>

            <button onClick={save} disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editing ? "Guardar cambios" : "Crear orden de servicio"}
            </button>
          </div>

          {/* Status actions */}
          {editing && (
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
              <p className="mb-2 text-xs font-medium text-slate-500">Cambiar estado</p>
              <div className="flex flex-wrap gap-2">
                {editing.status === "pending" && (
                  <StatusBtn onClick={() => changeStatus("approved")}
                    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    label="Aprobar" cls="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100" />
                )}
                {editing.status === "approved" && (
                  <StatusBtn onClick={() => changeStatus("in_progress")}
                    icon={<PlayCircle className="h-3.5 w-3.5" />}
                    label="Iniciar" cls="border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100" />
                )}
                {editing.status === "in_progress" && (
                  <StatusBtn onClick={() => changeStatus("completed")}
                    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    label="Completar" cls="border-green-300 bg-green-50 text-green-700 hover:bg-green-100" />
                )}
                {!["cancelled", "completed"].includes(editing.status) && (
                  <StatusBtn onClick={() => changeStatus("cancelled")}
                    icon={<XCircle className="h-3.5 w-3.5" />}
                    label="Anular" cls="border-red-200 bg-red-50 text-red-600 hover:bg-red-100" />
                )}
                {editing.status === "cancelled" && (
                  <StatusBtn onClick={() => changeStatus("pending")}
                    icon={<RotateCcw className="h-3.5 w-3.5" />}
                    label="Restaurar" cls="border-slate-300 bg-white text-slate-600 hover:bg-slate-100" />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function inp() {
  return "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors";
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function StatusBtn({ onClick, icon, label, cls }: {
  onClick: () => void; icon: React.ReactNode; label: string; cls: string;
}) {
  return (
    <button onClick={onClick}
      className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors", cls)}>
      {icon}{label}
    </button>
  );
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-PE", {
    day: "2-digit", month: "short", year: "numeric",
  });
}
