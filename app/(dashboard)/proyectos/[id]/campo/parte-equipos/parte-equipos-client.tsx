"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Save, CheckCircle2, Truck, AlertTriangle } from "lucide-react";

interface Equipment {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface BudgetItem {
  id: string;
  item_code: string;
  description: string;
}

interface Props {
  projectId: string;
  equipments: Equipment[];
  budgetItems: BudgetItem[];
}

export function ParteEquiposClient({ projectId, equipments, budgetItems }: Props) {
  const supabase = createClient();
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [logId, setLogId] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "approved">("draft");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estado local del reporte: equipment_id -> detalle
  const [entries, setEntries] = useState<Record<string, any>>({});

  useEffect(() => {
    loadLog(date);
  }, [date]);

  async function loadLog(targetDate: string) {
    setLoading(true);
    const { data: log } = await (supabase
      .from("equipment_logs") as any)
      .select("id, status")
      .eq("project_id", projectId)
      .eq("date", targetDate)
      .single();

    if (log) {
      setLogId((log as any).id);
      setStatus((log as any).status as any);

      const { data: dbEntries } = await (supabase
        .from("equipment_log_entries") as any)
        .select("*")
        .eq("equipment_log_id", (log as any).id);
      
      const newEntries: Record<string, any> = {};
      dbEntries?.forEach((e: any) => {
        newEntries[e.equipment_id] = {
          worked_hours: e.worked_hours,
          standby_hours: e.standby_hours,
          maintenance_hours: e.maintenance_hours,
          budget_item_id: e.budget_item_id || ""
        };
      });
      
      equipments.forEach(eq => {
        if (!newEntries[eq.id]) {
          newEntries[eq.id] = { worked_hours: 0, standby_hours: 0, maintenance_hours: 0, budget_item_id: "" };
        }
      });
      setEntries(newEntries);
    } else {
      setLogId(null);
      setStatus("draft");
      const newEntries: Record<string, any> = {};
      equipments.forEach(eq => {
        newEntries[eq.id] = { worked_hours: 0, standby_hours: 0, maintenance_hours: 0, budget_item_id: "" };
      });
      setEntries(newEntries);
    }
    setLoading(false);
  }

  async function saveLog(newStatus: "draft" | "approved") {
    setSaving(true);
    try {
      let currentLogId = logId;

      if (!currentLogId) {
        const { data: newLog, error: logErr } = await (supabase
          .from("equipment_logs") as any)
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
        const { error: updErr } = await (supabase
          .from("equipment_logs") as any)
          .update({ status: newStatus })
          .eq("id", currentLogId);
        if (updErr) throw new Error(updErr.message);
      }

      const rows = equipments.map(eq => ({
        equipment_log_id: currentLogId,
        equipment_id: eq.id,
        worked_hours: Number(entries[eq.id].worked_hours) || 0,
        standby_hours: Number(entries[eq.id].standby_hours) || 0,
        maintenance_hours: Number(entries[eq.id].maintenance_hours) || 0,
        budget_item_id: entries[eq.id].budget_item_id || null
      }));

      await (supabase.from("equipment_log_entries") as any).delete().eq("equipment_log_id", currentLogId!);
      
      const { error: insertErr } = await (supabase.from("equipment_log_entries") as any).insert(rows);
      if (insertErr) throw new Error(insertErr.message);

      setStatus(newStatus);
      toast.success(newStatus === "approved" ? "Parte de equipos aprobado" : "Borrador guardado");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  const updateEntry = (eqId: string, field: string, value: any) => {
    setEntries(prev => ({
      ...prev,
      [eqId]: {
        ...prev[eqId],
        [field]: value
      }
    }));
  };

  const isReadOnly = status === "approved";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Parte Diario de Equipos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro de horas productivas, en espera y mantenimientos.
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

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Maquinaria / Equipo</th>
                <th className="px-4 py-3 min-w-[200px]">Partida (Asignación)</th>
                <th className="px-4 py-3 w-32">Hrs Trabajadas</th>
                <th className="px-4 py-3 w-32">Hrs Stand-By</th>
                <th className="px-4 py-3 w-32">Hrs Mantto.</th>
                <th className="px-4 py-3 w-24 font-bold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {equipments.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No hay equipos activos registrados en el catálogo del proyecto.
                  </td>
                </tr>
              )}
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">Cargando reporte...</td>
                </tr>
              ) : (
                equipments.map((eq) => {
                  const entry = entries[eq.id] || {};
                  const total = (Number(entry.worked_hours) || 0) + (Number(entry.standby_hours) || 0) + (Number(entry.maintenance_hours) || 0);
                  
                  return (
                    <tr key={eq.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                            <Truck className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 leading-tight">{eq.name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 rounded">{eq.code}</span>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider">{eq.type}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          disabled={isReadOnly}
                          value={entry.budget_item_id}
                          onChange={(e) => updateEntry(eq.id, "budget_item_id", e.target.value)}
                          className="w-full text-sm border-slate-200 rounded-lg"
                        >
                          <option value="">-- No asignado --</option>
                          {budgetItems.map(bi => (
                            <option key={bi.id} value={bi.id} className="truncate">
                              {bi.item_code} - {bi.description}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number" step="0.5" min="0" disabled={isReadOnly}
                          value={entry.worked_hours}
                          onChange={(e) => updateEntry(eq.id, "worked_hours", e.target.value)}
                          className="w-full text-sm border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number" step="0.5" min="0" disabled={isReadOnly}
                          value={entry.standby_hours}
                          onChange={(e) => updateEntry(eq.id, "standby_hours", e.target.value)}
                          className="w-full text-sm border-amber-200 focus:border-amber-500 focus:ring-amber-500 rounded-lg"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number" step="0.5" min="0" disabled={isReadOnly}
                          value={entry.maintenance_hours}
                          onChange={(e) => updateEntry(eq.id, "maintenance_hours", e.target.value)}
                          className="w-full text-sm border-rose-200 focus:border-rose-500 focus:ring-rose-500 rounded-lg"
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {total.toFixed(1)} h
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!isReadOnly && !loading && (
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
              if(confirm("¿Estás seguro de aprobar el parte? Se congelarán las horas registradas.")) {
                saveLog("approved");
              }
            }}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            Aprobar Parte
          </button>
        </div>
      )}
    </div>
  );
}
