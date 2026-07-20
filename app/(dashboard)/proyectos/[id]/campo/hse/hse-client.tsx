"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, FileCheck2, UserCheck, AlertTriangle, Plus, CheckCircle, XCircle, Pencil, Trash2 } from "lucide-react";

interface Checklist {
  id: string;
  title: string;
  checklist_type: string;
  inspector_user_id: string;
  status: "draft" | "completed";
  created_at: string;
}

interface Incident {
  id: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  location: string;
  action_required: string;
  status: "open" | "resolved";
  photo_url: string | null;
  created_at: string;
}

interface Props {
  projectId: string;
  projectName: string;
  initialChecklists: Checklist[];
  initialIncidents: Incident[];
}

const CHECKLIST_TEMPLATES: Record<string, string[]> = {
  trabajo_altura: [
    "Arnés de seguridad en buen estado y con inspección del mes",
    "Línea de vida instalada correctamente y anclajes certificados",
    "Andamios completamente armados, nivelados y con tarjeta verde",
    "Uso de barbiquejo obligatorio en el casco de seguridad"
  ],
  excavaciones: [
    "Señalización y barricadas instaladas alrededor de la excavación",
    "Taludes protegidos contra derrumbes o entibados conformes",
    "Escaleras de acceso/salida seguras a no más de 7.5m de distancia",
    "Inspección diaria de acumulación de agua o agrietamiento"
  ],
  EPP_basico: [
    "Uso obligatorio de casco de seguridad y lentes de protección",
    "Calzado de seguridad con punta de acero en buen estado",
    "Chaleco reflectivo de alta visibilidad para todo el personal",
    "Protección auditiva en zonas con ruido superior a 85 dB"
  ],
  equipos_electricos: [
    "Cables y enchufes de herramientas eléctricas sin empalmes caseros",
    "Tableros eléctricos provisionales protegidos y con llaves diferenciales",
    "Herramientas eléctricas con doble aislamiento o conexión a tierra",
    "Áreas de trabajo secas y libres de materiales inflamables"
  ]
};

