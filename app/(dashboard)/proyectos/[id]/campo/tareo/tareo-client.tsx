"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Save, CheckCircle2, User, Clock, AlertTriangle } from "lucide-react";

interface Worker {
  id: string;
  full_name: string;
  category: string;
}

interface BudgetItem {
  id: string;
  item_code: string;
  description: string;
}

interface Props {
  projectId: string;
  workers: Worker[];
  budgetItems: BudgetItem[];
}

export function TareoClient({ projectId, workers, budgetItems }: Props) {
  const supabase = createClient();
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [tareoId, setTareoId] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "approved">("draft");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estado local de asistencia: workerId -> detail
  const [entries, setEntries] = useState<Record<string, any>>({});

  useEffect(() => {
    loadTareo(date);
  }, [date]);

  async function loadTareo(targetDate: string) {
    setLoading(true);
    // Buscar si existe un tareo para esta fecha
    const { data: tareo } = await supabase
      .from("tareos")
      .select("id, status")
      .eq("project_id", projectId)
      .eq("date", targetDate)
      .single();

    if (tareo) {
      setTareoId(tareo.id);
      setStatus(tareo.status as any);

      // Cargar entries
      const { data: dbEntries } = await supabase
        .from("tareo_entries")
        .select("*")
        .eq("tareo_id", tareo.id);
      
      const newEntries: Record<string, any> = {};
      dbEntries?.forEach(e => {
        newEntries[e.worker_id] = {
          status: e.status,
          hours_worked: e.hours_worked,
          overtime_hours: e.overtime_hours,
          budget_item_id: e.budget_item_id || ""
        };
      });
      // Llenar vacíos
      workers.forEach(w => {
        if (!newEntries[w.id]) {
          newEntries[w.id] = { status: "present", hours_worked: 8, overtime_hours: 0, budget_item_id: "" };
        }
      });
      setEntries(newEntries);
    } else {
      setTareoId(null);
      setStatus("draft");
      // Inicializar todo por defecto
      const newEntries: Record<string, any> = {};
      workers.forEach(w => {
        newEntries[w.id] = { status: "present", hours_worked: 8, overtime_hours: 0, budget_item_id: "" };
      });
      setEntries(newEntries);
    }
    setLoading(false);
  }

  async function saveTareo(newStatus: "draft" | "approved") {
    setSaving(true);
    try {
      let currentTareoId = tareoId;

      if (!currentTareoId) {
        // Crear cabecera
        const { data: newTareo, error: tareoErr } = await supabase
          .from("tareos")
          .insert({
            project_id: projectId,
            date,
            status: newStatus
          })
          .select("id")
          .single();
        if (tareoErr) throw new Error(tareoErr.message);
        currentTareoId = newTareo.id;
        setTareoId(currentTareoId);
      } else {
        // Update cabecera
        const { error: updErr } = await supabase
          .from("tareos")
          .update({ status: newStatus })
          .eq("id", currentTareoId);
        if (updErr) throw new Error(updErr.message);
      }

      // Upsert de entries
      const rows = workers.map(w => ({
        tareo_id: currentTareoId,
        worker_id: w.id,
        status: entries[w.id].status,
        hours_worked: entries[w.id].status === 'present' ? Number(entries[w.id].hours_worked) : 0,
        overtime_hours: entries[w.id].status === 'present' ? Number(entries[w.id].overtime_hours) : 0,
        budget_item_id: entries[w.id].budget_item_id || null
      }));

      // Primero borrar las existentes para evitar duplicados en vez de hacer un upsert complejo
      await supabase.from("tareo_entries").delete().eq("tareo_id", currentTareoId);
      
      const { error: insertErr } = await supabase.from("tareo_entries").insert(rows);
      if (insertErr) throw new Error(insertErr.message);

      setStatus(newStatus);
      toast.success(newStatus === "approved" ? "Tareo aprobado exitosamente" : "Borrador guardado");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  const updateEntry = (workerId: string, field: string, value: any) => {
    setEntries(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        [field]: value
      }
    }));
  };

  const isReadOnly = status === "approved";

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Tareo Diario</h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro de asistencia y asignación de horas a partidas.
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
          {status === "draft" && tareoId && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 text-sm font-medium rounded-lg">
              <AlertTriangle className="h-4 w-4" /> Borrador
            </span>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Obrero</th>
                <th className="px-4 py-3">Asistencia</th>
                <th className="px-4 py-3">Partida (Asignación)</th>
                <th className="px-4 py-3 w-28">Horas Normales</th>
                <th className="px-4 py-3 w-28">Horas Extra</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No hay obreros activos en la nómina.
                  </td>
                </tr>
              )}
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">Cargando tareo...</td>
                </tr>
              ) : (
                workers.map((w) => {
                  const entry = entries[w.id] || {};
                  const isAbsent = entry.status !== 'present';
                  return (
                    <tr key={w.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{w.full_name}</div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider">{w.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          disabled={isReadOnly}
                          value={entry.status}
                          onChange={(e) => updateEntry(w.id, "status", e.target.value)}
                          className="w-full text-sm border-slate-200 rounded-lg bg-slate-50"
                        >
                          <option value="present">Presente</option>
                          <option value="absent">Falta</option>
                          <option value="medical">Descanso Médico</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          disabled={isReadOnly || isAbsent}
                          value={entry.budget_item_id}
                          onChange={(e) => updateEntry(w.id, "budget_item_id", e.target.value)}
                          className="w-full text-sm border-slate-200 rounded-lg max-w-[200px]"
                        >
                          <option value="">-- Sin partida --</option>
                          {budgetItems.map(bi => (
                            <option key={bi.id} value={bi.id} className="truncate">
                              {bi.item_code} - {bi.description}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          disabled={isReadOnly || isAbsent}
                          value={isAbsent ? 0 : entry.hours_worked}
                          onChange={(e) => updateEntry(w.id, "hours_worked", e.target.value)}
                          className="w-full text-sm border-slate-200 rounded-lg"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          disabled={isReadOnly || isAbsent}
                          value={isAbsent ? 0 : entry.overtime_hours}
                          onChange={(e) => updateEntry(w.id, "overtime_hours", e.target.value)}
                          className="w-full text-sm border-slate-200 rounded-lg"
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      {!isReadOnly && !loading && (
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={() => saveTareo("draft")}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Guardar Borrador
          </button>
          <button
            onClick={() => {
              if(confirm("¿Estás seguro de aprobar este tareo? Ya no podrá ser modificado.")) {
                saveTareo("approved");
              }
            }}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            Aprobar Tareo
          </button>
        </div>
      )}
    </div>
  );
}
