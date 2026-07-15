"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Plus, X, Loader2, Trash2,
  CheckCircle2, PackageCheck, XCircle, Send,
  FileText, RotateCcw, PackageOpen,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type POStatus = "draft" | "sent" | "partial" | "received" | "cancelled";

interface Supplier {
  id: string;
  name: string;
  ruc: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
}

interface POItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  status: POStatus;
  supplier_id: string | null;
  suppliers: { name: string; ruc: string | null } | null;
  issue_date: string | null;
  expected_date: string | null;
  notes: string | null;
  total: number;
  created_at: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<POStatus, { label: string; color: string; bg: string }> = {
  draft:     { label: "Borrador",       color: "text-slate-600",  bg: "bg-slate-100"  },
  sent:      { label: "Enviada",        color: "text-blue-700",   bg: "bg-blue-100"   },
  partial:   { label: "Recep. parcial", color: "text-amber-700",  bg: "bg-amber-100"  },
  received:  { label: "Recibida",       color: "text-green-700",  bg: "bg-green-100"  },
  cancelled: { label: "Anulada",        color: "text-red-700",    bg: "bg-red-100"    },
};

const FILTER_TABS = [
  { key: "all",       label: "Todas"     },
  { key: "draft",     label: "Borrador"  },
  { key: "sent",      label: "Enviadas"  },
  { key: "partial",   label: "Parcial"   },
  { key: "received",  label: "Recibidas" },
  { key: "cancelled", label: "Anuladas"  },
] as const;

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
  currency: string;
  organizationId: string;
  /** ¿El usuario puede aprobar/emitir órdenes? (permiso compras.approve) */
  canApprove?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PurchaseOrdersClient({ projectId, currency, organizationId, canApprove = true }: Props) {
  const supabase = createClient() as any;
  const sym = currency === "PEN" ? "S/" : "$";

  const [pos, setPos]             = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("all");

  // Panel
  const [panelOpen, setPanelOpen]       = useState(false);
  const [editingPo, setEditingPo]       = useState<PurchaseOrder | null>(null);
  const [items, setItems]               = useState<POItem[]>([]);
  const [savingHeader, setSavingHeader] = useState(false);

  // Header form
  const [form, setForm] = useState({
    po_number:     "",
    supplier_id:   "",
    issue_date:    "",
    expected_date: "",
    notes:         "",
  });

  // Supplier combobox
  const [supplierSearch, setSupplierSearch]       = useState("");
  const [showSupplierDrop, setShowSupplierDrop]   = useState(false);
  const [newSupplierName, setNewSupplierName]     = useState("");
  const [creatingSupplier, setCreatingSupplier]   = useState(false);

  // ── Load ───────────────────────────────────────────────────────────────────

  async function loadPos() {
    const { data } = await supabase
      .from("purchase_orders")
      .select("*, suppliers(name, ruc)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setPos(data ?? []);
  }

  async function loadSuppliers() {
    const { data } = await supabase
      .from("suppliers")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name");
    setSuppliers(data ?? []);
  }

  useEffect(() => {
    Promise.all([loadPos(), loadSuppliers()]).finally(() => setLoading(false));
  }, [projectId]); // eslint-disable-line

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = filter === "all" ? pos : pos.filter((p) => p.status === filter);

  const stats = {
    total:    pos.length,
    value:    pos.filter((p) => p.status !== "cancelled").reduce((s, p) => s + p.total, 0),
    pending:  pos.filter((p) => ["draft", "sent", "partial"].includes(p.status)).length,
    received: pos.filter((p) => p.status === "received").length,
  };

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const itemsTotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function fmt(n: number) {
    return `${sym} ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function todayStr() {
    return new Date().toISOString().split("T")[0];
  }

  async function nextPoNumber() {
    const { data } = await supabase
      .from("purchase_orders")
      .select("po_number")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (!data || data.length === 0) return "OC-001";
    const last = data[0].po_number;
    const match = last.match(/(\d+)$/);
    const next = match ? parseInt(match[1]) + 1 : pos.length + 1;
    return `OC-${String(next).padStart(3, "0")}`;
  }

  // ── Panel open/close ───────────────────────────────────────────────────────

  async function openNew() {
    const po_number = await nextPoNumber();
    setEditingPo(null);
    setItems([]);
    setForm({ po_number, supplier_id: "", issue_date: todayStr(), expected_date: "", notes: "" });
    setSupplierSearch("");
    setPanelOpen(true);
  }

  async function openEdit(po: PurchaseOrder) {
    setEditingPo(po);
    setForm({
      po_number:     po.po_number,
      supplier_id:   po.supplier_id ?? "",
      issue_date:    po.issue_date ?? "",
      expected_date: po.expected_date ?? "",
      notes:         po.notes ?? "",
    });
    const sup = suppliers.find((s) => s.id === po.supplier_id);
    setSupplierSearch(sup?.name ?? "");
    const { data } = await supabase
      .from("purchase_order_items")
      .select("*")
      .eq("purchase_order_id", po.id)
      .order("sort_order");
    setItems(data ?? []);
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setEditingPo(null);
    setItems([]);
  }

  // ── Save header ────────────────────────────────────────────────────────────

  async function saveHeader() {
    if (!form.po_number.trim()) { toast.error("N° de OC requerido"); return; }
    setSavingHeader(true);

    const payload = {
      project_id:    projectId,
      supplier_id:   form.supplier_id || null,
      po_number:     form.po_number.trim(),
      issue_date:    form.issue_date || null,
      expected_date: form.expected_date || null,
      notes:         form.notes.trim() || null,
    };

    if (editingPo) {
      const { error } = await supabase.from("purchase_orders").update(payload).eq("id", editingPo.id);
      if (error) { toast.error(error.message); setSavingHeader(false); return; }
      toast.success("OC actualizada");
    } else {
      const { data, error } = await supabase
        .from("purchase_orders")
        .insert(payload)
        .select("*, suppliers(name, ruc)")
        .single();
      if (error) {
        toast.error(error.message.includes("unique") ? "Ya existe una OC con ese número" : error.message);
        setSavingHeader(false);
        return;
      }
      setEditingPo(data as PurchaseOrder);
      toast.success("OC creada — ahora agrega los ítems");
    }
    setSavingHeader(false);
    await loadPos();
  }

  // ── Status change ──────────────────────────────────────────────────────────

  async function changeStatus(status: POStatus) {
    if (!editingPo) return;
    // Cambiar el estado de una OC (emitir/recibir/anular) requiere compras.approve.
    // La RLS es la barrera definitiva; esto evita el intento y da feedback.
    if (!canApprove) {
      toast.error("No tienes permiso para cambiar el estado de las órdenes");
      return;
    }
    const { error } = await supabase
      .from("purchase_orders")
      .update({ status })
      .eq("id", editingPo.id);
    if (error) { toast.error(error.message); return; }
    setEditingPo((prev) => prev ? { ...prev, status } : prev);
    await loadPos();
    toast.success(`Estado: ${STATUS_META[status].label}`);
  }

  // ── Items ──────────────────────────────────────────────────────────────────

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id:          `tmp_${Date.now()}`,
        description: "",
        unit:        "und",
        quantity:    1,
        unit_price:  0,
        total:       0,
        sort_order:  prev.length,
      },
    ]);
  }

  function updateItem(id: string, field: keyof POItem, value: string | number) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const updated = { ...i, [field]: value };
        updated.total = updated.quantity * updated.unit_price;
        return updated;
      })
    );
  }

  async function saveItem(item: POItem) {
    if (!editingPo) { toast.error("Guarda la OC primero"); return; }
    if (!item.description.trim()) return;

    const payload = {
      purchase_order_id: editingPo.id,
      description:       item.description,
      unit:              item.unit,
      quantity:          item.quantity,
      unit_price:        item.unit_price,
      total:             item.quantity * item.unit_price,
      sort_order:        item.sort_order,
    };

    if (item.id.startsWith("tmp_")) {
      const { data, error } = await supabase
        .from("purchase_order_items")
        .insert(payload)
        .select()
        .single();
      if (error) { toast.error(error.message); return; }
      setItems((prev) => prev.map((i) => (i.id === item.id ? (data as POItem) : i)));
    } else {
      const { error } = await supabase
        .from("purchase_order_items")
        .update(payload)
        .eq("id", item.id);
      if (error) { toast.error(error.message); return; }
    }
    await loadPos();
  }

  async function deleteItem(itemId: string) {
    if (itemId.startsWith("tmp_")) {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      return;
    }
    const { error } = await supabase.from("purchase_order_items").delete().eq("id", itemId);
    if (error) { toast.error(error.message); return; }
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    await loadPos();
  }

  // ── Supplier ───────────────────────────────────────────────────────────────

  async function createSupplier() {
    if (!newSupplierName.trim()) return;
    setCreatingSupplier(true);
    const { data, error } = await supabase
      .from("suppliers")
      .insert({ organization_id: organizationId, name: newSupplierName.trim() })
      .select()
      .single();
    setCreatingSupplier(false);
    if (error) { toast.error(error.message); return; }
    const s = data as Supplier;
    setSuppliers((prev) => [...prev, s].sort((a, b) => a.name.localeCompare(b.name)));
    setForm((prev) => ({ ...prev, supplier_id: s.id }));
    setSupplierSearch(s.name);
    setNewSupplierName("");
    setShowSupplierDrop(false);
    toast.success("Proveedor creado");
  }

  // ── Delete PO ──────────────────────────────────────────────────────────────

  async function deletePo() {
    if (!editingPo) return;
    if (!confirm(`¿Eliminar ${editingPo.po_number}? Esta acción no se puede deshacer.`)) return;
    await supabase.from("purchase_orders").delete().eq("id", editingPo.id);
    toast.success("OC eliminada");
    closePanel();
    await loadPos();
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
      <div className={cn("flex flex-1 flex-col overflow-y-auto", panelOpen && "mr-[520px]")}>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 p-6 pb-0">
          {[
            { label: "Total OC",      value: stats.total,      sub: "órdenes" },
            { label: "Comprometido",  value: fmt(stats.value), sub: "excl. anuladas" },
            { label: "En proceso",    value: stats.pending,    sub: "pendientes" },
            { label: "Recibidas",     value: stats.received,   sub: "completadas" },
          ].map((s) => (
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
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === tab.key
                    ? "bg-blue-600 text-white"
                    : "text-slate-500 hover:text-slate-700"
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
            <Plus className="h-4 w-4" /> Nueva OC
          </button>
        </div>

        {/* Tabla */}
        <div className="px-6 pb-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
              <FileText className="mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">Sin órdenes de compra</p>
              <p className="mt-1 text-xs text-slate-400">
                {filter === "all" ? 'Crea la primera OC con "Nueva OC"' : "No hay OC con este filtro"}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {["N° OC", "Proveedor", "Emisión", "Esperado", "Total", "Estado", ""].map((h, i) => (
                      <th
                        key={h + i}
                        className={cn(
                          "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500",
                          i >= 4 && i < 6 ? "text-right" : "text-left",
                          i === 5 && "text-center"
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((po) => {
                    const meta = STATUS_META[po.status];
                    return (
                      <tr
                        key={po.id}
                        className="cursor-pointer transition-colors hover:bg-slate-50"
                        onClick={() => openEdit(po)}
                      >
                        <td className="px-4 py-3 font-mono font-medium text-slate-900">
                          {po.po_number}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {po.suppliers?.name ?? (
                            <span className="italic text-slate-400">Sin proveedor</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {po.issue_date ? fmtDate(po.issue_date) : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {po.expected_date ? fmtDate(po.expected_date) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">
                          {fmt(po.total)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                              meta.bg,
                              meta.color
                            )}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          {(po.status === 'sent' || po.status === 'partial') && (
                            <Link
                              href={`/proyectos/${projectId}/compras/${po.id}/recibir`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
                            >
                              <PackageOpen className="h-3.5 w-3.5" /> Recibir
                            </Link>
                          )}
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
        <div className="fixed right-0 top-0 z-40 flex h-screen w-[520px] flex-col border-l border-slate-200 bg-white shadow-xl">

          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {editingPo ? editingPo.po_number : "Nueva Orden de Compra"}
              </h3>
              {editingPo && (
                <span
                  className={cn(
                    "mt-0.5 inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                    STATUS_META[editingPo.status].bg,
                    STATUS_META[editingPo.status].color
                  )}
                >
                  {STATUS_META[editingPo.status].label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {editingPo && editingPo.status === "draft" && (
                <button
                  onClick={deletePo}
                  className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  title="Eliminar OC"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={closePanel}
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">

            {/* Formulario cabecera */}
            <div className="space-y-4 border-b border-slate-100 p-6">
              <div className="grid grid-cols-2 gap-4">
                <Fld label="N° OC *">
                  <input
                    value={form.po_number}
                    onChange={(e) => setForm((p) => ({ ...p, po_number: e.target.value }))}
                    className={inp()}
                    placeholder="OC-001"
                  />
                </Fld>
                <Fld label="Fecha emisión">
                  <input
                    type="date"
                    value={form.issue_date}
                    onChange={(e) => setForm((p) => ({ ...p, issue_date: e.target.value }))}
                    className={inp()}
                  />
                </Fld>
              </div>

              {/* Proveedor combobox */}
              <Fld label="Proveedor">
                <div className="relative">
                  <input
                    value={supplierSearch}
                    onChange={(e) => {
                      setSupplierSearch(e.target.value);
                      setShowSupplierDrop(true);
                    }}
                    onFocus={() => setShowSupplierDrop(true)}
                    onBlur={() => setTimeout(() => setShowSupplierDrop(false), 150)}
                    className={inp()}
                    placeholder="Buscar o crear proveedor..."
                  />
                  {showSupplierDrop && (
                    <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                      <div className="max-h-44 overflow-y-auto">
                        {filteredSuppliers.length > 0 ? (
                          filteredSuppliers.map((s) => (
                            <button
                              key={s.id}
                              className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
                              onMouseDown={() => {
                                setForm((p) => ({ ...p, supplier_id: s.id }));
                                setSupplierSearch(s.name);
                                setShowSupplierDrop(false);
                              }}
                            >
                              <span className="font-medium text-slate-900">{s.name}</span>
                              {s.ruc && (
                                <span className="ml-2 text-xs text-slate-400">RUC {s.ruc}</span>
                              )}
                            </button>
                          ))
                        ) : (
                          <p className="px-3 py-2 text-xs text-slate-400">Sin coincidencias</p>
                        )}
                      </div>
                      {/* Crear nuevo proveedor inline */}
                      {supplierSearch.trim() &&
                        !suppliers.find(
                          (s) => s.name.toLowerCase() === supplierSearch.toLowerCase()
                        ) && (
                          <div className="border-t border-slate-100 p-2">
                            <div className="flex gap-2">
                              <input
                                value={newSupplierName || supplierSearch}
                                onChange={(e) => setNewSupplierName(e.target.value)}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-400"
                                placeholder="Nombre del proveedor"
                              />
                              <button
                                onMouseDown={createSupplier}
                                disabled={creatingSupplier}
                                className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                              >
                                {creatingSupplier ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Crear"
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </Fld>

              <Fld label="Fecha esperada de entrega">
                <input
                  type="date"
                  value={form.expected_date}
                  onChange={(e) => setForm((p) => ({ ...p, expected_date: e.target.value }))}
                  className={inp()}
                />
              </Fld>

              <Fld label="Notas / Condiciones">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className={inp() + " resize-none"}
                  placeholder="Condiciones de pago, lugar de entrega..."
                />
              </Fld>

              <button
                onClick={saveHeader}
                disabled={savingHeader}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {savingHeader && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editingPo ? "Guardar cambios" : "Crear OC"}
              </button>
            </div>

            {/* Ítems — solo si la OC ya existe */}
            {editingPo && (
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-700">Ítems</h4>
                  <button
                    onClick={addItem}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar ítem
                  </button>
                </div>

                {items.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">
                    Sin ítems. Haz clic en "Agregar ítem".
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="px-2 py-2 text-left font-semibold text-slate-500">Descripción</th>
                          <th className="w-12 px-2 py-2 text-center font-semibold text-slate-500">Und</th>
                          <th className="w-14 px-2 py-2 text-right font-semibold text-slate-500">Cant.</th>
                          <th className="w-20 px-2 py-2 text-right font-semibold text-slate-500">P.U.</th>
                          <th className="w-20 px-2 py-2 text-right font-semibold text-slate-500">Total</th>
                          <th className="w-7"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-1 py-1">
                              <input
                                value={item.description}
                                onChange={(e) => updateItem(item.id, "description", e.target.value)}
                                onBlur={() => saveItem(item)}
                                className="w-full rounded bg-transparent px-1.5 py-1 text-xs text-slate-900 outline-none hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-300"
                                placeholder="Descripción"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <input
                                value={item.unit}
                                onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                                onBlur={() => saveItem(item)}
                                className="w-full rounded bg-transparent px-1 py-1 text-center text-xs text-slate-700 outline-none hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-300"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <input
                                type="number"
                                min={0}
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)
                                }
                                onBlur={() => saveItem(item)}
                                className="w-full rounded bg-transparent px-1 py-1 text-right text-xs text-slate-700 outline-none hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-300"
                              />
                            </td>
                            <td className="px-1 py-1">
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={item.unit_price}
                                onChange={(e) =>
                                  updateItem(item.id, "unit_price", parseFloat(e.target.value) || 0)
                                }
                                onBlur={() => saveItem(item)}
                                className="w-full rounded bg-transparent px-1 py-1 text-right text-xs text-slate-700 outline-none hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-300"
                              />
                            </td>
                            <td className="px-2 py-1 text-right font-medium tabular-nums text-slate-900">
                              {(item.quantity * item.unit_price).toLocaleString("es-PE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-1 py-1 text-center">
                              <button
                                onClick={() => deleteItem(item.id)}
                                className="rounded p-0.5 text-slate-300 transition-colors hover:text-red-500"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200 bg-slate-50">
                          <td colSpan={4} className="px-3 py-2 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Total OC
                          </td>
                          <td className="px-2 py-2 text-right text-sm font-bold tabular-nums text-slate-900">
                            {fmt(itemsTotal)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer: acciones de estado */}
          {editingPo && canApprove && (
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
              <p className="mb-2 text-xs font-medium text-slate-500">Cambiar estado</p>
              <div className="flex flex-wrap gap-2">
                {editingPo.status === "draft" && (
                  <StatusBtn
                    onClick={() => changeStatus("sent")}
                    icon={<Send className="h-3.5 w-3.5" />}
                    label="Marcar como enviada"
                    cls="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  />
                )}
                {editingPo.status === "sent" && (
                  <StatusBtn
                    onClick={() => changeStatus("partial")}
                    icon={<PackageCheck className="h-3.5 w-3.5" />}
                    label="Recepción parcial"
                    cls="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  />
                )}
                {(editingPo.status === "sent" || editingPo.status === "partial") && (
                  <StatusBtn
                    onClick={() => changeStatus("received")}
                    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    label="Marcar como recibida"
                    cls="border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                  />
                )}
                {!["cancelled", "received"].includes(editingPo.status) && (
                  <StatusBtn
                    onClick={() => changeStatus("cancelled")}
                    icon={<XCircle className="h-3.5 w-3.5" />}
                    label="Anular"
                    cls="border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  />
                )}
                {editingPo.status === "cancelled" && (
                  <StatusBtn
                    onClick={() => changeStatus("draft")}
                    icon={<RotateCcw className="h-3.5 w-3.5" />}
                    label="Restaurar a borrador"
                    cls="border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function inp() {
  return "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition-colors bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function StatusBtn({
  onClick, icon, label, cls,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  cls: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
        cls
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-PE", {
    day:   "2-digit",
    month: "short",
    year:  "numeric",
  });
}
