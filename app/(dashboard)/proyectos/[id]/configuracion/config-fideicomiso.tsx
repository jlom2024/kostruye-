"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ShieldCheck, CheckCircle2, Loader2, ChevronRight, Building2 } from "lucide-react";

interface FideicomisoState {
  companyEnabled: boolean;
  enabled: boolean;
  authorized: boolean;
  authorizedAt: string | null;
}

export function ConfigFideicomiso({ projectId }: { projectId: string }) {
  const [state, setState] = useState<FideicomisoState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch(`/api/fideicomiso/project/${projectId}`)
      .then((r) => r.json())
      .then((d) => setState(d))
      .catch(() => setState({ companyEnabled: false, enabled: false, authorized: false, authorizedAt: null }))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!state?.companyEnabled) {
    return (
      <div className="max-w-xl mx-auto mt-10 rounded-xl border border-slate-200 bg-white p-8 text-center">
        <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-4" />
        <h3 className="text-base font-semibold text-slate-700 mb-2">Servicio no habilitado</h3>
        <p className="text-sm text-slate-500">
          El servicio de fideicomiso con DH Consultores no está habilitado para tu empresa.
          Contacta al administrador de Kostruye+ para activarlo.
        </p>
      </div>
    );
  }

  const authorized = state.authorized;
  const requested = state.enabled && !authorized;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Fideicomiso — DH Consultores</h2>
        <p className="text-sm text-slate-500 mt-1">
          Autoriza a DH Consultores para gestionar el fideicomiso de esta obra a través de la plataforma CORFID.
        </p>
      </div>

      {/* Estado actual */}
      <div className={`rounded-xl border p-5 ${
        authorized
          ? "border-emerald-200 bg-emerald-50"
          : requested
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-slate-50"
      }`}>
        <div className="flex items-start gap-4">
          <div className={`mt-0.5 rounded-lg p-2 ${
            authorized ? "bg-emerald-100" : requested ? "bg-amber-100" : "bg-slate-100"
          }`}>
            {authorized
              ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              : <ShieldCheck className={`h-5 w-5 ${requested ? "text-amber-600" : "text-slate-400"}`} />
            }
          </div>
          <div>
            <p className={`text-sm font-semibold ${
              authorized ? "text-emerald-800" : requested ? "text-amber-800" : "text-slate-700"
            }`}>
              {authorized
                ? "Fideicomiso autorizado"
                : requested
                ? "Solicitud enviada — pendiente de activación"
                : "Sin autorización"}
            </p>
            <p className={`text-xs mt-0.5 ${
              authorized ? "text-emerald-600" : requested ? "text-amber-600" : "text-slate-500"
            }`}>
              {authorized
                ? `Autorizado el ${new Date(state.authorizedAt!).toLocaleDateString("es-PE", { day:"2-digit", month:"long", year:"numeric" })} — DH Consultores gestiona el fideicomiso de esta obra.`
                : requested
                ? "Tu solicitud fue enviada a DH Consultores. Se comunicarán contigo para formalizar el contrato."
                : "Esta obra aún no ha autorizado el acceso al servicio de fideicomiso."}
            </p>
          </div>
        </div>
      </div>

      {!authorized && !requested && (
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <ShieldCheck className="h-4 w-4" />
          Autorizar acceso a DH Consultores
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700 text-xs">¿Qué es el fideicomiso?</p>
        <p>
          El fideicomiso de obra es un instrumento financiero que garantiza que los fondos del proyecto se usen exclusivamente para la obra.
          DH Consultores actúa como fiduciario, supervisando el flujo de fondos a través de CORFID.
        </p>
      </div>

      {showModal && (
        <AuthorizationModal
          projectId={projectId}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            setState((s) => s ? { ...s, enabled: true } : s);
            toast.success("Solicitud enviada. DH Consultores se contactará para formalizar el fideicomiso.");
          }}
        />
      )}
    </div>
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
    if (ruc.length < 8) { setError("Ingresa un RUC válido."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/fideicomiso/project/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruc: ruc.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok && !data.alreadySent) throw new Error(data.error ?? "Error al enviar");
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
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 mb-3">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Autorizar acceso a DH Consultores</h2>
          <p className="text-sm text-slate-500 mt-1">
            Permite que HD Consultores y Asesores gestione el fideicomiso de esta obra a través de CORFID.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">RUC de tu empresa *</label>
            <input
              required
              value={ruc}
              onChange={(e) => setRuc(e.target.value.replace(/\D/g, ""))}
              maxLength={11}
              placeholder="20123456789"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Teléfono de contacto</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="987 654 321"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 leading-relaxed">
            <p className="font-semibold text-slate-700 mb-2">Declaración de autorización</p>
            <p>
              Declaro que en mi calidad de representante legal autorizo a{" "}
              <strong>HD Consultores y Asesores S.A.C.</strong> a gestionar y administrar el fideicomiso
              de esta obra a través del sistema CORFID. Esta autorización tiene carácter legal y será
              formalizada mediante contrato.
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-blue-600"
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              He leído y acepto la declaración. Entiendo que DH Consultores se comunicará conmigo para
              firmar el contrato formal.
            </span>
          </label>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !accepted}
              className="flex-[2] rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Enviando..." : "Confirmar autorización"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
