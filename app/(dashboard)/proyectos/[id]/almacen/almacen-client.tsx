"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus, X, Loader2, Trash2, Package, PackagePlus, PackageMinus,
  AlertTriangle, CheckCircle2, Search,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StockLevel {
  stock_item_id: string;
  project_id: string;
  name: string;
  unit: string;
  min_stock: number;
  resource_id: string | null;
  total_in: number;
  total_out: number;
  current_stock: number;
  low_stock: boolean;
  ppp_unit_cost: number;
  stock_value: number;
}

interface StockEntry {
  id: string;
  stock_item_id: string;
  quantity: number;
  unit_cost: number;
  entry_date: string;
  purchase_order_id: string | null;
  notes: string | null;
  created_at: string;
  stock_items: { name: string; unit: string } | null;
  purchase_orders: { po_number: string } | null;
}

interface StockWithdrawal {
  id: string;
  stock_item_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  budget_item_id: string;
  withdrawal_date: string;
  delivered_to: string | null;
  notes: string | null;
  created_at: string;
  stock_items: { name: string; unit: string } | null;
  budget_items: { item_code: string; description: string } | null;
}

interface StockItem {
  id: string;
  name: string;
  unit: string;
  min_stock: number;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
}

interface BudgetItem {
  id: string;
  item_code: string;
  description: string;
}

