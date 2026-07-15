"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Truck } from "lucide-react";

interface Equipment {
  id: string;
  project_id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  hourly_cost: number;
}

interface Props {
  projectId: string;
  initialEquipments: Equipment[];
}

export function EquiposClient({ projectId, initialEquipments }: Props) {
  const supabase = createClient();
  const [equipments, setEquipments] = useState<Equipment[]>(initialEquipments);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "propio",
    status: "activo",
    hourly_cost: 0
  });

  const openNew = () => {
    setEditingItem(null);
    setFormData({ code: "", name: "", type: "propio", status: "activo", hourly_cost: 0 });
    setIsModalOpen(true);
  };

  const openEdit = (eq: Equipment) => {
    setEditingItem(eq);
    setFormData({
      code: eq.code,
      name: eq.name,
      type: eq.type,
      status: eq.status,
      hourly_cost: eq.hourly_cost
    });
    setIsModalOpen(true);
  };

  const saveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingItem) {
        const { data, error } = await (supabase
          .from("equipments") as any)
          .update({
            code: formData.code,
            name: formData.name,
            type: formData.type,
            status: formData.status,
            hourly_cost: formData.hourly_cost
          })
          .eq("id", editingItem.id)
          .select()
          .single();
        if (error) throw error;
        setEquipments(prev => prev.map((p: any) => p.id === editingItem.id ? data : p));
        toast.success("Equipo actualizado");
      } else {
        const { data, error } = await (supabase
          .from("equipments") as any)
          .insert({
            project_id: projectId,
            code: formData.code,
            name: formData.name,
            type: formData.type,
            status: formData.status,
            hourly_cost: formData.hourly_cost
          })
          .select()
          .single();
        if (error) throw error;
        setEquipments([data, ...equipments]);
        toast.success("Equipo creado");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Error al guardar el equipo");
    } finally {
      setSaving(false);
    }
  };

  const deleteEquipment = async (id: string) => {
    if (!confirm("¿Eliminar este equipo? Se borrará su historial (parte diario).")) return;
    try {
      const { error } = await (supabase.from("equipments") as any).delete().eq("id", id);
      if (error) throw error;
      setEquipments(prev => prev.filter((p: any) => p.id !== id));
      toast.success("Equipo eliminado");
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Equipos y Maquinaria</h1>
          <p className="text-sm text-slate-500 mt-1">
            Catálogo de maquinaria asignada a la obra
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Registrar Equipo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {equipments.map(eq => (
          <div key={eq.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative group">
            <div className="flex justify-between items-start mb-3">
              <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <Truck className="h-5 w-5" />
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(eq)} className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => deleteEquipment(eq.id)} className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            
            <h3 className="font-semibold text-slate-900 mb-1">{eq.name}</h3>
            <p className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded w-fit mb-4">{eq.code}</p>
            
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm mt-auto pt-4 border-t border-slate-100">
              <div>
                <span className="text-slate-500 text-xs block">Tipo</span>
                <span className="font-medium text-slate-700 capitalize">{eq.type}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block">Estado</span>
                <span className="font-medium text-slate-700 capitalize">{eq.status}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block">Costo Hora</span>
                <span className="font-medium text-slate-700">${eq.hourly_cost}</span>
              </div>
            </div>
          </div>
        ))}
        {equipments.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
            <Truck className="h-8 w-8 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-slate-900">Sin equipos</h3>
            <p className="text-xs text-slate-500 mt-1">Registra la maquinaria que operará en este proyecto.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold">{editingItem ? "Editar Equipo" : "Nuevo Equipo"}</h2>
            </div>
            <form onSubmit={saveEquipment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Código / Placa</label>
                <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full rounded-lg border-slate-300 text-sm" placeholder="Ej. EXC-01" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre / Descripción</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full rounded-lg border-slate-300 text-sm" placeholder="Excavadora CAT 320" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full rounded-lg border-slate-300 text-sm">
                    <option value="propio">Propio</option>
                    <option value="alquilado">Alquilado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full rounded-lg border-slate-300 text-sm">
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="mantenimiento">Mantenimiento</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Costo por Hora (Referencial)</label>
                <input required type="number" step="0.01" min="0" value={formData.hourly_cost} onChange={e => setFormData({...formData, hourly_cost: parseFloat(e.target.value) || 0})} className="w-full rounded-lg border-slate-300 text-sm" />
              </div>
              
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">
                  {saving ? "Guardando..." : "Guardar Equipo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
