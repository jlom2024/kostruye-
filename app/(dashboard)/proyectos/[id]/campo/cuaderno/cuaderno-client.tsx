"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Save, CheckCircle2, AlertTriangle, Plus, Trash2, Search, BookOpen, CloudSun, UserCheck, Lock } from "lucide-react";
import { toast } from "sonner";

interface Entry {
  id: string;
  entry_number: number;
  entry_date: string;
  author_id: string;
  author_role: string;
  content: string;
  weather: string | null;
  status: string;
  created_at: string;
  author?: {
    id: string;
    email: string;
  };
}

interface Props {
  projectId: string;
  initialEntries: Entry[];
}

export function CuadernoClient({ projectId, initialEntries }: Props) {
  const supabase = createClient();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [authorRole, setAuthorRole] = useState("Residente");
  const [weather, setWeather] = useState("Soleado");
  const [content, setContent] = useState("");

  const filtered = initialEntries.filter((e) => 
    e.content.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.entry_number.toString().includes(searchTerm)
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) return;

    setIsSubmitting(true);
    
    // Obtener user actual (autor)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("No hay sesión activa");
      setIsSubmitting(false);
      return;
    }

    const { error } = await (supabase.from("site_diary_entries") as any).insert({
      project_id: projectId,
      entry_date: entryDate,
      author_id: session.user.id,
      author_role: authorRole,
      weather,
      content,
      status: 'Abierto'
    });

    setIsSubmitting(false);

    if (error) {
      toast.error("Error al registrar asiento: " + error.message);
    } else {
      toast.success("Asiento registrado en el Cuaderno de Obra");
      setIsAddOpen(false);
      setContent("");
      router.refresh();
    }
  };

  const handleCloseEntry = async (entryId: string) => {
    if (!confirm("¿Firmar y cerrar el asiento? Esta acción es irreversible según la Ley de Contrataciones.")) return;

    const { error } = await (supabase
      .from("site_diary_entries") as any)
      .update({ status: 'Cerrado' })
      .eq("id", entryId);

    if (error) {
      toast.error("Error al cerrar el asiento: " + error.message);
    } else {
      toast.success("Asiento firmado y cerrado legalmente.");
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            placeholder="Buscar por asiento o contenido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-sm border-slate-300 rounded-lg pl-9 h-9 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nuevo Asiento
        </button>
      </div>

      {/* Modal Custom sin Dialog de shadcn */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 text-base">Aperturar Asiento de Obra</h3>
                <p className="text-xs text-slate-500 mt-0.5">Registro oficial de ocurrencias del día.</p>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600 uppercase">Fecha del Asiento</label>
                  <input 
                    type="date"
                    value={entryDate} 
                    onChange={(e) => setEntryDate(e.target.value)} 
                    required 
                    className="w-full text-sm border-slate-200 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600 uppercase">Clima / Estado del Tiempo</label>
                  <select 
                    value={weather} 
                    onChange={(e) => setWeather(e.target.value)}
                    className="w-full text-sm border-slate-200 rounded-lg bg-slate-50"
                  >
                    <option value="Soleado">Soleado</option>
                    <option value="Parcialmente Nublado">Parcialmente Nublado</option>
                    <option value="Nublado">Nublado</option>
                    <option value="Lluvia">Lluvia</option>
                    <option value="Tormenta">Tormenta</option>
                    <option value="Nevada">Nevada</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase">Rol (Quien Anota)</label>
                <select 
                  value={authorRole} 
                  onChange={(e) => setAuthorRole(e.target.value)}
                  className="w-full text-sm border-slate-200 rounded-lg bg-slate-50"
                >
                  <option value="Residente">Ing. Residente</option>
                  <option value="Supervisor">Ing. Supervisor / Inspector</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase">Desarrollo de Ocurrencias</label>
                <textarea 
                  placeholder="Detallar avance físico, ingreso de personal, equipos, materiales o incidencias relevantes..." 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)} 
                  rows={8}
                  required
                  className="w-full text-sm border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Registrando..." : "Aperturar Asiento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center p-8 border rounded-lg bg-white text-slate-500">
            El cuaderno de obra está vacío.
          </div>
        ) : (
          filtered.map((entry) => (
            <div key={entry.id} className={`bg-white border rounded-xl shadow-sm overflow-hidden ${entry.status === 'Cerrado' ? 'border-slate-200' : 'border-blue-200'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    Asiento N° {entry.entry_number}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <CloudSun className="h-4 w-4" /> {entry.weather}
                    </span>
                    <span className="flex items-center gap-1">
                      <UserCheck className="h-4 w-4" /> {entry.author_role} ({entry.author?.email})
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-800">{new Date(entry.entry_date).toLocaleDateString()}</div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 border ${
                    entry.status === 'Cerrado' 
                      ? 'bg-slate-100 text-slate-700 border-slate-200' 
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {entry.status === 'Cerrado' ? (
                      <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Firmado (Cerrado)</span>
                    ) : 'Abierto / Borrador'}
                  </span>
                </div>
              </div>
              <div className="p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {entry.content}
              </div>
              {entry.status === 'Abierto' && (
                <div className="flex justify-end p-4 bg-slate-50 border-t border-slate-100">
                  <button 
                    onClick={() => handleCloseEntry(entry.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Firmar y Cerrar Asiento
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
