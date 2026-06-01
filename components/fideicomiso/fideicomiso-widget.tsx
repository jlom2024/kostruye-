"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, ShieldCheck, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";

/**
 * Widget de fideicomiso — se auto-verifica via /api/fideicomiso/status.
 * Aparece solo si la constructora tiene fideicomiso_enabled = true en app_clients.
 */
export function FideicomisoWidget({ alreadyAuthorized: initialAuthorized }: { alreadyAuthorized?: boolean }) {
  const [status, setStatus] = useState<{ enabled: boolean; authorized: boolean } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [authorized, setAuthorized] = useState(initialAuthorized ?? false);

  useEffect(() => {
    fetch("/api/fideicomiso/status")
      .then((r) => r.json())
      .then((data) => {
        setStatus(data);
        if (data.authorized) setAuthorized(true);
      })
      .catch(() => setStatus({ enabled: false, authorized: false }));
  }, []);

  // No mostrar mientras carga, o si no está habilitado, o si fue cerrado
  if (!status || !status.enabled || dismissed) return null;

  return (
    <>
      {/* ── Banner ── */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 80,
          zIndex: 49,
          width: 360,
          background: authorized
            ? "linear-gradient(135deg, #064e3b, #065f46)"
            : "linear-gradient(135deg, #1e3a5f, #1e40af)",
          border: `1px solid ${authorized ? "rgba(52,211,153,0.25)" : "rgba(96,165,250,0.25)"}`,
          borderRadius: 14,
          padding: "16px 18px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <button
          onClick={() => setDismissed(true)}
          style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: 2 }}
        >
          <X size={14} />
        </button>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: authorized ? "rgba(52,211,153,0.15)" : "rgba(96,165,250,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            {authorized
              ? <CheckCircle2 size={18} color="#34d399" />
              : <ShieldCheck size={18} color="#60a5fa" />
            }
          </div>

          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 2px", color: "#fff", fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>
              {authorized ? "Fideicomiso autorizado ✓" : "Servicio de Fideicomiso disponible"}
            </p>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.55)", fontSize: 11, lineHeight: 1.4 }}>
              {authorized
                ? "DH Consultores gestiona tu fideicomiso. Cualquier consulta escribe a tu asesor."
                : "Habilita el acceso de DH Consultores para gestionar tu fideicomiso en CORFID."
              }
            </p>

            {!authorized && (
              <button
                onClick={() => setShowModal(true)}
                style={{
                  marginTop: 10,
                  display: "flex", alignItems: "center", gap: 4,
                  background: "rgba(96,165,250,0.2)",
                  border: "1px solid rgba(96,165,250,0.35)",
                  borderRadius: 7, color: "#93c5fd",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  padding: "6px 12px", transition: "background 0.2s",
                }}
              >
                Autorizar acceso <ChevronRight size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <AuthorizationModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            setAuthorized(true);
            toast.success("Autorización enviada a DH Consultores. Te contactaremos pronto.");
          }}
        />
      )}
    </>
  );
}

function AuthorizationModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [ruc, setRuc] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) { setError("Debes aceptar los términos antes de continuar."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/fideicomiso/autorizar", {
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
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, -apple-system, sans-serif" }}
      onClick={onClose}
    >
      <div
        style={{ width: "100%", maxWidth: 460, background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: "32px 28px", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <ShieldCheck size={24} color="#60a5fa" />
          </div>
          <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>Autorizar acceso a DH Consultores</h2>
          <p style={{ color: "#6b7280", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            Esta autorización permite que <strong style={{ color: "#9ca3af" }}>HD Consultores y Asesores</strong> gestione el fideicomiso de tu empresa a través de la plataforma CORFID.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ color: "#9ca3af", fontSize: 12, display: "block", marginBottom: 6 }}>RUC de tu empresa *</label>
            <input required value={ruc} onChange={(e) => setRuc(e.target.value.replace(/\D/g, ""))} maxLength={11} placeholder="20123456789"
              style={{ width: "100%", padding: "10px 13px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" as const, fontFamily: "monospace" }} />
          </div>
          <div>
            <label style={{ color: "#9ca3af", fontSize: 12, display: "block", marginBottom: 6 }}>Teléfono de contacto</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="987 654 321"
              style={{ width: "100%", padding: "10px 13px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 16px", fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
            <p style={{ margin: "0 0 10px", fontWeight: 600, color: "#9ca3af" }}>Declaración de autorización</p>
            <p style={{ margin: 0 }}>Declaro que en mi calidad de representante legal autorizo a <strong style={{ color: "#9ca3af" }}>HD Consultores y Asesores S.A.C.</strong> a gestionar y administrar el fideicomiso de mi empresa a través del sistema CORFID. Esta autorización tiene carácter legal y será formalizada mediante contrato.</p>
          </div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} style={{ marginTop: 2, flexShrink: 0, accentColor: "#3b82f6", width: 15, height: 15 }} />
            <span style={{ color: "#9ca3af", fontSize: 12, lineHeight: 1.5 }}>He leído y acepto la declaración de autorización. Entiendo que DH Consultores se comunicará conmigo para firmar el contrato formal.</span>
          </label>
          {error && <p style={{ color: "#f87171", fontSize: 12, margin: 0, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "8px 12px" }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "11px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, color: "#9ca3af", fontSize: 14, cursor: "pointer", fontWeight: 500 }}>Cancelar</button>
            <button type="submit" disabled={loading || !accepted}
              style={{ flex: 2, padding: "11px", background: accepted ? "linear-gradient(135deg, #1d4ed8, #2563eb)" : "rgba(37,99,235,0.3)", border: "none", borderRadius: 9, color: accepted ? "#fff" : "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: 600, cursor: accepted ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}>
              {loading && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
              {loading ? "Enviando..." : "Confirmar autorización"}
            </button>
          </div>
        </form>
        <p style={{ textAlign: "center", color: "#374151", fontSize: 11, marginTop: 16, margin: "16px 0 0" }}>Powered by <span style={{ color: "#4b5563" }}>Kostruye+</span> · DH Consultores</p>
      </div>
    </div>
  );
}
