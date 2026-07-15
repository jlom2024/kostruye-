"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, Search, FileText } from "lucide-react";
import { toast } from "sonner";

interface ChangeOrder {
  id: string;
  code: string;
  title: string;
  status: string;
  type: string;
  approved_date: string | null;
  notes: string | null;
  created_at: string;
}

interface Props {
  projectId: string;
  initialOrders: ChangeOrder[];
}

export function AdicionalesClient({ projectId, initialOrders }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Adicional");
  const [status, setStatus] = useState("Borrador");
  const [approvedDate, setApprovedDate] = useState("");
  const [notes, setNotes] = useState("");

  const filtered = initialOrders.filter((o) => 
    o.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !title) return;

    setIsSubmitting(true);
    const { error } = await supabase.from("change_orders").insert({
      project_id: projectId,
      code,
      title,
      type,
      status,
      approved_date: status === 'Aprobado' && approvedDate ? approvedDate : null,
      notes
    });

    setIsSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        toast.error("Ya existe una orden con ese código.");
      } else {
        toast.error("Error al crear: " + error.message);
      }
    } else {
      toast.success("Orden de cambio registrada");
      setIsAddOpen(false);
      setCode("");
      setTitle("");
      setNotes("");
      router.refresh();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aprobado': 
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Aprobado</span>;
      case 'Rechazado': 
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Rechazado</span>;
      default: 
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Borrador</span>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'Adicional': 
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Adicional</span>;
      case 'Deductivo': 
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">Deductivo</span>;
      default: 
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">Ampliación Plazo</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            placeholder="Buscar por código o título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 w-full text-sm border-slate-300 rounded-lg"
          />
        </div>

        <button 
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nueva Orden de Cambio
        </button>
      </div>

      <div className="overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Aprobado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-slate-400 py-10">
                  No hay órdenes de cambio registradas.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{item.code}</td>
                  <td className="px-4 py-3 font-medium">{item.title}</td>
                  <td className="px-4 py-3">{getTypeBadge(item.type)}</td>
                  <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {item.approved_date ? new Date(item.approved_date).toLocaleDateString("es-PE") : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
                      <FileText className="h-3.5 w-3.5" /> Detalles
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL NUEVA ORDEN DE CAMBIO */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-slate-900 text-base">Registrar Control de Cambio</h3>
                <p className="text-xs text-slate-500 mt-1">Ingresa los datos generales del adicional, deductivo o ampliación.</p>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600 uppercase">Tipo</label>
                  <select 
                    value={type} 
                    onChange={(e) => setType(e.target.value)}
                    className="w-full text-sm border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Adicional">Presupuesto Adicional</option>
                    <option value="Deductivo">Presupuesto Deductivo</option>
                    <option value="Ampliación Plazo">Ampliación de Plazo</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600 uppercase">Código (Ej: AD-01)</label>
                  <input 
                    placeholder="Código de Referencia" 
                    value={code} 
                    onChange={(e) => setCode(e.target.value)} 
                    required 
                    className="w-full text-sm border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase">Título Breve</label>
                <input 
                  placeholder="Ej: Adicional por mayor metrado en cimentación" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  required 
                  className="w-full text-sm border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600 uppercase">Estado</label>
                  <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full text-sm border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Borrador">En Trámite / Borrador</option>
                    <option value="Aprobado">Aprobado</option>
                    <option value="Rechazado">Rechazado</option>
                  </select>
                </div>
                {status === 'Aprobado' && (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600 uppercase">Fecha de Aprobación</label>
                    <input 
                      type="date" 
                      value={approvedDate} 
                      onChange={(e) => setApprovedDate(e.target.value)} 
                      required 
                      className="w-full text-sm border-slate-300 rounded-lg"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase">Notas Adicionales / Resolución</label>
                <textarea 
                  placeholder="Referencia a la Resolución o Acta de Acuerdo..." 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  rows={3}
                  className="w-full text-sm border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Guardando..." : "Guardar Orden"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
