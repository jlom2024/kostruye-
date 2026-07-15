"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Eye } from "lucide-react";
import { toast } from "sonner";

interface Formula {
  id: string;
  name: string;
}

interface Valorizacion {
  id: string;
  val_number: number;
  period_name: string;
  start_date: string;
  end_date: string;
  status: string;
  total_amount: number;
  factor_k: number;
  monto_reajuste: number;
  created_at: string;
  reajuste_formulas?: {
    name: string;
  };
}

interface Props {
  projectId: string;
  initialData: Valorizacion[];
  formulas: Formula[];
}

export function ValorizacionesClient({ projectId, initialData, formulas }: Props) {
  const supabase = createClient();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [periodName, setPeriodName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [formulaId, setFormulaId] = useState("");

  const filtered = initialData.filter((v) => 
    v.period_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.val_number.toString().includes(searchTerm)
  );

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodName || !startDate || !endDate) return;

    setIsSubmitting(true);
    
    // Llamar a la función RPC de Supabase (Postgres Stored Procedure)
    const { data: newId, error } = await supabase.rpc('fn_generate_valorization', {
      p_project_id: projectId,
      p_period_name: periodName,
      p_start_date: startDate,
      p_end_date: endDate,
      p_formula_id: formulaId || null
    });

    setIsSubmitting(false);

    if (error) {
      toast.error("Error al generar valorización: " + error.message);
    } else {
      toast.success("Valorización generada exitosamente");
      setIsAddOpen(false);
      setPeriodName("");
      setStartDate("");
      setEndDate("");
      setFormulaId("");
      router.refresh();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': 
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Aprobado</span>;
      case 'submitted': 
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Enviado</span>;
      case 'cancelled': 
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Anulado</span>;
      default: 
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Borrador</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            placeholder="Buscar por periodo o N°..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 w-full text-sm border-slate-300 rounded-lg"
          />
        </div>

        <button 
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Generar Valorización
        </button>
      </div>

      <div className="overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-center w-16">Val. N°</th>
              <th className="px-4 py-3">Período</th>
              <th className="px-4 py-3 w-28">Estado</th>
              <th className="px-4 py-3 text-right">Avance Mes (S/)</th>
              <th className="px-4 py-3 text-right">Factor K</th>
              <th className="px-4 py-3 text-right">Reajuste (S/)</th>
              <th className="px-4 py-3 text-right font-bold">Total (S/)</th>
              <th className="px-4 py-3 w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-slate-400 py-10">
                  No se encontraron valorizaciones.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-center text-slate-900">{item.val_number}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-900">{item.period_name}</span>
                    <div className="text-xs text-slate-450 mt-0.5">
                      {new Date(item.start_date).toLocaleDateString("es-PE")} - {new Date(item.end_date).toLocaleDateString("es-PE")}
                    </div>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                  <td className="px-4 py-3 text-right font-semibold">S/ {Number(item.total_amount).toLocaleString('es-PE', {minimumFractionDigits: 2})}</td>
                  <td className="px-4 py-3 text-right text-slate-500 font-medium">
                    {item.factor_k ? Number(item.factor_k).toFixed(4) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-orange-600 font-semibold">
                    S/ {Number(item.monto_reajuste).toLocaleString('es-PE', {minimumFractionDigits: 2})}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-blue-600">
                    S/ {(Number(item.total_amount) + Number(item.monto_reajuste)).toLocaleString('es-PE', {minimumFractionDigits: 2})}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link 
                      href={`/proyectos/${projectId}/valorizaciones/${item.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" /> Ver Detalle
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL GENERAR VALORIZACIÓN */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-slate-900 text-base">Generar Valorización de Obra</h3>
                <p className="text-xs text-slate-500 mt-1">El sistema calculará automáticamente el avance físico y el reajuste del periodo.</p>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            <form onSubmit={handleGenerate} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase">Nombre del Período</label>
                <input 
                  placeholder="Ej: Mayo 2026" 
                  value={periodName} 
                  onChange={(e) => setPeriodName(e.target.value)} 
                  required 
                  className="w-full text-sm border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600 uppercase">Fecha Inicio</label>
                  <input 
                    type="date"
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    required 
                    className="w-full text-sm border-slate-300 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600 uppercase">Fecha Fin</label>
                  <input 
                    type="date"
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    required 
                    className="w-full text-sm border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase">Fórmula Polinómica (Reajuste Factor K)</label>
                <select 
                  value={formulaId} 
                  onChange={(e) => setFormulaId(e.target.value)}
                  className="w-full text-sm border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Sin Fórmula --</option>
                  {formulas.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
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
                  {isSubmitting ? "Calculando..." : "Generar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
