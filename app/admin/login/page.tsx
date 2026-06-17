"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    fetch("/api/admin/auth")
      .then(res => {
        if (res.ok) router.push("/admin");
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      router.push("/admin");
    } else {
      const data = await res.json();
      setError(data.error ?? "Error al iniciar sesión");
    }
    setLoading(false);
  }

  const inputStyle = { width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" as const };
  
  if (checking) return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#fff" }}>Verificando sesión...</div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 500, background: "radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: 380, padding: "40px 36px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, backdropFilter: "blur(10px)", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <svg width="52" height="52" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="7" fill="#0F172A"/>
              <rect x="4" y="2" width="7" height="28" rx="1" fill="#F59E0B"/>
              <line x1="4" y1="10" x2="11" y2="10" stroke="#0F172A" strokeWidth="0.9" opacity="0.35"/>
              <line x1="4" y1="17" x2="11" y2="17" stroke="#0F172A" strokeWidth="0.9" opacity="0.35"/>
              <line x1="4" y1="24" x2="11" y2="24" stroke="#0F172A" strokeWidth="0.9" opacity="0.35"/>
              <line x1="4" y1="10" x2="11" y2="2"  stroke="#0F172A" strokeWidth="0.6" opacity="0.2"/>
              <line x1="4" y1="2"  x2="11" y2="10" stroke="#0F172A" strokeWidth="0.6" opacity="0.2"/>
              <line x1="4" y1="17" x2="11" y2="10" stroke="#0F172A" strokeWidth="0.6" opacity="0.2"/>
              <line x1="4" y1="10" x2="11" y2="17" stroke="#0F172A" strokeWidth="0.6" opacity="0.2"/>
              <line x1="4" y1="24" x2="11" y2="17" stroke="#0F172A" strokeWidth="0.6" opacity="0.2"/>
              <line x1="4" y1="17" x2="11" y2="24" stroke="#0F172A" strokeWidth="0.6" opacity="0.2"/>
              <rect x="3" y="1" width="9" height="4" rx="1.5" fill="#B45309"/>
              <polygon points="11,13 11,17 29,5 29,3" fill="#F59E0B"/>
              <line x1="7.5" y1="2" x2="29" y2="4" stroke="#B45309" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="23" y1="10" x2="23" y2="15" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round"/>
              <rect x="21" y="15" width="5" height="2.5" rx="0.8" fill="#9CA3AF"/>
              <path d="M21.5,17.5 C21.5,20.5 24.5,20.5 24.5,17.5" stroke="#9CA3AF" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
              <polygon points="11,17 11,21 26,30 26,28" fill="#F59E0B"/>
              <rect x="3" y="30" width="9" height="2" rx="1" fill="#B45309"/>
            </svg>
          </div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>Kostruye+ Admin</h1>
          <p style={{ color: "#6b7280", fontSize: 14, margin: "8px 0 0" }}>Panel de control privado</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: "#9ca3af", fontSize: 13, display: "block", marginBottom: 6 }}>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: "#9ca3af", fontSize: 13, display: "block", marginBottom: 6 }}>Contraseña</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                style={{ ...inputStyle, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center", padding: 0 }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "11px", background: loading ? "#374151" : "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Verificando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
