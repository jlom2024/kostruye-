"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

interface IneiIndex {
  id: string;
  index_code: string;
  index_name: string;
  period_year: number;
  period_month: number;
  index_value: number;
}

interface Props {
  initialIndices: IneiIndex[];
}

export function IneiClient({ initialIndices }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [value, setValue] = useState("");

  const filtered = initialIndices.filter(
    (i) => 
      i.index_code.includes(searchTerm) || 
      i.index_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.period_year.toString().includes(searchTerm)
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !year || !month || !value) return;

    setIsSubmitting(true);
    const { error } = await (supabase.from("inei_indices") as any).insert({
      index_code: code,
      index_name: name,
      period_year: parseInt(year),
      period_month: parseInt(month),
      index_value: parseFloat(value)
    });

    setIsSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        toast.error("Ya existe un índice para ese código, mes y año.");
      } else {
        toast.error("Error al guardar: " + error.message);
      }
    } else {
      toast.success("Índice INEI guardado correctamente");
      setIsAddOpen(false);
      setCode("");
      setValue("");
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            placeholder="Buscar código, nombre o año..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 w-full text-sm border-slate-300 rounded-lg"
          />
        </div>

        <button 
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Registrar Índice
        </button>
      </div>

      <div className="overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3 text-center w-28">Período</th>
              <th className="px-4 py-3 text-right w-32">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-slate-400 py-10">
                  No se encontraron índices INEI.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{item.index_code}</td>
                  <td className="px-4 py-3 font-medium">{item.index_name}</td>
                  <td className="px-4 py-3 text-center text-slate-500 font-mono">
                    {item.period_month.toString().padStart(2, "0")} / {item.period_year}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    {Number(item.index_value).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL REGISTRAR ÍNDICE */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-slate-900 text-base">Registrar Valor INEI</h3>
                <p className="text-xs text-slate-500 mt-1">Ingresa el valor del Índice Unificado para un mes específico.</p>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600 uppercase">Código INEI</label>
                  <input 
                    placeholder="Ej: 47" 
                    value={code} 
                    onChange={(e) => setCode(e.target.value)} 
                    required 
                    className="w-full text-sm border-slate-300 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600 uppercase">Nombre / Descripción</label>
                  <input 
                    placeholder="Ej: Pintura Látex" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    className="w-full text-sm border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600 uppercase">Año</label>
                  <input 
                    type="number" 
                    value={year} 
                    onChange={(e) => setYear(e.target.value)} 
                    required 
                    className="w-full text-sm border-slate-300 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600 uppercase">Mes (1-12)</label>
                  <input 
                    type="number" 
                    min="1" max="12" 
                    value={month} 
                    onChange={(e) => setMonth(e.target.value)} 
                    required 
                    className="w-full text-sm border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase">Valor del Índice</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="Ej: 110.55" 
                  value={value} 
                  onChange={(e) => setValue(e.target.value)} 
                  required 
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
                  {isSubmitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
