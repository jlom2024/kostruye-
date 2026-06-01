import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function TenantPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { tenant } = await params;
  const { error: authError } = await searchParams;

  const sb = serviceClient();
  const { data: client } = await sb
    .from("app_clients")
    .select("id, name, slug, active, logo_url")
    .eq("slug", tenant)
    .single();

  if (!client || !client.active) {
    redirect("/");
  }

  return (
    <>
      <style>{`
        body { background: #0a0f1e; margin: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tenant-card { animation: fadeUp 0.6s ease forwards; }
        .tenant-input:focus { border-color: #f59e0b !important; outline: none; }
        .tenant-btn:hover { opacity: 0.9; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
        position: "relative",
        overflow: "hidden",
        padding: "24px",
      }}>
        {/* Background glow */}
        <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(245,158,11,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "fixed", bottom: -200, left: "50%", transform: "translateX(-50%)", width: 600, height: 600, background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div className="tenant-card" style={{
          width: "100%", maxWidth: 420, padding: "48px 40px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          backdropFilter: "blur(20px)",
          position: "relative",
          zIndex: 1,
        }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 16,
              background: client.logo_url ? "#fff" : "linear-gradient(135deg, #f59e0b, #d97706)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px", fontSize: 28,
              boxShadow: "0 8px 32px rgba(245,158,11,0.3)",
              overflow: "hidden", padding: client.logo_url ? 6 : 0,
            }}>
              {client.logo_url
                ? <img src={client.logo_url} alt={client.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                : "🏗️"
              }
            </div>
            <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
              {client.name}
            </h1>
            <p style={{ color: "#6b7280", fontSize: 14 }}>
              Plataforma de gestión de obras
            </p>
          </div>

          {/* Login form */}
          <form action={`/${tenant}/auth`} method="POST">
            <div style={{ marginBottom: 14 }}>
              <label style={{ color: "#9ca3af", fontSize: 13, display: "block", marginBottom: 6 }}>
                Correo electrónico
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="tu@empresa.com"
                className="tenant-input"
                style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, color: "#fff", fontSize: 15, transition: "border-color 0.2s", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ color: "#9ca3af", fontSize: 13, display: "block", marginBottom: 6 }}>
                Contraseña
              </label>
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="tenant-input"
                style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, color: "#fff", fontSize: 15, transition: "border-color 0.2s", boxSizing: "border-box" }}
              />
            </div>
            {authError && (
              <p style={{ color: "#f87171", fontSize: 13, textAlign: "center", marginBottom: 14, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "8px 12px" }}>
                Correo o contraseña incorrectos
              </p>
            )}
            <button
              type="submit"
              className="tenant-btn"
              style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 9, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 20px rgba(245,158,11,0.35)" }}
            >
              Ingresar al sistema
            </button>
          </form>

          <p style={{ textAlign: "center", color: "#374151", fontSize: 12, marginTop: 28 }}>
            Powered by <a href="/" style={{ color: "#6b7280", textDecoration: "none" }}>Kostruye+</a>
          </p>
        </div>
      </div>
    </>
  );
}
