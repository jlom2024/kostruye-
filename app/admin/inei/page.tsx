"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

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

interface ImportRow {
  index_code: string;
  index_name: string;
  period_year: number;
  period_month: number;
  index_value: number;
  _error?: string;
}

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

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export default function IneiAdminPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [indices, setIndices] = useState<IneiIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Import state
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState("");

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

  // ── Excel import ────────────────────────────────────────────────
  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["codigo", "nombre", "anio", "mes", "valor"],
      ["29", "Mano de Obra (MO)", 2025, 1, 100.00],
      ["21", "Cemento Portland Tipo I", 2025, 1, 102.50],
    ]);
    ws["!cols"] = [{ wch: 8 }, { wch: 35 }, { wch: 6 }, { wch: 5 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "INEI");
    XLSX.writeFile(wb, "plantilla_inei.xlsx");
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        const rows: ImportRow[] = raw.map((r) => {
          // Acepta variantes de nombre de columna
          const code  = String(r["codigo"] ?? r["code"] ?? r["Código"] ?? r["CODIGO"] ?? "").trim().replace(/^0+/, "").padStart(2, "0");
          const name  = String(r["nombre"] ?? r["name"] ?? r["Nombre"] ?? r["NOMBRE"] ?? KNOWN_CODES[code] ?? "").trim();
          const year  = Number(r["anio"] ?? r["año"] ?? r["year"] ?? r["Año"] ?? r["AÑO"] ?? 0);
          const month = Number(r["mes"] ?? r["month"] ?? r["Mes"] ?? r["MES"] ?? 0);
          const value = Number(r["valor"] ?? r["value"] ?? r["Valor"] ?? r["VALOR"] ?? 0);

          const row: ImportRow = { index_code: code, index_name: name, period_year: year, period_month: month, index_value: value };
          if (!code || !name || !year || month < 1 || month > 12 || isNaN(value)) {
            row._error = "Fila incompleta o inválida";
          }
          return row;
        });

        setImportRows(rows);
        setShowImport(true);
        setImportResult("");
      } catch {
        alert("No se pudo leer el archivo. Verifica que sea un .xlsx o .xls válido.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }

  async function confirmImport() {
    const valid = importRows.filter((r) => !r._error);
    if (!valid.length) return;
    setImporting(true);
    setImportResult("");
    const res = await fetch("/api/admin/inei", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valid),
    });
    setImporting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setImportResult(`Error: ${d.error ?? "desconocido"}`);
      return;
    }
    const d = await res.json();
    setImportResult(`✓ ${d.imported} índices importados correctamente.`);
    setImportRows([]);
    setTimeout(() => { setShowImport(false); setImportResult(""); load(); }, 1800);
  }

  // Agrupar por período para lectura
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
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={downloadTemplate} style={btnSecondary} title="Descarga la plantilla Excel con el formato correcto">
              ↓ Plantilla
            </button>
            <button onClick={() => fileRef.current?.click()} style={btnPrimary}>
              ↑ Importar Excel
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={onFileChange} />
            <button onClick={() => router.push("/admin")} style={btnSecondary}>
              ← Admin
            </button>
          </div>
        </div>

        {/* Form de captura manual */}
        <div style={{ background: "#111c30", border: "1px solid #1e293b", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginTop: 0, marginBottom: 14 }}>Registrar / actualizar índice</p>
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 90px 110px 110px 110px", gap: 10, alignItems: "end" }}>
            <Field label="Código">
              <input list="inei-codes" value={form.index_code} onChange={(e) => setCode(e.target.value)} style={inputStyle} />
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
            <button onClick={save} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
          {error && <p style={{ color: "#f87171", fontSize: 12, marginTop: 10, marginBottom: 0 }}>{error}</p>}
        </div>

        {/* Modal de importación */}
        {showImport && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ background: "#111c30", border: "1px solid #1e3a5f", borderRadius: 14, padding: 28, width: "100%", maxWidth: 800, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, color: "#fff" }}>Vista previa — Importación INEI</h2>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
                    {importRows.filter((r) => !r._error).length} válidas · {importRows.filter((r) => r._error).length} con error · El upsert no crea duplicados.
                  </p>
                </div>
                <button onClick={() => setShowImport(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}>✕</button>
              </div>

              {/* Tabla preview */}
              <div style={{ overflowY: "auto", flex: 1, marginBottom: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1e293b" }}>
                      {["Código","Nombre","Año","Mes","Valor","Estado"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "6px 10px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 10 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.map((r, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #0f172a", background: r._error ? "rgba(239,68,68,0.06)" : "transparent" }}>
                        <td style={{ padding: "5px 10px", fontFamily: "monospace", color: "#94a3b8" }}>{r.index_code}</td>
                        <td style={{ padding: "5px 10px", color: "#e2e8f0" }}>{r.index_name}</td>
                        <td style={{ padding: "5px 10px", color: "#e2e8f0" }}>{r.period_year}</td>
                        <td style={{ padding: "5px 10px", color: "#e2e8f0" }}>{MONTHS[(r.period_month ?? 1) - 1]}</td>
                        <td style={{ padding: "5px 10px", fontFamily: "monospace", color: "#fff" }}>{Number(r.index_value).toFixed(4)}</td>
                        <td style={{ padding: "5px 10px" }}>
                          {r._error
                            ? <span style={{ color: "#f87171", fontSize: 11 }}>⚠ {r._error}</span>
                            : <span style={{ color: "#4ade80", fontSize: 11 }}>✓ OK</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {importResult && (
                <p style={{ color: importResult.startsWith("✓") ? "#4ade80" : "#f87171", fontSize: 13, margin: "0 0 12px" }}>{importResult}</p>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setShowImport(false)} style={btnSecondary}>Cancelar</button>
                <button
                  onClick={confirmImport}
                  disabled={importing || importRows.filter((r) => !r._error).length === 0}
                  style={{ ...btnPrimary, opacity: importing ? 0.6 : 1 }}
                >
                  {importing ? "Importando…" : `Importar ${importRows.filter((r) => !r._error).length} índices`}
                </button>
              </div>
            </div>
          </div>
        )}

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
                        <button onClick={() => remove(i.id)} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16 }} title="Eliminar">×</button>
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

const btnPrimary: React.CSSProperties = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "9px 14px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const btnSecondary: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #334155",
  color: "#cbd5e1",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 13,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", marginBottom: 4 }}>{label}</span>
      {children}
    </label>
  );
}
