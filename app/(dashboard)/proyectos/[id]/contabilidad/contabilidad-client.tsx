"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────
type Expense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  supplier: string | null;
  invoice_number: string | null;
  status: "pending" | "paid";
  notes: string | null;
};

type Props = {
  projectId: string;
  currency: string;
  ventaTotal: number;
  metaTotal: number;
  poCommitted: number;
  valorizadoTotal: number;
  costoMateriales: number;
  costoMO: number;
  costoServicios: number;
};

const CATEGORIES = [
  { value: "material",    label: "Materiales",      color: "bg-blue-100 text-blue-700" },
  { value: "labor",       label: "Mano de obra",    color: "bg-violet-100 text-violet-700" },
  { value: "subcontract", label: "Subcontratos",    color: "bg-amber-100 text-amber-700" },
  { value: "equipment",   label: "Equipos",         color: "bg-cyan-100 text-cyan-700" },
  { value: "general",     label: "Gastos generales",color: "bg-slate-100 text-slate-700" },
  { value: "other",       label: "Otros",           color: "bg-pink-100 text-pink-700" },
];

function catLabel(v: string) {
  return CATEGORIES.find(c => c.value === v)?.label ?? v;
}
function catColor(v: string) {
  return CATEGORIES.find(c => c.value === v)?.color ?? "bg-slate-100 text-slate-600";
}

