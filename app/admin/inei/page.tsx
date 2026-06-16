"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Gestión de índices unificados INEI (data nacional curada por KREO).
// Alimenta el cálculo del factor K de reajuste polinómico (fn_calc_factor_k).

interface IneiIndex {
  id: string;
  index_code: string;
  index_name: string;
  period_year: number;
  period_month: number;
  index_value: number;
}

// Catálogo de códigos más usados (autocompleta el nombre al elegir el código)
const KNOWN_CODES: Record<string, string> = {
  "02": "Acero de Construcción Liso",
  "03": "Acero de Construcción Corrugado",
  "04": "Agregado Fino",
  "05": "Agregado Grueso",
  "13": "Asfalto",
  "17": "Bloque y Ladrillo",
  "21": "Cemento Portland Tipo I",
  "29": "Mano de Obra (MO)",
  "30": "Dólar (tipo de cambio)",
  "37": "Herramienta Manual",
  "39": "Madera Nacional para Encofrado",
  "43": "Madera Terciada para Encofrado",
  "44": "Maquinaria y Equipo Nacional",
  "45": "Maquinaria y Equipo Importado",
  "47": "Pintura Látex",
  "49": "Tubería de Acero",
  "54": "Tubería de PVC para Agua Potable",
  "65": "Vidrio Incoloro Doble",
  "67": "Combustibles y Carburantes",
  "71": "Agua",
};

const MONTHS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export default function IneiAdminPage() {
  const router = useRouter();
  const [indices, setIndices] = useState<IneiIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    index_code: "21",
    index_name: KNOWN_CODES["21"],
    period_year: 2026,
    period_month: 1,
    index_value: "" as string | number,
  });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/inei");
    if (res.status === 401) { router.push("/admin/login"); return; }
    const data = await res.json();
    setIndices(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  function setCode(code: string) {
    setForm((f) => ({ ...f, index_code: code, index_name: KNOWN_CODES[code] ?? f.index_name }));
  }

  async function save() {
    setError("");
    if (form.index_value === "" || isNaN(Number(form.index_value))) {
      setError("Ingresa un valor de índice numérico");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/inei", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, index_value: Number(form.index_value) }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Error al guardar");
      return;
    }
    setForm((f) => ({ ...f, index_value: "" }));
    load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este índice?")) return;
    const res = await fetch("/api/admin/inei", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setIndices((p) => p.filter((i) => i.id !== id));
  }

  // Agrupar por período (año-mes) para lectura
  const grouped = indices.reduce<Record<string, IneiIndex[]>>((acc, i) => {
    const key = `${i.period_year}-${String(i.period_month).padStart(2, "0")}`;
    (acc[key] ??= []).push(i);
    return acc;
  }, {});

  return (
    <div style={{ minHeight: "100vh", background: "#0b1220", color: "#e2e8f0", padding: "32px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Índices Unificados INEI</h1>
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
              Data nacional para el reajuste polinómico (factor K). Base 100 según período de referencia.
            </p>
          </div>
          <button
            onClick={() => router.push("/admin")}
            style={{ background: "transparent", border: "1px solid #334155", color: "#cbd5e1", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}
          >
            ← Volver al admin
          </button>
        </div>

        {/* Form de captura */}
        <div style={{ background: "#111c30", border: "1px solid #1e293b", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginTop: 0, marginBottom: 14 }}>Registrar / actualizar índice</p>
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 90px 110px 110px 110px", gap: 10, alignItems: "end" }}>
            <Field label="Código">
              <input
                list="inei-codes"
                value={form.index_code}
                onChange={(e) => setCode(e.target.value)}
                style={inputStyle}
              />
              <datalist id="inei-codes">
                {Object.entries(KNOWN_CODES).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              </datalist>
            </Field>
            <Field label="Nombre del índice">
              <input value={form.index_name} onChange={(e) => setForm((f) => ({ ...f, index_name: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Año">
              <input type="number" value={form.period_year} onChange={(e) => setForm((f) => ({ ...f, period_year: Number(e.target.value) }))} style={inputStyle} />
            </Field>
            <Field label="Mes">
              <select value={form.period_month} onChange={(e) => setForm((f) => ({ ...f, period_month: Number(e.target.value) }))} style={inputStyle}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{i + 1} — {m}</option>)}
              </select>
            </Field>
            <Field label="Valor (Ir)">
              <input type="number" step="0.0001" value={form.index_value} placeholder="100.00" onChange={(e) => setForm((f) => ({ ...f, index_value: e.target.value }))} style={inputStyle} />
            </Field>
            <button
              onClick={save}
              disabled={saving}
              style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
          {error && <p style={{ color: "#f87171", fontSize: 12, marginTop: 10, marginBottom: 0 }}>{error}</p>}
        </div>

        {/* Lista por período */}
        {loading ? (
          <p style={{ color: "#94a3b8", fontSize: 13 }}>Cargando…</p>
        ) : Object.keys(grouped).length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: 13 }}>Sin índices registrados.</p>
        ) : (
          Object.entries(grouped)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([period, rows]) => {
              const [y, m] = period.split("-");
              return (
                <div key={period} style={{ marginBottom: 18 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                    {MONTHS[Number(m) - 1]} {y} · {rows.length} índice{rows.length !== 1 ? "s" : ""}
                  </p>
                  <div style={{ background: "#111c30", border: "1px solid #1e293b", borderRadius: 10, overflow: "hidden" }}>
                    {rows.map((i, idx) => (
                      <div key={i.id} style={{ display: "grid", gridTemplateColumns: "70px 1fr 120px 40px", gap: 10, alignItems: "center", padding: "8px 14px", borderTop: idx ? "1px solid #1e293b" : "none", fontSize: 13 }}>
                        <span style={{ fontFamily: "monospace", color: "#94a3b8" }}>{i.index_code}</span>
                        <span style={{ color: "#e2e8f0" }}>{i.index_name}</span>
                        <span style={{ fontFamily: "monospace", textAlign: "right", color: "#fff", fontWeight: 600 }}>{Number(i.index_value).toFixed(4)}</span>
                        <button
                          onClick={() => remove(i.id)}
                          style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16 }}
                          title="Eliminar"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0b1220",
  border: "1px solid #334155",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 13,
  color: "#e2e8f0",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", marginBottom: 4 }}>{label}</span>
      {children}
    </label>
  );
}
