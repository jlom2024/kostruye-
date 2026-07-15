"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Save, CheckCircle2, AlertTriangle, Plus, Trash2, Search } from "lucide-react";

interface BudgetItem {
  id: string;
  item_code: string;
  description: string;
  unit: string;
  quantity: number;
}

interface Props {
  projectId: string;
  budgetItems: BudgetItem[];
}

export function AvanceClient({ projectId, budgetItems }: Props) {
  const supabase = createClient();
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [logId, setLogId] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "approved">("draft");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estado local del avance: budget_item_id -> executed_quantity
  const [entries, setEntries] = useState<Record<string, number>>({});
  
  // Partidas seleccionadas para mostrar en la tabla (para no mostrar todo el presupuesto)
  const [selectedItems, setSelectedItems] = useState<BudgetItem[]>([]);
  
  // Buscador
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadLog(date);
  }, [date]);

  async function loadLog(targetDate: string) {
    setLoading(true);
    const { data: log } = await (supabase.from("daily_progress_logs") as any)
      .select("id, status")
      .eq("project_id", projectId)
      .eq("date", targetDate)
      .single();

    if (log) {
      setLogId(log.id);
      setStatus(log.status as any);

      const { data: dbEntries } = await (supabase.from("daily_progress_entries") as any)
        .select("*")
        .eq("log_id", log.id);
      
      const newEntries: Record<string, number> = {};
      const newSelectedIds = new Set<string>();
      
      dbEntries?.forEach((e: any) => {
        newEntries[e.budget_item_id] = e.executed_quantity;
        newSelectedIds.add(e.budget_item_id);
      });
      
      setEntries(newEntries);
      setSelectedItems(budgetItems.filter(b => newSelectedIds.has(b.id)));
    } else {
      setLogId(null);
      setStatus("draft");
      setEntries({});
      setSelectedItems([]);
    }
    setLoading(false);
  }

  async function saveLog(newStatus: "draft" | "approved") {
    if (selectedItems.length === 0) {
      toast.error("Agrega al menos una partida para reportar avance.");
      return;
    }

    setSaving(true);
    try {
      let currentLogId = logId;

      if (!currentLogId) {
        const { data: newLog, error: logErr } = await (supabase.from("daily_progress_logs") as any)
          .insert({
            project_id: projectId,
            date,
            status: newStatus
          })
          .select("id")
          .single();
        if (logErr) throw new Error(logErr.message);
        currentLogId = newLog.id;
        setLogId(currentLogId);
      } else {
        const { error: updErr } = await (supabase.from("daily_progress_logs") as any)
          .update({ status: newStatus })
          .eq("id", currentLogId);
        if (updErr) throw new Error(updErr.message);
      }

      const rows = selectedItems.map(item => ({
        log_id: currentLogId,
        budget_item_id: item.id,
        executed_quantity: Number(entries[item.id]) || 0
      }));

      await (supabase.from("daily_progress_entries") as any).delete().eq("log_id", currentLogId);
      
      const { error: insertErr } = await (supabase.from("daily_progress_entries") as any).insert(rows);
      if (insertErr) throw new Error(insertErr.message);

      setStatus(newStatus);
      toast.success(newStatus === "approved" ? "Avance aprobado" : "Borrador guardado");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  const updateEntry = (itemId: string, value: any) => {
    setEntries(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const addItem = (item: BudgetItem) => {
    if (!selectedItems.find(i => i.id === item.id)) {
      setSelectedItems(prev => [...prev, item]);
      updateEntry(item.id, 0);
    }
    setSearchTerm("");
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(i => i.id !== itemId));
    const newEntries = { ...entries };
    delete newEntries[itemId];
    setEntries(newEntries);
  };

  const isReadOnly = status === "approved";
  const searchResults = searchTerm.length > 1 
    ? budgetItems.filter(b => 
        (b.item_code.toLowerCase().includes(searchTerm.toLowerCase()) || 
         b.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
        !selectedItems.find(s => s.id === b.id)
      ).slice(0, 5) // limitar a 5 resultados
    : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Parte Diario de Producción</h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro del metrado físico ejecutado en el día.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border-slate-300 rounded-lg text-sm"
          />
          {status === "approved" && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-lg">
              <CheckCircle2 className="h-4 w-4" /> Aprobado
            </span>
          )}
          {status === "draft" && logId && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 text-sm font-medium rounded-lg">
              <AlertTriangle className="h-4 w-4" /> Borrador
            </span>
          )}
        </div>
      </div>

      {!isReadOnly && !loading && (
        <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar partida por código o descripción para reportar avance..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-slate-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="absolute z-10 left-4 right-4 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
              {searchResults.map(item => (
                <button
                  key={item.id}
                  onClick={() => addItem(item)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 last:border-0"
                >
                  <div>
                    <div className="font-medium text-slate-900">{item.description}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{item.item_code}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      Meta: {item.quantity} {item.unit}
                    </span>
                    <Plus className="h-4 w-4 text-blue-600" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Partida</th>
                <th className="px-4 py-3 w-28 text-center">Unidad</th>
                <th className="px-4 py-3 w-40 text-right">Metrado Teórico (Meta)</th>
                <th className="px-4 py-3 w-48 text-right">Avance Diario</th>
                {!isReadOnly && <th className="px-4 py-3 w-16"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {selectedItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500">
                    <AlertTriangle className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                    Aún no has agregado partidas a este reporte diario.<br/>Usa el buscador de arriba para agregar las partidas trabajadas hoy.
                  </td>
                </tr>
              )}
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">Cargando reporte...</td>
                </tr>
              ) : (
                selectedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.description}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{item.item_code}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium uppercase">{item.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number" step="0.01" min="0" disabled={isReadOnly}
                        value={entries[item.id] === undefined ? "" : entries[item.id]}
                        onChange={(e) => updateEntry(item.id, e.target.value)}
                        className="w-full text-sm border-blue-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg text-right"
                        placeholder="0.00"
                      />
                    </td>
                    {!isReadOnly && (
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => removeItem(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!isReadOnly && !loading && selectedItems.length > 0 && (
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={() => saveLog("draft")}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Guardar Borrador
          </button>
          <button
            onClick={() => {
              if(confirm("¿Estás seguro de aprobar el avance? Se actualizarán las métricas de productividad.")) {
                saveLog("approved");
              }
            }}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            Aprobar Avance
          </button>
        </div>
      )}
    </div>
  );
}