type Tab = "stock" | "ingresos" | "salidas";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
  currency: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AlmacenClient({ projectId, currency }: Props) {
  const supabase = createClient() as any;
  const sym = currency === "PEN" ? "S/" : "$";

  const [tab, setTab] = useState<Tab>("stock");
  const [loading, setLoading] = useState(true);

  // Data
  const [levels, setLevels]         = useState<StockLevel[]>([]);
  const [entries, setEntries]       = useState<StockEntry[]>([]);
  const [withdrawals, setWithdrawals] = useState<StockWithdrawal[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);

  // Search
  const [search, setSearch] = useState("");

  // Panels
  const [panelType, setPanelType] = useState<"item" | "entry" | "withdrawal" | null>(null);

  // Forms
  const [itemForm, setItemForm]   = useState({ name: "", unit: "und", min_stock: "0" });
  const [entryForm, setEntryForm] = useState({
    stock_item_id: "", quantity: "", unit_cost: "0",
    entry_date: today(), purchase_order_id: "", notes: "",
  });
  const [withdrawalForm, setWithdrawalForm] = useState({
    stock_item_id: "", quantity: "", budget_item_id: "",
    withdrawal_date: today(), delivered_to: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  // ── Load ───────────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    const [
      { data: lvl },
      { data: ent },
      { data: wit },
      { data: items },
      { data: pos },
      { data: bItems },
    ] = await Promise.all([
      supabase.from("stock_levels").select("*").eq("project_id", projectId).order("name"),
      supabase
        .from("stock_entries")
        .select("*, stock_items(name,unit), purchase_orders(po_number)")
        .eq("project_id", projectId)
        .order("entry_date", { ascending: false }),
      supabase
        .from("stock_withdrawals")
        .select("*, stock_items(name,unit), budget_items(item_code,description)")
        .eq("project_id", projectId)
        .order("withdrawal_date", { ascending: false }),
      supabase.from("stock_items").select("id,name,unit,min_stock").eq("project_id", projectId).order("name"),
      supabase.from("purchase_orders").select("id,po_number").eq("project_id", projectId).order("po_number"),
      supabase
        .from("budget_items")
        .select("id,item_code,description")
        .in(
          "budget_id",
          (await supabase.from("budgets").select("id").eq("project_id", projectId)).data?.map((b: { id: string }) => b.id) ?? []
        )
        .order("item_code"),
    ]);

    setLevels(lvl ?? []);
    setEntries((ent ?? []) as StockEntry[]);
    setWithdrawals((wit ?? []) as StockWithdrawal[]);
    setStockItems(items ?? []);
    setPurchaseOrders(pos ?? []);
    setBudgetItems(bItems ?? []);
  }, [projectId]); // eslint-disable-line

  useEffect(() => { loadAll().finally(() => setLoading(false)); }, [loadAll]);

  // ── Filtered ───────────────────────────────────────────────────────────────

  const q = search.toLowerCase();
  const filteredLevels = levels.filter((l) => l.name.toLowerCase().includes(q));
  const filteredEntries = entries.filter(
    (e) => e.stock_items?.name.toLowerCase().includes(q) || e.purchase_orders?.po_number.toLowerCase().includes(q)
  );
  const filteredWithdrawals = withdrawals.filter(
    (w) =>
      w.stock_items?.name.toLowerCase().includes(q) ||
      w.budget_items?.description.toLowerCase().includes(q) ||
      (w.delivered_to ?? "").toLowerCase().includes(q)
  );

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = {
    items:    levels.length,
    lowStock: levels.filter((l) => l.low_stock).length,
    entries:  entries.length,
    exits:    withdrawals.length,
  };

  // ── Crear material ─────────────────────────────────────────────────────────

  async function saveItem() {
    if (!itemForm.name.trim()) { toast.error("Nombre requerido"); return; }
    setSaving(true);
    const { error } = await supabase.from("stock_items").insert({
      project_id: projectId,
      name:       itemForm.name.trim(),
      unit:       itemForm.unit.trim() || "und",
      min_stock:  parseFloat(itemForm.min_stock) || 0,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Material registrado");
    setPanelType(null);
    setItemForm({ name: "", unit: "und", min_stock: "0" });
    await loadAll();
  }

  // ── Crear ingreso ──────────────────────────────────────────────────────────

  async function saveEntry() {
    if (!entryForm.stock_item_id) { toast.error("Selecciona un material"); return; }
    const qty = parseFloat(entryForm.quantity);
    if (!qty || qty <= 0) { toast.error("Cantidad debe ser mayor a 0"); return; }
    setSaving(true);
    const { error } = await supabase.from("stock_entries").insert({
      project_id:        projectId,
      stock_item_id:     entryForm.stock_item_id,
      quantity:          qty,
      unit_cost:         parseFloat(entryForm.unit_cost) || 0,
      entry_date:        entryForm.entry_date,
      purchase_order_id: entryForm.purchase_order_id || null,
      notes:             entryForm.notes.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Ingreso registrado");
    setPanelType(null);
    setEntryForm({ stock_item_id: "", quantity: "", unit_cost: "0", entry_date: today(), purchase_order_id: "", notes: "" });
    await loadAll();
  }

  // ── Crear vale de salida ───────────────────────────────────────────────────

  async function saveWithdrawal() {
    if (!withdrawalForm.stock_item_id) { toast.error("Selecciona un material"); return; }
    if (!withdrawalForm.budget_item_id) { toast.error("Partida de control requerida"); return; }
    const qty = parseFloat(withdrawalForm.quantity);
    if (!qty || qty <= 0) { toast.error("Cantidad debe ser mayor a 0"); return; }

    // Verificar stock disponible
    const level = levels.find((l) => l.stock_item_id === withdrawalForm.stock_item_id);
    if (level && qty > level.current_stock) {
      toast.error(`Stock insuficiente. Disponible: ${level.current_stock} ${level.unit}`);
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("stock_withdrawals").insert({
      project_id:      projectId,
      stock_item_id:   withdrawalForm.stock_item_id,
      quantity:        qty,
      budget_item_id:  withdrawalForm.budget_item_id,
      withdrawal_date: withdrawalForm.withdrawal_date,
      delivered_to:    withdrawalForm.delivered_to.trim() || null,
      notes:           withdrawalForm.notes.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Vale de salida registrado");
    setPanelType(null);
    setWithdrawalForm({ stock_item_id: "", quantity: "", budget_item_id: "", withdrawal_date: today(), delivered_to: "", notes: "" });
    await loadAll();
  }

  // ── Eliminar ───────────────────────────────────────────────────────────────

  async function deleteEntry(id: string) {
    if (!confirm("¿Eliminar este ingreso?")) return;
    await supabase.from("stock_entries").delete().eq("id", id);
    toast.success("Ingreso eliminado");
    await loadAll();
  }

  async function deleteWithdrawal(id: string) {
    if (!confirm("¿Eliminar este vale de salida?")) return;
    await supabase.from("stock_withdrawals").delete().eq("id", id);
    toast.success("Vale eliminado");
    await loadAll();
  }

  // ── Open panel helpers ─────────────────────────────────────────────────────

  function openEntryPanel() {
    setEntryForm({ stock_item_id: "", quantity: "", unit_cost: "0", entry_date: today(), purchase_order_id: "", notes: "" });
    setPanelType("entry");
  }

  function openWithdrawalPanel() {
    setWithdrawalForm({ stock_item_id: "", quantity: "", budget_item_id: "", withdrawal_date: today(), delivered_to: "", notes: "" });
    setPanelType("withdrawal");
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
      <div className={cn("flex flex-1 flex-col overflow-y-auto", panelType && "mr-[480px]")}>

        {/* ── Stats ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4 p-6 pb-4">
          {[
            { label: "Materiales",    value: stats.items,    icon: <Package className="h-4 w-4" />,       color: "text-blue-600 bg-blue-50"   },
            { label: "Stock bajo",    value: stats.lowStock, icon: <AlertTriangle className="h-4 w-4" />, color: stats.lowStock > 0 ? "text-red-600 bg-red-50" : "text-slate-400 bg-slate-50" },
            { label: "Ingresos",      value: stats.entries,  icon: <PackagePlus className="h-4 w-4" />,   color: "text-green-600 bg-green-50" },
            { label: "Vales salida",  value: stats.exits,    icon: <PackageMinus className="h-4 w-4" />,  color: "text-amber-600 bg-amber-50" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className={cn("mb-3 w-fit rounded-lg p-1.5", s.color)}>{s.icon}</div>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-xl font-bold text-slate-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs + acción ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pb-3">
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {(["stock", "ingresos", "salidas"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setSearch(""); }}
                className={cn(
                  "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                  tab === t ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {t === "stock" ? "Stock actual" : t === "ingresos" ? "Ingresos" : "Vales de salida"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 w-44"
              />
            </div>

            {tab === "stock" && (
              <button
                onClick={() => { setItemForm({ name: "", unit: "und", min_stock: "0" }); setPanelType("item"); }}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Plus className="h-4 w-4" /> Material
              </button>
            )}
            {tab === "ingresos" && (
              <button
                onClick={openEntryPanel}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
              >
                <PackagePlus className="h-4 w-4" /> Registrar ingreso
              </button>
            )}
            {tab === "salidas" && (
              <button
                onClick={openWithdrawalPanel}
                className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
              >
                <PackageMinus className="h-4 w-4" /> Emitir vale
              </button>
            )}
          </div>
        </div>

        {/* ── Tab: Stock actual ──────────────────────────────────────────────── */}
        {tab === "stock" && (
          <div className="px-6 pb-6">
            {filteredLevels.length === 0 ? (
              <EmptyState
                icon={<Package className="h-8 w-8 text-slate-300" />}
                title={search ? "Sin resultados" : "Sin materiales registrados"}
                sub={search ? "Prueba con otro término" : 'Agrega materiales con el botón "Material"'}
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Material</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Unidad</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Entradas</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Salidas</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Stock actual</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">PPP</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Valorizado</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Mín.</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLevels.map((l) => (
                      <tr key={l.stock_item_id} className={cn("transition-colors hover:bg-slate-50", l.low_stock && "bg-red-50/30")}>
                        <td className="px-4 py-3 font-medium text-slate-900">{l.name}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{l.unit}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-green-700 font-medium">+{fmt(l.total_in)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-red-600 font-medium">−{fmt(l.total_out)}</td>
                        <td className={cn(
                          "px-4 py-3 text-right font-bold tabular-nums",
                          l.low_stock ? "text-red-700" : "text-slate-900"
                        )}>
                          {fmt(l.current_stock)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600">{sym} {fmt(l.ppp_unit_cost)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-blue-700">{sym} {fmt(l.stock_value)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-400">{fmt(l.min_stock)}</td>
                        <td className="px-4 py-3 text-center">
                          {l.low_stock ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                              <AlertTriangle className="h-3 w-3" /> Stock bajo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              <CheckCircle2 className="h-3 w-3" /> OK
                            </span>
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

        {/* ── Tab: Ingresos ──────────────────────────────────────────────────── */}
        {tab === "ingresos" && (
          <div className="px-6 pb-6">
            {filteredEntries.length === 0 ? (
              <EmptyState
                icon={<PackagePlus className="h-8 w-8 text-slate-300" />}
                title={search ? "Sin resultados" : "Sin ingresos registrados"}
                sub={search ? "Prueba con otro término" : 'Registra el primer ingreso con "Registrar ingreso"'}
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Material</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Cantidad</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Costo unit.</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">OC</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Notas</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEntries.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-500 tabular-nums">{fmtDate(e.entry_date)}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {e.stock_items?.name}
                          <span className="ml-1 text-xs text-slate-400">{e.stock_items?.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-green-700 font-semibold">+{fmt(e.quantity)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600">{sym} {fmt(e.unit_cost)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-800">{sym} {fmt(e.quantity * e.unit_cost)}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                          {e.purchase_orders?.po_number ?? <span className="italic text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs max-w-[140px] truncate">{e.notes ?? "—"}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => deleteEntry(e.id)} className="rounded p-1 text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Vales de salida ───────────────────────────────────────────── */}
        {tab === "salidas" && (
          <div className="px-6 pb-6">
            {filteredWithdrawals.length === 0 ? (
              <EmptyState
                icon={<PackageMinus className="h-8 w-8 text-slate-300" />}
                title={search ? "Sin resultados" : "Sin vales emitidos"}
                sub={search ? "Prueba con otro término" : 'Emite el primer vale con "Emitir vale"'}
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Material</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Cantidad</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Costo Unit.</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Partida de control</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Entregado a</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Notas</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredWithdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-500 tabular-nums">{fmtDate(w.withdrawal_date)}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {w.stock_items?.name}
                          <span className="ml-1 text-xs text-slate-400">{w.stock_items?.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-red-600 font-semibold">−{fmt(w.quantity)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-600">{sym} {fmt(w.unit_cost)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-800">{sym} {fmt(w.total_cost)}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-slate-500">{w.budget_items?.item_code}</span>
                          <span className="ml-1.5 text-slate-600 text-xs">{w.budget_items?.description}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{w.delivered_to ?? <span className="italic text-slate-300">—</span>}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs max-w-[120px] truncate">{w.notes ?? "—"}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => deleteWithdrawal(w.id)} className="rounded p-1 text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Panel: Nuevo material ──────────────────────────────────────────────── */}
      {panelType === "item" && (
        <SidePanel
          title="Nuevo material"
          onClose={() => setPanelType(null)}
          onSave={saveItem}
          saving={saving}
          saveLabel="Registrar material"
        >
          <Fld label="Nombre *">
            <input
              value={itemForm.name}
              onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))}
              className={inp()}
              placeholder="Cemento Portland, Arena gruesa..."
              autoFocus
            />
          </Fld>
          <div className="grid grid-cols-2 gap-4">
            <Fld label="Unidad">
              <input
                value={itemForm.unit}
                onChange={(e) => setItemForm((p) => ({ ...p, unit: e.target.value }))}
                className={inp()}
                placeholder="bol, m³, kg..."
              />
            </Fld>
            <Fld label="Stock mínimo">
              <input
                type="number" min={0} step={0.01}
                value={itemForm.min_stock}
                onChange={(e) => setItemForm((p) => ({ ...p, min_stock: e.target.value }))}
                className={inp()}
              />
            </Fld>
          </div>
          <p className="text-xs text-slate-400">
            El stock mínimo activa la alerta de "Stock bajo" en el panel de stock actual.
          </p>
        </SidePanel>
      )}

      {/* ── Panel: Nuevo ingreso ───────────────────────────────────────────────── */}
      {panelType === "entry" && (
        <SidePanel
          title="Registrar ingreso"
          onClose={() => setPanelType(null)}
          onSave={saveEntry}
          saving={saving}
          saveLabel="Registrar ingreso"
          saveColor="bg-green-600 hover:bg-green-700"
        >
          <Fld label="Material *">
            <select
              value={entryForm.stock_item_id}
              onChange={(e) => setEntryForm((p) => ({ ...p, stock_item_id: e.target.value }))}
              className={inp()}
            >
              <option value="">— Seleccionar material —</option>
              {stockItems.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>
              ))}
            </select>
            {stockItems.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">Sin materiales registrados. Ve a "Stock actual" y agrega primero.</p>
            )}
          </Fld>
          <div className="grid grid-cols-2 gap-4">
            <Fld label="Cantidad *">
              <input
                type="number" min={0} step={0.001}
                value={entryForm.quantity}
                onChange={(e) => setEntryForm((p) => ({ ...p, quantity: e.target.value }))}
                className={inp()}
                placeholder="0"
              />
            </Fld>
            <Fld label={`Costo unitario (${sym})`}>
              <input
                type="number" min={0} step={0.01}
                value={entryForm.unit_cost}
                onChange={(e) => setEntryForm((p) => ({ ...p, unit_cost: e.target.value }))}
                className={inp()}
              />
            </Fld>
          </div>
          <Fld label="Fecha de ingreso">
            <input
              type="date"
              value={entryForm.entry_date}
              onChange={(e) => setEntryForm((p) => ({ ...p, entry_date: e.target.value }))}
              className={inp()}
            />
          </Fld>
          <Fld label="Orden de Compra (opcional)">
            <select
              value={entryForm.purchase_order_id}
              onChange={(e) => setEntryForm((p) => ({ ...p, purchase_order_id: e.target.value }))}
              className={inp()}
            >
              <option value="">— Sin OC asociada —</option>
              {purchaseOrders.map((po) => (
                <option key={po.id} value={po.id}>{po.po_number}</option>
              ))}
            </select>
          </Fld>
          <Fld label="Notas">
            <textarea
              value={entryForm.notes}
              onChange={(e) => setEntryForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
              className={inp() + " resize-none"}
              placeholder="Guía de remisión, condiciones..."
            />
          </Fld>
        </SidePanel>
      )}

      {/* ── Panel: Vale de salida ──────────────────────────────────────────────── */}
      {panelType === "withdrawal" && (
        <SidePanel
          title="Emitir vale de salida"
          onClose={() => setPanelType(null)}
          onSave={saveWithdrawal}
          saving={saving}
          saveLabel="Emitir vale"
          saveColor="bg-amber-600 hover:bg-amber-700"
        >
          <Fld label="Material *">
            <select
              value={withdrawalForm.stock_item_id}
              onChange={(e) => setWithdrawalForm((p) => ({ ...p, stock_item_id: e.target.value }))}
              className={inp()}
            >
              <option value="">— Seleccionar material —</option>
              {levels.filter((l) => l.current_stock > 0).map((l) => (
                <option key={l.stock_item_id} value={l.stock_item_id}>
                  {l.name} — stock: {fmt(l.current_stock)} {l.unit}
                </option>
              ))}
            </select>
          </Fld>
          <Fld label="Cantidad *">
            <input
              type="number" min={0} step={0.001}
              value={withdrawalForm.quantity}
              onChange={(e) => setWithdrawalForm((p) => ({ ...p, quantity: e.target.value }))}
              className={inp()}
              placeholder="0"
            />
            {withdrawalForm.stock_item_id && (() => {
              const level = levels.find((l) => l.stock_item_id === withdrawalForm.stock_item_id);
              return level ? (
                <p className="mt-1 text-xs text-slate-400">
                  Disponible: <strong>{fmt(level.current_stock)} {level.unit}</strong>
                </p>
              ) : null;
            })()}
          </Fld>
          <Fld label="Partida de control *">
            <select
              value={withdrawalForm.budget_item_id}
              onChange={(e) => setWithdrawalForm((p) => ({ ...p, budget_item_id: e.target.value }))}
              className={inp()}
            >
              <option value="">— Seleccionar partida —</option>
              {budgetItems.map((b) => (
                <option key={b.id} value={b.id}>{b.item_code} — {b.description}</option>
              ))}
            </select>
            {budgetItems.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">Sin partidas. Ve al módulo Presupuesto y agrega partidas primero.</p>
            )}
          </Fld>
          <Fld label="Fecha de salida">
            <input
              type="date"
              value={withdrawalForm.withdrawal_date}
              onChange={(e) => setWithdrawalForm((p) => ({ ...p, withdrawal_date: e.target.value }))}
              className={inp()}
            />
          </Fld>
          <Fld label="Entregado a">
            <input
              value={withdrawalForm.delivered_to}
              onChange={(e) => setWithdrawalForm((p) => ({ ...p, delivered_to: e.target.value }))}
              className={inp()}
              placeholder="Nombre del obrero o cuadrilla"
            />
          </Fld>
          <Fld label="Notas">
            <textarea
              value={withdrawalForm.notes}
              onChange={(e) => setWithdrawalForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
              className={inp() + " resize-none"}
              placeholder="Frente de trabajo, observaciones..."
            />
          </Fld>
        </SidePanel>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().split("T")[0];
}

function fmt(n: number) {
  return n.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

function inp() {
  return "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition-colors bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
      <div className="mb-3">{icon}</div>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function SidePanel({
  title, onClose, onSave, saving, saveLabel, saveColor = "bg-blue-600 hover:bg-blue-700", children,
}: {
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  saveLabel: string;
  saveColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed right-0 top-0 z-40 flex h-screen w-[480px] flex-col border-l border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">{children}</div>
      <div className="border-t border-slate-200 px-6 py-4 flex gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-60 transition-colors",
            saveColor
          )}
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {saveLabel}
        </button>
        <button
          onClick={onClose}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
