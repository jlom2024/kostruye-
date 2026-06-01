"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Plan = "pilot" | "pro" | "enterprise";

interface Client {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  active: boolean;
  contact_name: string | null;
  contact_email: string | null;
  monthly_price: number;
  notes: string | null;
  logo_url: string | null;
  created_at: string;
  subscription_start: string | null;
}

function subStatus(start: string | null): { label: string; color: string; bg: string; border: string } {
  if (!start) return { label: "Sin fecha", color: "#6b7280", bg: "rgba(107,114,128,.1)", border: "rgba(107,114,128,.2)" };
  const startDate = new Date(start);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / 86400000);
  const daysInCycle = daysSinceStart % 30;
  const daysLeft = 30 - daysInCycle;
  if (daysLeft <= 0 || daysLeft === 30) {
    return { label: "Vencido", color: "#f87171", bg: "rgba(248,113,113,.1)", border: "rgba(248,113,113,.25)" };
  }
  if (daysLeft <= 5) {
    return { label: `Vence en ${daysLeft}d`, color: "#f59e0b", bg: "rgba(245,158,11,.1)", border: "rgba(245,158,11,.25)" };
  }
  return { label: `${daysLeft}d restantes`, color: "#4ade80", bg: "rgba(74,222,128,.08)", border: "rgba(74,222,128,.2)" };
}

function nextRenewal(start: string | null): string {
  if (!start) return "—";
  const startDate = new Date(start);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / 86400000);
  const cyclesDone = Math.floor(daysSinceStart / 30);
  const renewal = new Date(startDate);
  renewal.setDate(renewal.getDate() + (cyclesDone + 1) * 30);
  return renewal.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

const PLAN_LABELS: Record<Plan, string> = {
  pilot: "Piloto",
  pro: "Pro",
  enterprise: "Enterprise",
};

const PLAN_COLORS: Record<Plan, string> = {
  pilot: "#6b7280",
  pro: "#3b82f6",
  enterprise: "#f59e0b",
};

const PLAN_PRICES: Record<Plan, number> = {
  pilot: 0,
  pro: 599,
  enterprise: 1299,
};