export function HSEClient({ projectId, projectName, initialChecklists, initialIncidents }: Props) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"checklists" | "incidents">("checklists");
  const [checklists, setChecklists] = useState<Checklist[]>(initialChecklists);
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [loading, setLoading] = useState(false);

  // Estados para nuevo checklist
  const [showNewChecklistModal, setShowNewChecklistModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("EPP_basico");
  const [checklistItems, setChecklistItems] = useState<Record<string, { status: "pass" | "fail" | "na"; notes: string }>>({});

  // Estados para nuevo/editar incidente
  const [showNewIncidentModal, setShowNewIncidentModal] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [incDescription, setIncDescription] = useState("");
  const [incSeverity, setIncSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [incLocation, setIncLocation] = useState("");
  const [incActionRequired, setIncActionRequired] = useState("");

  const handleCreateChecklist = async () => {
    if (!newTitle.trim()) {
      toast.error("Por favor ingrese el título de la inspección.");
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // 1. Insertar cabecera
      const { data: checklist, error: chkErr } = await (supabase
        .from("hse_checklists") as any)
        .insert({
          project_id: projectId,
          title: newTitle,
          checklist_type: newType,
          inspector_user_id: user.id,
          status: "completed"
        } as any)
        .select("*")
        .single();

      if (chkErr) throw new Error(chkErr.message);

      // 2. Insertar ítems
      const questions = CHECKLIST_TEMPLATES[newType] || [];
      const rows = questions.map((q) => {
        const itemState = checklistItems[q] || { status: "pass", notes: "" };
        return {
          checklist_id: (checklist as any).id,
          question: q,
          status: itemState.status,
          notes: itemState.notes
        };
      });

      if (rows.length > 0) {
        const { error: itemsErr } = await (supabase
          .from("hse_checklist_items") as any)
          .insert(rows);
        if (itemsErr) throw new Error(itemsErr.message);
      }
      
      setChecklists([checklist, ...checklists]);
      setShowNewChecklistModal(false);
      setNewTitle("");
      setChecklistItems({});
      toast.success("Inspección de HSE registrada exitosamente");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const resetIncidentForm = () => {
    setEditingIncident(null);
    setIncDescription("");
    setIncSeverity("medium");
    setIncLocation("");
    setIncActionRequired("");
  };

  const openNewIncidentModal = () => {
    resetIncidentForm();
    setShowNewIncidentModal(true);
  };

  const openEditIncidentModal = (incident: Incident) => {
    setEditingIncident(incident);
    setIncDescription(incident.description);
    setIncSeverity(incident.severity);
    setIncLocation(incident.location);
    setIncActionRequired(incident.action_required || "");
    setShowNewIncidentModal(true);
  };

  const closeIncidentModal = () => {
    setShowNewIncidentModal(false);
    resetIncidentForm();
  };

  const handleSaveIncident = async () => {
    if (!incDescription.trim() || !incLocation.trim()) {
      toast.error("Descripción y Ubicación son campos obligatorios.");
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      if (editingIncident) {
        const { data: incident, error: incErr } = await (supabase
          .from("hse_incidents") as any)
          .update({
            description: incDescription,
            severity: incSeverity,
            location: incLocation,
            action_required: incActionRequired,
          } as any)
          .eq("id", editingIncident.id)
          .select("*")
          .single();

        if (incErr) throw new Error(incErr.message);

        setIncidents(incidents.map(i => i.id === incident.id ? incident : i));
        toast.success("Incidente actualizado");
      } else {
        const { data: incident, error: incErr } = await (supabase
          .from("hse_incidents") as any)
          .insert({
            project_id: projectId,
            description: incDescription,
            severity: incSeverity,
            location: incLocation,
            action_required: incActionRequired,
            status: "open"
          } as any)
          .select("*")
          .single();

        if (incErr) throw new Error(incErr.message);

        setIncidents([incident, ...incidents]);
        toast.success("Incidente de seguridad reportado");
      }

      closeIncidentModal();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIncident = async (incidentId: string) => {
    if (!confirm("¿Estás seguro de eliminar este incidente? Esta acción se registrará en auditoría.")) {
      return;
    }
    setLoading(true);
    try {
      const { error } = await (supabase
        .from("hse_incidents") as any)
        .delete()
        .eq("id", incidentId);

      if (error) throw new Error(error.message);

      setIncidents(incidents.filter(i => i.id !== incidentId));
      toast.success("Incidente eliminado");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveIncident = async (incidentId: string) => {
    try {
      const { error } = await (supabase
        .from("hse_incidents") as any)
        .update({ status: "resolved" })
        .eq("id", incidentId);

      if (error) throw new Error(error.message);

      setIncidents(incidents.map(i => i.id === incidentId ? { ...i, status: "resolved" } : i));
      toast.success("Incidente marcado como Resuelto");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Seguridad y Salud en el Trabajo (HSE)</h1>
          <p className="text-sm text-slate-500 mt-1">
            Control de calidad, checklists de seguridad de frentes e informes de incidentes de obra en {projectName}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => activeTab === "checklists" ? setShowNewChecklistModal(true) : openNewIncidentModal()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {activeTab === "checklists" ? "Nueva Inspección" : "Reportar Incidente"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("checklists")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "checklists"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileCheck2 className="h-4 w-4" />
          Checklists e Inspecciones
        </button>
        <button
          onClick={() => setActiveTab("incidents")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "incidents"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          Incidentes de Seguridad
        </button>
      </div>

      {/* Content */}
      {activeTab === "checklists" ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Título / Inspección</th>
                <th className="px-4 py-3">Tipo de Trabajo</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {checklists.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    No se han registrado inspecciones de seguridad aún.
                  </td>
                </tr>
              ) : (
                checklists.map((chk) => (
                  <tr key={chk.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(chk.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {chk.title}
                    </td>
                    <td className="px-4 py-3 uppercase text-xs font-mono text-slate-600">
                      {chk.checklist_type.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                        Completado
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {incidents.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 shadow-sm">
              No hay incidentes de seguridad reportados para esta obra.
            </div>
          ) : (
            incidents.map((inc) => {
              const severityColors = {
                low: "bg-slate-100 text-slate-700 border-slate-200",
                medium: "bg-amber-50 text-amber-700 border-amber-200",
                high: "bg-orange-50 text-orange-700 border-orange-200",
                critical: "bg-red-50 text-red-700 border-red-200"
              };
              return (
                <div key={inc.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${severityColors[inc.severity]}`}>
                          {inc.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          Frente: {inc.location}
                        </span>
                      </div>
                      <p className="text-slate-800 font-medium mt-2">{inc.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {inc.status === "open" ? (
                        <button
                          onClick={() => handleResolveIncident(inc.id)}
                          className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                        >
                          Marcar Resuelto
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <ShieldCheck className="h-4 w-4" /> Resuelto
                        </span>
                      )}
                      <button
                        onClick={() => openEditIncidentModal(inc)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar incidente"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteIncident(inc.id)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar incidente"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {inc.photo_url && (
                    <div className="rounded-lg overflow-hidden border border-slate-200">
                      <img
                        src={inc.photo_url}
                        alt="Evidencia del incidente"
                        className="w-full max-h-64 object-contain bg-slate-100"
                        loading="lazy"
                      />
                    </div>
                  )}
                  {inc.action_required && (
                    <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 border border-slate-100">
                      <strong>Acción Correctiva:</strong> {inc.action_required}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal Checklist */}
      {showNewChecklistModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Nueva Inspección de Seguridad (HSE)</h3>
              <button onClick={() => setShowNewChecklistModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-medium text-slate-600 uppercase">Título de Inspección</label>
                <input
                  type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Inspección Semanal de EPPs - Frente A"
                  className="w-full text-sm border-slate-200 rounded-lg mt-1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 uppercase">Tipo de Trabajo / Checklist</label>
                <select
                  value={newType} onChange={(e) => { setNewType(e.target.value); setChecklistItems({}); }}
                  className="w-full text-sm border-slate-200 rounded-lg mt-1"
                >
                  <option value="EPP_basico">EPP Básico</option>
                  <option value="trabajo_altura">Trabajo en Altura</option>
                  <option value="excavaciones">Excavaciones y Zanjas</option>
                  <option value="equipos_electricos">Equipos y Conexiones Eléctricas</option>
                </select>
              </div>

              {/* Items dinámicos */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-semibold text-slate-700 border-b border-slate-100 pb-1">Evaluación de Puntos Críticos:</p>
                {(CHECKLIST_TEMPLATES[newType] || []).map((q) => {
                  const state = checklistItems[q] || { status: "pass", notes: "" };
                  return (
                    <div key={q} className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                      <p className="text-xs font-medium text-slate-700">{q}</p>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                          <input
                            type="radio" checked={state.status === "pass"}
                            onChange={() => setChecklistItems({ ...checklistItems, [q]: { ...state, status: "pass" } })}
                          /> Conformar (Pass)
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                          <input
                            type="radio" checked={state.status === "fail"}
                            onChange={() => setChecklistItems({ ...checklistItems, [q]: { ...state, status: "fail" } })}
                          /> No Conforme (Fail)
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50 rounded-b-xl">
              <button
                onClick={() => setShowNewChecklistModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateChecklist} disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Guardar Inspección
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Incidente */}
      {showNewIncidentModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 font-sans">
                {editingIncident ? "Editar Incidente de Seguridad" : "Reportar Incidente de Seguridad"}
              </h3>
              <button onClick={closeIncidentModal} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 uppercase">Descripción de la Condición o Acto</label>
                <textarea
                  value={incDescription} onChange={(e) => setIncDescription(e.target.value)}
                  placeholder="Ej: Se identificó obrero laborando en andamio del 3er nivel sin enganchar su línea de vida."
                  rows={3} className="w-full text-sm border-slate-200 rounded-lg mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 uppercase">Severidad del Riesgo</label>
                  <select
                    value={incSeverity} onChange={(e: any) => setIncSeverity(e.target.value)}
                    className="w-full text-sm border-slate-200 rounded-lg mt-1"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="critical">Crítica</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 uppercase">Ubicación / Frente</label>
                  <input
                    type="text" value={incLocation} onChange={(e) => setIncLocation(e.target.value)}
                    placeholder="Ej: Bloque B - Piso 3"
                    className="w-full text-sm border-slate-200 rounded-lg mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 uppercase">Acción Correctiva Inmediata</label>
                <input
                  type="text" value={incActionRequired} onChange={(e) => setIncActionRequired(e.target.value)}
                  placeholder="Ej: Se procedió a bajar al operario y capacitarlo en trabajo de altura."
                  className="w-full text-sm border-slate-200 rounded-lg mt-1"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50 rounded-b-xl">
              <button
                onClick={closeIncidentModal}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveIncident} disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editingIncident ? "Guardar Cambios" : "Guardar Reporte"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
