"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ShieldCheck, CheckCircle2, Loader2, ChevronRight, X, Building2 } from "lucide-react";

interface FideicomisoStatus {
  companyEnabled: boolean;
  enabled: boolean;
  authorized: boolean;
  authorizedAt: string | null;
}

/**
 * Card de Fideicomiso DH Consultores para la página de Configuración de una obra.
 * Solo aparece si la empresa tiene fideicomiso_enabled = true en app_clients.
 */
export function FideicomisoProjectCard({ projectId }: { projectId: string }) {
  const [status, setStatus] = useState<FideicomisoStatus | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    fetch(`/api/fideicomiso/project/${projectId}`)
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch(() => setStatus({ companyEnabled: false, enabled: false, authorized: false, authorizedAt: null }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, [projectId]);

  if (loading) return null;
  if (!status?.companyEnabled) return null;

  const isAuthorized = status.authorized;
  const isLinked = status.enabled && !status.authorized; // solicitado pero no confirmado aún

  return (
    <>
      <div className="border border-slate-200 rounded-xl p-6 bg-white">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isAuthorized ? "bg-emerald-50" : isLinked ? "bg-amber-50" : "bg-blue-50"
          }`}>
            {isAuthorized
              ? <CheckCircle2 size={20} className="text-emerald-600" />
              : <ShieldCheck size={20} className={isLinked ? "text-amber-600" : "text-blue-600"} />
            }
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-slate-900">Fideicomiso DH Consultores</h3>
              {isAuthorized && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Activo</span>
              )}
              {isLinked && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Pendiente confirmación</span>
              )}
              {!isLinked && !isAuthorized && (
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">No vinculado</span>
              )}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {isAuthorized
                ? "Esta obra está siendo gestionada por HD Consultores y Asesores a través del sistema CORFID."
                : isLinked
                ? "Solicitud enviada. DH Consultores revisará y confirmará el fideicomiso de esta obra."
                : "Vincula esta obra para que DH Consultores gestione su fideicomiso a través de CORFID."
              }
            </p>

            {!isAuthorized && !isLinked && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors"
              >
                <Building2 size={12} />
                Vincular esta obra al fideicomiso
                <ChevronRight size={11} />
              </button>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <AuthorizationModal
          projectId={projectId}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            refresh();
            toast.success("Solicitud enviada a DH Consultores. Te contactaremos pronto.");
          }}
        />
      )}
    </>
  );
}

function AuthorizationModal({
  projectId,
  onClose,
  onSuccess,
}: {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [ruc, setRuc] = useState("");
  const [phone, setPhone] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) { setError("Debes aceptar los términos antes de continuar."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/fideicomiso/project/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruc: ruc.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.alreadySent) { onSuccess(); return; }
        throw new Error(data.error ?? "Error al enviar la autorización");
      }
      onSuccess();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <ShieldCheck size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Vincular obra al fideicomiso</h2>
              <p className="text-xs text-slate-500">DH Consultores — CORFID</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-5 leading-relaxed">
          Al vincular esta obra, <strong className="text-slate-800">HD Consultores y Asesores S.A.C.</strong> gestionará
          su fideicomiso en CORFID. Esta acción será formalizada mediante contrato.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1.5">RUC de tu empresa *</label>
            <input
              required
              value={ruc}
              onChange={(e) => setRuc(e.target.value.replace(/\D/g, ""))}
              maxLength={11}
              placeholder="20123456789"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1.5">Teléfono de contacto</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="987 654 321"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 leading-relaxed">
            <p className="font-semibold text-slate-700 mb-2">Declaración de autorización</p>
            <p>Declaro que en mi calidad de representante legal autorizo a <strong>HD Consultores y Asesores S.A.C.</strong> a gestionar y administrar el fideicomiso de esta obra a través del sistema CORFID. Esta autorización tiene carácter legal y será formalizada mediante contrato.</p>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 accent-blue-600 w-4 h-4 flex-shrink-0"
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              He leído y acepto la declaración de autorización. Entiendo que DH Consultores se comunicará conmigo para firmar el contrato formal.
            </span>
          </label>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !accepted}
              className="flex-2 flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Enviando..." : "Confirmar autorización"}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-slate-400 mt-4">
          Powered by <span className="text-slate-500">Kostruye+</span> · DH Consultores
        </p>
      </div>
    </div>
  );
}
