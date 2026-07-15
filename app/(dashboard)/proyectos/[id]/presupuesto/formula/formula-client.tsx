"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, Calculator, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Monomio {
  id: string;
  formula_id: string;
  symbol: string;
  coefficient: number;
  index_code: string;
  description: string;
  sort_order: number;
}

interface Formula {
  id: string;
  project_id: string;
  budget_id: string | null;
  name: string;
  contract_date: string | null;
  notes: string | null;
  reajuste_monomios: Monomio[];
}

interface Props {
  projectId: string;
  budgetId: string | null;
  initialFormulas: Formula[];
  ineiDict: { index_code: string; index_name: string }[];
}

export function FormulaClient({ projectId, budgetId, initialFormulas, ineiDict }: Props) {
  const supabase = createClient();
  const router = useRouter();
  
  const [formulas, setFormulas] = useState<Formula[]>(initialFormulas);
  const [activeFormula, setActiveFormula] = useState<Formula | null>(initialFormulas[0] || null);

  const [isAddFormulaOpen, setIsAddFormulaOpen] = useState(false);
  const [newFormulaName, setNewFormulaName] = useState("");
  const [newContractDate, setNewContractDate] = useState("");

  const [isAddMonomioOpen, setIsAddMonomioOpen] = useState(false);
  const [monomioSymbol, setMonomioSymbol] = useState("");
  const [monomioCoef, setMonomioCoef] = useState("");
  const [monomioIndex, setMonomioIndex] = useState("");
  const [monomioDesc, setMonomioDesc] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateFormula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFormulaName) return;

    setIsSubmitting(true);
    const { data, error } = await supabase
      .from("reajuste_formulas")
      .insert({
        project_id: projectId,
        budget_id: budgetId,
        name: newFormulaName,
        contract_date: newContractDate || null,
      })
      .select("*, reajuste_monomios(*)")
      .single();

    setIsSubmitting(false);

    if (error) {
      toast.error("Error al crear fórmula: " + error.message);
    } else {
      toast.success("Fórmula creada");
      setFormulas([...formulas, data]);
      setActiveFormula(data);
      setIsAddFormulaOpen(false);
      router.refresh();
    }
  };

  const handleAddMonomio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFormula || !monomioSymbol || !monomioCoef || !monomioIndex) return;

    setIsSubmitting(true);
    const { data, error } = await supabase
      .from("reajuste_monomios")
      .insert({
        formula_id: activeFormula.id,
        symbol: monomioSymbol,
        coefficient: parseFloat(monomioCoef),
        index_code: monomioIndex,
        description: monomioDesc,
        sort_order: activeFormula.reajuste_monomios.length + 1
      })
      .select()
      .single();

    setIsSubmitting(false);

    if (error) {
      toast.error("Error al añadir monomio: " + error.message);
    } else {
      toast.success("Monomio añadido");
      const updatedFormula = {
        ...activeFormula,
        reajuste_monomios: [...activeFormula.reajuste_monomios, data]
      };
      setActiveFormula(updatedFormula);
      setFormulas(formulas.map(f => f.id === updatedFormula.id ? updatedFormula : f));
      setIsAddMonomioOpen(false);
      setMonomioSymbol("");
      setMonomioCoef("");
      setMonomioIndex("");
      setMonomioDesc("");
      router.refresh();
    }
  };

  const handleDeleteMonomio = async (monomioId: string) => {
    if (!activeFormula) return;
    if (!confirm("¿Eliminar este monomio?")) return;

    const { error } = await supabase.from("reajuste_monomios").delete().eq("id", monomioId);
    if (error) {
      toast.error("Error: " + error.message);
    } else {
      toast.success("Monomio eliminado");
      const updatedMonomios = activeFormula.reajuste_monomios.filter(m => m.id !== monomioId);
      const updatedFormula = { ...activeFormula, reajuste_monomios: updatedMonomios };
      setActiveFormula(updatedFormula);
      setFormulas(formulas.map(f => f.id === updatedFormula.id ? updatedFormula : f));
    }
  };

  // Cálculos de la fórmula activa
  const totalCoef = activeFormula 
    ? activeFormula.reajuste_monomios.reduce((acc, m) => acc + Number(m.coefficient), 0)
    : 0;

  const isComplete = Math.abs(totalCoef - 1.0) < 0.001;

  return (
    <div className="space-y-6">
      {/* HEADER / SELECTOR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {formulas.length > 0 ? (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <span className="font-semibold">Fórmula Activa:</span>
            <select 
              value={activeFormula?.id || ""} 
              onChange={(e) => setActiveFormula(formulas.find(f => f.id === e.target.value) || null)}
              className="w-[250px] text-sm border-slate-300 rounded-lg bg-white"
            >
              {formulas.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No hay fórmulas polinómicas en este proyecto.</p>
        )}

        <button 
          onClick={() => setIsAddFormulaOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nueva Fórmula
        </button>
      </div>

      {/* DETALLE FÓRMULA ACTIVA */}
      {activeFormula && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-t-xl">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                {activeFormula.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Fecha Base / Contrato: {activeFormula.contract_date || "No definida"}
              </p>
            </div>
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${
              isComplete 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              Σ Coeficientes = {totalCoef.toFixed(3)} {isComplete ? "✅" : "⚠️ (Debe ser 1.000)"}
            </span>
          </div>
          <div className="p-5">
            <div className="flex justify-end mb-4">
              <button 
                onClick={() => setIsAddMonomioOpen(true)} 
                disabled={totalCoef >= 1.000}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Plus className="h-4 w-4" /> Añadir Monomio
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Símbolo</th>
                    <th className="px-4 py-3">Coef. Incidencia (a, b, c...)</th>
                    <th className="px-4 py-3">Índice INEI</th>
                    <th className="px-4 py-3">Descripción</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {activeFormula.reajuste_monomios.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-slate-400 py-10">
                        No se han agregado monomios a esta fórmula.
                      </td>
                    </tr>
                  ) : (
                    activeFormula.reajuste_monomios
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((m) => {
                        const dictMatch = ineiDict.find(d => d.index_code === m.index_code);
                        return (
                          <tr key={m.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-bold text-lg text-slate-900">{m.symbol}</td>
                            <td className="px-4 py-3 text-blue-600 font-semibold">{Number(m.coefficient).toFixed(3)}</td>
                            <td className="px-4 py-3">
                              {m.index_code} - {dictMatch?.index_name || "Desconocido"}
                            </td>
                            <td className="px-4 py-3">{m.description}</td>
                            <td className="px-4 py-3 text-right">
                              <button 
                                onClick={() => handleDeleteMonomio(m.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG NUEVA FÓRMULA */}
      {isAddFormulaOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-900 text-base">Crear Fórmula Polinómica</h3>
              <button onClick={() => setIsAddFormulaOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            <form onSubmit={handleCreateFormula} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase">Nombre</label>
                <input 
                  placeholder="Ej: Fórmula 1 - Arquitectura" 
                  value={newFormulaName} 
                  onChange={(e) => setNewFormulaName(e.target.value)} 
                  required 
                  className="w-full text-sm border-slate-300 rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase">Fecha Base (Contrato)</label>
                <input 
                  type="date" 
                  value={newContractDate} 
                  onChange={(e) => setNewContractDate(e.target.value)} 
                  className="w-full text-sm border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsAddFormulaOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Creando..." : "Crear Fórmula"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG NUEVO MONOMIO */}
      {isAddMonomioOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-900 text-base">Añadir Monomio</h3>
                <button onClick={() => setIsAddMonomioOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Faltan {(1.000 - totalCoef).toFixed(3)} para llegar a 1.000.
              </p>
            </div>
            <form onSubmit={handleAddMonomio} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600 uppercase">Símbolo (Ej: Mano de Obra = J)</label>
                  <input 
                    placeholder="Ej: M" 
                    value={monomioSymbol} 
                    onChange={(e) => setMonomioSymbol(e.target.value)} 
                    required 
                    className="w-full text-sm border-slate-300 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600 uppercase">Coeficiente (Incidencia)</label>
                  <input 
                    type="number" 
                    step="0.001" 
                    max={(1.000 - totalCoef).toFixed(3)}
                    placeholder="Ej: 0.150" 
                    value={monomioCoef} 
                    onChange={(e) => setMonomioCoef(e.target.value)} 
                    required 
                    className="w-full text-sm border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase">Índice Unificado (INEI)</label>
                <select 
                  value={monomioIndex} 
                  onChange={(e) => setMonomioIndex(e.target.value)} 
                  required
                  className="w-full text-sm border-slate-300 rounded-lg bg-slate-50"
                >
                  <option value="">Selecciona el índice...</option>
                  {ineiDict.map((d) => (
                    <option key={d.index_code} value={d.index_code}>
                      {d.index_code} - {d.index_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase">Descripción Adicional</label>
                <input 
                  placeholder="Ej: Acero Corrugado" 
                  value={monomioDesc} 
                  onChange={(e) => setMonomioDesc(e.target.value)} 
                  className="w-full text-sm border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsAddMonomioOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Añadiendo..." : "Añadir Monomio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