export default function AdminDashboard() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", plan: "pilot" as Plan, contact_name: "", contact_email: "", password: "", monthly_price: 0, notes: "" });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/clients");
      if (res.status === 401) { router.push("/admin/login"); return; }
      
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setClients(data);
      } else {
        console.error("Data received is not an array:", data);
        setError(data.error || "Error desconocido al cargar clientes");
        setClients([]);
      }
    } catch (err: any) {
      console.error("Failed to load clients:", err);
      setError("Error de conexión al servidor");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function logout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/");
  }

  async function toggleActive(client: Client) {
    await fetch(`/api/admin/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !client.active }),
    });
    setClients((prev) => prev.map((c) => c.id === client.id ? { ...c, active: !c.active } : c));
  }

  async function changePlan(client: Client, plan: Plan) {
    const monthly_price = PLAN_PRICES[plan];
    await fetch(`/api/admin/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, monthly_price }),
    });
    setClients((prev) => prev.map((c) => c.id === client.id ? { ...c, plan, monthly_price } : c));
  }

  async function setSubscriptionStart(client: Client, date: string) {
    const value = date || null;
    await fetch(`/api/admin/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription_start: value }),
    });
    setClients((prev) => prev.map((c) => c.id === client.id ? { ...c, subscription_start: value } : c));
  }

  async function deleteClient(client: Client) {
    if (!confirm(`¿Eliminar a ${client.name}? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/admin/clients/${client.id}`, { method: "DELETE" });
    setClients((prev) => prev.filter((c) => c.id !== client.id));
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    if (file) setLogoPreview(URL.createObjectURL(file));
    else setLogoPreview("");
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    let logo_url: string | null = null;
    if (logoFile) {
      const fd = new FormData();
      fd.append("file", logoFile);
      const uploadRes = await fetch("/api/admin/upload-logo", { method: "POST", body: fd });
      if (!uploadRes.ok) {
        const d = await uploadRes.json();
        setError(d.error ?? "Error al subir logo");
        setSaving(false);
        return;
      }
      const { url } = await uploadRes.json();
      logo_url = url;
    }

    const res = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, monthly_price: PLAN_PRICES[form.plan], logo_url }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ name: "", slug: "", plan: "pilot", contact_name: "", contact_email: "", password: "", monthly_price: 0, notes: "" });
      setLogoFile(null);
      setLogoPreview("");
      await load();
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al crear cliente");
    }
    setSaving(false);
  }

  const clientsArray = Array.isArray(clients) ? clients : [];
  const active = clientsArray.filter((c) => c.active).length;
  const mrr = clientsArray.filter((c) => c.active).reduce((sum, c) => sum + (Number(c.monthly_price) || 0), 0);

  const s: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "#0a0f1e", color: "#fff", padding: "0 0 60px" },
    header: { background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" },
    logo: { fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 },
    content: { maxWidth: 1100, margin: "0 auto", padding: "32px 24px" },
    stats: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 },
    stat: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" },
    statVal: { fontSize: 28, fontWeight: 700, color: "#f59e0b" },
    statLabel: { fontSize: 13, color: "#6b7280", marginTop: 4 },
    card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" },
    cardHeader: { padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" },
    table: { width: "100%", borderCollapse: "collapse" as const },
    th: { padding: "12px 16px", textAlign: "left" as const, color: "#6b7280", fontSize: 12, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.5px", borderBottom: "1px solid rgba(255,255,255,0.05)" },
    td: { padding: "14px 16px", fontSize: 14, borderBottom: "1px solid rgba(255,255,255,0.04)" },
    badge: { padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 },
    btn: { padding: "7px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "opacity 0.2s" },
    input: { width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" as const },
    label: { color: "#9ca3af", fontSize: 12, display: "block", marginBottom: 5 },
    formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" },
    overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" },
    modal: { background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 32, width: "100%", maxWidth: 580 },
  };

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.logo}>
          <span>🏗️</span>
          <span>Kostruye+ <span style={{ color: "#f59e0b" }}>Admin</span></span>
        </div>
        <button onClick={logout} style={{ ...s.btn, background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}>
          Cerrar sesión
        </button>
      </header>

      <div style={s.content}>
        <div style={s.stats}>
          <div style={s.stat}>
            <div style={s.statVal}>{clientsArray.length}</div>
            <div style={s.statLabel}>Clientes totales</div>
          </div>
          <div style={s.stat}>
            <div style={s.statVal}>{active}</div>
            <div style={s.statLabel}>Clientes activos</div>
          </div>
          <div style={s.stat}>
            <div style={{ ...s.statVal, color: "#34d399" }}>S/ {mrr.toLocaleString()}</div>
            <div style={s.statLabel}>MRR estimado</div>
          </div>
        </div>

        <div style={s.card}>
          <div style={s.cardHeader}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Clientes</h2>
            <button
              onClick={() => setShowForm(true)}
              style={{ ...s.btn, background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff" }}
            >
              + Nuevo cliente
            </button>
          </div>

          {error && (
            <div style={{ padding: "20px", textAlign: "center", color: "#f87171", background: "rgba(239,68,68,0.05)" }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ padding: 32, textAlign: "center", color: "#6b7280" }}>Cargando...</div>
          ) : clientsArray.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>No hay clientes aún. Crea el primero.</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  {["Cliente", "Slug", "Plan", "Precio/mes", "Suscripción", "Próx. cobro", "Estado", "Acciones"].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientsArray.map((c) => (
                  <tr key={c.id} style={{ opacity: c.active ? 1 : 0.5 }}>
                    <td style={s.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 7, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                          {c.logo_url
                            ? <img src={c.logo_url} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                            : <span style={{ fontSize: 14 }}>🏗️</span>
                          }
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          {c.contact_email && <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>{c.contact_email}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={s.td}>
                      <code style={{ background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>/{c.slug}</code>
                    </td>
                    <td style={s.td}>
                      <select
                        value={c.plan}
                        onChange={(e) => changePlan(c, e.target.value as Plan)}
                        style={{ background: PLAN_COLORS[c.plan] + "22", border: `1px solid ${PLAN_COLORS[c.plan]}44`, borderRadius: 6, color: PLAN_COLORS[c.plan], padding: "4px 8px", fontSize: 12, cursor: "pointer", outline: "none" }}
                      >
                        {(["pilot", "pro", "enterprise"] as Plan[]).map((p) => (
                          <option key={p} value={p} style={{ background: "#111827", color: "#fff" }}>{PLAN_LABELS[p]}</option>
                        ))}
                      </select>
                    </td>
                    <td style={s.td}>
                      <span style={{ color: c.monthly_price > 0 ? "#34d399" : "#6b7280" }}>
                        {c.monthly_price > 0 ? `S/ ${c.monthly_price.toLocaleString()}` : "Gratis"}
                      </span>
                    </td>
                    {/* Suscripción — date picker inline */}
                    <td style={s.td}>
                      <input
                        type="date"
                        value={c.subscription_start ?? ""}
                        onChange={(e) => setSubscriptionStart(c, e.target.value)}
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 6,
                          color: c.subscription_start ? "#e5e7eb" : "#6b7280",
                          padding: "4px 8px",
                          fontSize: 12,
                          outline: "none",
                          cursor: "pointer",
                          fontFamily: "monospace",
                        }}
                        title="Fecha de inicio de suscripción (se guarda automáticamente)"
                      />
                    </td>

                    {/* Próximo cobro */}
                    <td style={{ ...s.td }}>
                      {(() => {
                        const st = subStatus(c.subscription_start);
                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <span style={{ fontSize: 12, color: "#9ca3af" }}>{nextRenewal(c.subscription_start)}</span>
                            <span style={{ ...s.badge, background: st.bg, color: st.color, border: `1px solid ${st.border}`, fontSize: 10, padding: "2px 7px", display: "inline-block", width: "fit-content" }}>
                              {st.label}
                            </span>
                          </div>
                        );
                      })()}
                    </td>

                    <td style={s.td}>
                      <button
                        onClick={() => toggleActive(c)}
                        style={{
                          ...s.badge,
                          background: c.active ? "#dcfce722" : "#fee2e222",
                          color: c.active ? "#4ade80" : "#f87171",
                          border: `1px solid ${c.active ? "#4ade8044" : "#f8717144"}`,
                          cursor: "pointer",
                        }}
                      >
                        {c.active ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <a
                          href={`/${c.slug}`}
                          target="_blank"
                          style={{ ...s.btn, background: "rgba(59,130,246,0.15)", color: "#60a5fa", textDecoration: "none", display: "inline-block" }}
                        >
                          Ver
                        </a>
                        <button
                          onClick={() => deleteClient(c)}
                          style={{ ...s.btn, background: "rgba(239,68,68,0.1)", color: "#f87171" }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && (
        <div style={s.overlay} onClick={() => setShowForm(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>Nuevo cliente</h3>
            <form onSubmit={submitForm}>
              <div style={s.formGrid}>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={s.label}>Nombre de la empresa *</label>
                  <input style={s.input} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="SEATEK Construcciones S.A.C." />
                </div>
                <div>
                  <label style={s.label}>Slug (URL) *</label>
                  <input style={s.input} required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} placeholder="seatek" />
                </div>
                <div>
                  <label style={s.label}>Plan</label>
                  <select
                    style={{ ...s.input, cursor: "pointer" }}
                    value={form.plan}
                    onChange={(e) => setForm({ ...form, plan: e.target.value as Plan, monthly_price: PLAN_PRICES[e.target.value as Plan] })}
                  >
                    <option value="pilot">Piloto — Gratis</option>
                    <option value="pro">Pro — S/ 599/mes</option>
                    <option value="enterprise">Enterprise — S/ 1,299/mes</option>
                  </select>
                </div>
                <div>
                  <label style={s.label}>Contacto</label>
                  <input style={s.input} value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="Juan Pérez" />
                </div>
                <div>
                  <label style={s.label}>Email</label>
                  <input style={s.input} type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="juan@empresa.com" />
                </div>
                <div>
                  <label style={s.label}>Contraseña *</label>
                  <input style={s.input} type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={s.label}>Logo de la empresa</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 10, flexShrink: 0,
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                    }}>
                      {logoPreview
                        ? <img src={logoPreview} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        : <span style={{ fontSize: 22 }}>🏗️</span>
                      }
                    </div>
                    <label style={{ ...s.label, margin: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ padding: "7px 14px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, fontSize: 13, color: "#d1d5db", cursor: "pointer" }}>
                        {logoFile ? logoFile.name : "Seleccionar imagen"}
                      </span>
                      <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: "none" }} />
                    </label>
                  </div>
                  <p style={{ color: "#4b5563", fontSize: 11, marginTop: 6 }}>PNG, JPG, SVG o WebP. Se mostrará en el login del cliente.</p>
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={s.label}>Notas internas</label>
                  <textarea style={{ ...s.input, resize: "vertical", minHeight: 70 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observaciones..." />
                </div>
              </div>

              {error && <p style={{ color: "#f87171", fontSize: 13, margin: "12px 0 0" }}>{error}</p>}

              <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ ...s.btn, background: "rgba(255,255,255,0.06)", color: "#9ca3af" }}>
                  Cancelar
                </button>
                <button type="submit" disabled={saving} style={{ ...s.btn, background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff" }}>
                  {saving ? "Guardando..." : "Crear cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