function fmt(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("es-PE", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const inp  = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const sel  = inp;
const area = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none";

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function Kpi({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-xl font-bold ${color ?? "text-slate-800"}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────
export function ContabilidadClient({
  projectId, currency, ventaTotal, metaTotal, poCommitted, valorizadoTotal,
  costoMateriales, costoMO, costoServicios,
}: Props) {
  const qc = useQueryClient();
  const sb = createClient();

  const [tab, setTab]           = useState<"resumen" | "gastos">("resumen");
  const [panelOpen, setPanelOpen] = useState(false);
  const [filterCat, setFilterCat] = useState("all");

  const sym = currency === "USD" ? "$" : "S/";
  const money = (n: number) =>
    `${sym} ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ── Query ──────────────────────────────────────────────────────
  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ["expenses", projectId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("expenses")
        .select("id,category,description,amount,expense_date,supplier,invoice_number,status,notes")
        .eq("project_id", projectId)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Derived ────────────────────────────────────────────────────
  const byCategory = CATEGORIES.map(cat => {
    const catExpenses = expenses.filter(e => e.category === cat.value);
    let total = catExpenses.reduce((s, e) => s + Number(e.amount), 0);
    
    // Add real costs from RO modules
    if (cat.value === "material") total += costoMateriales;
    if (cat.value === "labor") total += costoMO;
    if (cat.value === "subcontract") total += costoServicios;

    return { ...cat, total, count: catExpenses.length };
  });

  const totalExpenses = byCategory.reduce((s, c) => s + c.total, 0);
  const costoTotal = totalExpenses;
  const margen = valorizadoTotal - costoTotal;
  const margenPct = valorizadoTotal > 0 ? Math.round((margen / valorizadoTotal) * 100) : null;

  const filtered = filterCat === "all" ? expenses : expenses.filter(e => e.category === filterCat);

  // ── Mutations ──────────────────────────────────────────────────
  const addExpense = useMutation({
    mutationFn: async (f: Omit<Expense, "id">) => {
      const { error } = await sb.from("expenses").insert({ project_id: projectId, ...f });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", projectId] });
      toast.success("Gasto registrado");
      setPanelOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("expenses").update({ status: "paid" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses", projectId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses", projectId] });
      toast.success("Gasto eliminado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Expense form ────────────────────────────────────────────────
  const ExpenseForm = () => {
    const [cat,     setCat]     = useState("material");
    const [desc,    setDesc]    = useState("");
    const [amount,  setAmount]  = useState("");
    const [date,    setDate]    = useState(new Date().toISOString().slice(0, 10));
    const [supplier,setSupplier]= useState("");
    const [invoice, setInvoice] = useState("");
    const [notes,   setNotes]   = useState("");

    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          addExpense.mutate({
            category: cat,
            description: desc,
            amount: parseFloat(amount),
            expense_date: date,
            supplier: supplier || null,
            invoice_number: invoice || null,
            status: "pending",
            notes: notes || null,
          });
        }}
      >
        <Fld label="Categoría">
          <select className={sel} value={cat} onChange={e => setCat(e.target.value)}>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Fld>
        <Fld label="Descripción">
          <textarea className={area} rows={2} value={desc} onChange={e => setDesc(e.target.value)} required />
        </Fld>
        <Fld label={`Monto (${sym})`}>
          <input type="number" step="0.01" min="0.01" className={inp}
            value={amount} onChange={e => setAmount(e.target.value)} required />
        </Fld>
        <Fld label="Fecha">
          <input type="date" className={inp} value={date} onChange={e => setDate(e.target.value)} required />
        </Fld>
        <Fld label="Proveedor">
          <input className={inp} value={supplier} onChange={e => setSupplier(e.target.value)} />
        </Fld>
        <Fld label="N° Factura / Comprobante">
          <input className={inp} value={invoice} onChange={e => setInvoice(e.target.value)} />
        </Fld>
        <Fld label="Notas">
          <textarea className={area} rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </Fld>
        <button type="submit" disabled={addExpense.isPending}
          className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {addExpense.isPending ? "Guardando..." : "Registrar gasto"}
        </button>
      </form>
    );
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col overflow-auto">

        {/* KPIs */}
        <div className="grid grid-cols-5 gap-4 border-b border-slate-100 bg-slate-50 px-6 py-4">
          <Kpi label="Ingreso contratado" value={money(ventaTotal)} />
          <Kpi label="Costo meta" value={money(metaTotal)} />
          <Kpi
            label="Costo directo total"
            value={money(costoTotal)}
            sub="Suma de MO, Materiales, Servicios y otros gastos"
            color={costoTotal > metaTotal ? "text-red-600" : "text-slate-800"}
          />
          <Kpi
            label="Valorizado aprobado"
            value={money(valorizadoTotal)}
          />
          <Kpi
            label="Margen estimado"
            value={margenPct !== null ? `${margenPct}%` : "—"}
            sub={money(margen)}
            color={margen >= 0 ? "text-emerald-600" : "text-red-600"}
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-6">
          {(["resumen", "gastos"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`py-3 px-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}>
              {t === "resumen" ? "Resumen por categoría" : `Gastos (${expenses.length})`}
            </button>
          ))}
        </div>

        {/* Resumen tab */}
        {tab === "resumen" && (
          <div className="overflow-auto px-6 py-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-2 pr-6 text-xs font-medium text-slate-500">Categoría</th>
                  <th className="py-2 pr-6 text-xs font-medium text-slate-500 text-right">Gastos registrados</th>
                  <th className="py-2 pr-6 text-xs font-medium text-slate-500 text-right">N° registros</th>
                  <th className="py-2 text-xs font-medium text-slate-500 text-right">% del total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byCategory.map(cat => (
                  <tr key={cat.value} className="hover:bg-slate-50">
                    <td className="py-3 pr-6">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cat.color}`}>
                        {cat.label}
                      </span>
                    </td>
                    <td className="py-3 pr-6 text-right font-medium text-slate-800">
                      {money(cat.total)}
                    </td>
                    <td className="py-3 pr-6 text-right text-slate-500">{cat.count}</td>
                    <td className="py-3 text-right text-slate-500">
                      {totalExpenses > 0 ? `${Math.round((cat.total / totalExpenses) * 100)}%` : "—"}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300 font-semibold">
                  <td className="py-3 pr-6 text-slate-800">Total gastos directos</td>
                  <td className="py-3 pr-6 text-right text-slate-800">{money(totalExpenses)}</td>
                  <td className="py-3 pr-6 text-right text-slate-600">{expenses.length}</td>
                  <td className="py-3 text-right text-slate-600">100%</td>
                </tr>
              </tbody>
            </table>

            {/* Estado de resultados simplificado */}
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 max-w-md">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Estado de resultado estimado
              </p>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Ingreso valorizado</span>
                  <span className="font-medium text-slate-800">{money(valorizadoTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">OCs comprometidas</span>
                  <span className="text-red-500">– {money(poCommitted)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Gastos directos</span>
                  <span className="text-red-500">– {money(totalExpenses)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
                  <span className="text-slate-800">Margen bruto estimado</span>
                  <span className={margen >= 0 ? "text-emerald-600" : "text-red-600"}>
                    {money(margen)}
                    {margenPct !== null && ` (${margenPct}%)`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gastos tab */}
        {tab === "gastos" && (
          <div className="flex flex-col flex-1 overflow-auto">
            <div className="flex items-center gap-3 px-6 py-3">
              <select className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 bg-white"
                value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                <option value="all">Todas las categorías</option>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <div className="flex-1" />
              <button onClick={() => setPanelOpen(true)}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                + Gasto
              </button>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center p-6">
                <p className="text-sm text-slate-500">Sin gastos registrados</p>
                <p className="text-xs text-slate-400">Registra los gastos del proyecto para calcular el margen real.</p>
              </div>
            ) : (
              <div className="overflow-auto px-6 pb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="py-2 pr-4 text-xs font-medium text-slate-500">Categoría</th>
                      <th className="py-2 pr-4 text-xs font-medium text-slate-500">Descripción</th>
                      <th className="py-2 pr-4 text-xs font-medium text-slate-500 w-32">Proveedor</th>
                      <th className="py-2 pr-4 text-xs font-medium text-slate-500 w-24">Fecha</th>
                      <th className="py-2 pr-4 text-xs font-medium text-slate-500 w-32 text-right">Monto</th>
                      <th className="py-2 pr-4 text-xs font-medium text-slate-500 w-24">Estado</th>
                      <th className="py-2 text-xs font-medium text-slate-500 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(e => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="py-2 pr-4">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${catColor(e.category)}`}>
                            {catLabel(e.category)}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          <p className="text-slate-800">{e.description}</p>
                          {e.invoice_number && (
                            <p className="text-xs text-slate-400">F: {e.invoice_number}</p>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-slate-500">{e.supplier ?? "—"}</td>
                        <td className="py-2 pr-4 text-slate-500">{fmt(e.expense_date)}</td>
                        <td className="py-2 pr-4 text-right font-medium text-slate-800">{money(e.amount)}</td>
                        <td className="py-2 pr-4">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            e.status === "paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {e.status === "paid" ? "Pagado" : "Pendiente"}
                          </span>
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-1">
                            {e.status === "pending" && (
                              <button onClick={() => markPaid.mutate(e.id)}
                                className="rounded px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50"
                                title="Marcar pagado">✓</button>
                            )}
                            <button
                              onClick={() => { if (confirm("¿Eliminar gasto?")) deleteExpense.mutate(e.id); }}
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
      </div>

      {/* Side panel */}
      {panelOpen && (
        <div className="w-80 flex-shrink-0 border-l border-slate-200 bg-white flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-800">Nuevo gasto</h3>
            <button onClick={() => setPanelOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="flex-1 overflow-auto p-5">
            <ExpenseForm />
          </div>
        </div>
      )}
    </div>
  );
}
