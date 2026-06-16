"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { toast } from "sonner";
import { Loader2, Building2, Users, Copy, Check, UserPlus, Trash2, Shield, BookOpen, User, Key, FileText, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";

interface OrgData { id: string; name: string; ruc?: string }
interface Member {
  user_id: string;
  role: string;
  email: string;
  is_self: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  contador: "Contador",
  user: "Usuario",
};
const ROLE_COLORS: Record<string, string> = {
  admin: "bg-blue-50 text-blue-700",
  contador: "bg-purple-50 text-purple-700",
  user: "bg-slate-100 text-slate-600",
};
const ROLE_ICONS: Record<string, React.ElementType> = {
  admin: Shield,
  contador: BookOpen,
  user: User,
};

export default function ConfiguracionPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [org, setOrg] = useState<OrgData | null>(null);
  const [orgName, setOrgName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [myRole, setMyRole] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"org" | "members" | "sunat">("org");

  // SUNAT state
  const [sunatRuc, setSunatRuc] = useState("");
  const [solUsuario, setSolUsuario] = useState("");
  const [solClave, setSolClave] = useState("");
  const [sunatConfigurado, setSunatConfigurado] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [savingSunat, setSavingSunat] = useState(false);
  const [testingSunat, setTestingSunat] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "contador" | "user">("user");
  const [invitePassword, setInvitePassword] = useState(""); // nueva contraseña opcional
  const [inviting, setInviting] = useState(false);

  async function loadMembers() {
    const res = await fetch("/api/org/members");
    if (res.ok) {
      const { members: m, my_role } = await res.json();
      setMembers(m ?? []);
      setMyRole(my_role ?? "");
    }
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email ?? "");

      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      
      if (!membership) {
        setLoading(false);
        return;
      }
      setMyRole(membership.role);

      const { data: orgData } = await supabase
        .from("organizations")
        .select("id, name, ruc")
        .eq("id", membership.organization_id)
        .single();
      if (orgData) { setOrg(orgData); setOrgName(orgData.name); setSunatRuc(orgData.ruc ?? ""); }

      await loadMembers();

      // Load SUNAT status (credentials are encrypted in kreo-sunat, no reversal)
      const sunatRes = await fetch("/api/org/sunat-sol");
      if (sunatRes.ok) {
        const s = await sunatRes.json();
        setSunatConfigurado(s.sunat_configurado ?? false);
      }

      setLoading(false);
    }
    load();
  }, []);

  async function saveOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!org || !orgName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("organizations").update({ name: orgName.trim() }).eq("id", org.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Organización actualizada");
  }

  function copyId() {
    if (!org) return;
    navigator.clipboard.writeText(org.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const res = await fetch("/api/org/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        email: inviteEmail.trim(), 
        role: inviteRole,
        password: invitePassword.trim() || undefined
      }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(`${data.email} agregado como ${ROLE_LABELS[inviteRole]}`);
      setInviteEmail("");
      await loadMembers();
    } else {
      toast.error(data.error ?? "Error al invitar");
    }
    setInviting(false);
  }

  async function handleRoleChange(userId: string, role: string) {
    const res = await fetch("/api/org/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, role }),
    });
    if (res.ok) {
      toast.success("Rol actualizado");
      await loadMembers();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Error");
    }
  }

  async function handleRemove(member: Member) {
    if (!confirm(`¿Eliminar a ${member.email} de la organización?`)) return;
    const res = await fetch("/api/org/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: member.user_id }),
    });
    if (res.ok) {
      toast.success(`${member.email} eliminado`);
      setMembers((prev) => prev.filter((m) => m.user_id !== member.user_id));
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Error");
    }
  }

  async function handleChangeMemberPassword(member: Member) {
    const newPwd = prompt(`Introduce la nueva contraseña para ${member.email}:`);
    if (!newPwd) return;
    const res = await fetch("/api/org/members/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: member.user_id, new_password: newPwd.trim() }),
    });
    if (res.ok) {
      toast.success(`Contraseña de ${member.email} actualizada exitosamente`);
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Error al cambiar contraseña");
    }
  }

  async function saveSunat(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setSavingSunat(true);
    // 1. Guardar RUC en la org
    if (sunatRuc.trim()) {
      await supabase.from("organizations").update({ ruc: sunatRuc.trim() }).eq("id", org.id);
    }
    // 2. Enviar credenciales SOL cifradas a kreo-sunat
    const res = await fetch("/api/org/sunat-sol", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sol_usuario: solUsuario.trim().toUpperCase(), sol_clave: solClave.trim() }),
    });
    setSavingSunat(false);
    if (res.ok) {
      setSunatConfigurado(true);
      setSolClave("");
      toast.success("Credenciales SOL guardadas de forma segura");
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Error al guardar");
    }
  }

  async function testSunat() {
    setTestingSunat(true);
    const res = await fetch("/api/org/sunat/test", { method: "POST" });
    setTestingSunat(false);
    const d = await res.json();
    if (res.ok) toast.success(d.message ?? "Conexión verificada");
    else toast.error(d.error ?? "Error al verificar");
  }

  const isAdmin = myRole === "admin";

  if (loading) return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex flex-1 items-center justify-center bg-slate-50">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </main>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden bg-slate-50">
        <Topbar title="Configuración" subtitle="Cuenta y organización" />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-5">

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit flex-wrap">
              {([["org", Building2, "Organización"], ["members", Users, "Miembros"], ["sunat", FileText, "SUNAT"]] as const).map(([key, Icon, label]) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}>
                  <Icon className="h-4 w-4" />{label}
                  {key === "sunat" && sunatConfigurado && (
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 ml-0.5" />
                  )}
                </button>
              ))}
            </div>

            {tab === "org" && (
              <>
                {/* Mi cuenta */}
                <section className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Mi cuenta</h2>
                    </div>
                    <span className={`ml-auto text-xs font-semibold rounded-full px-2.5 py-0.5 ${ROLE_COLORS[myRole] ?? "bg-slate-100 text-slate-600"}`}>
                      {ROLE_LABELS[myRole] ?? myRole}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500">Correo electrónico</label>
                      <p className="mt-1 text-sm text-slate-900 font-medium">{userEmail}</p>
                    </div>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const oldPwd = (e.currentTarget.elements.namedItem('oldPassword') as HTMLInputElement).value;
                      const newPwd = (e.currentTarget.elements.namedItem('newPassword') as HTMLInputElement).value;
                      if (!newPwd) return toast.error('Nueva contraseña requerida');
                      setSaving(true);
                      const res = await fetch('/api/org/members/password', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd }),
                      });
                      setSaving(false);
                      if (res.ok) toast.success('Contraseña actualizada');
                      else {
                        const d = await res.json();
                        toast.error(d.error ?? 'Error al cambiar contraseña');
                      }
                    }} className="mt-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Contraseña actual (opcional)</label>
                        <input name="oldPassword" type="password" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="Opcional" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Nueva contraseña</label>
                        <input name="newPassword" type="password" required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                      </div>
                      <button type="submit" disabled={saving} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {saving ? 'Guardando...' : 'Cambiar contraseña'}
                      </button>
                    </form>
                  </div>
                </section>

                {/* Organización */}
                {isAdmin && (
                  <section className="rounded-xl border border-slate-200 bg-white p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
                        <Building2 className="h-4 w-4 text-amber-600" />
                      </div>
                      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Organización</h2>
                    </div>
                    <form onSubmit={saveOrg} className="space-y-4">
                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1.5">Nombre de la empresa</label>
                        <input value={orgName} onChange={(e) => setOrgName(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1.5">ID de organización</label>
                        <div className="flex gap-2">
                          <input readOnly value={org?.id ?? ""}
                            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-400 font-mono outline-none" />
                          <button type="button" onClick={copyId}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-slate-500 hover:bg-slate-50 transition-colors">
                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-end pt-1">
                        <button type="submit" disabled={saving}
                          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
                          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          Guardar cambios
                        </button>
                      </div>
                    </form>
                  </section>
                )}

                {/* Plan */}
                <section className="rounded-xl border border-slate-200 bg-white p-6">
                  <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Plan activo</h2>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-700">
                        ✦ Pro
                      </span>
                      <p className="text-xs text-slate-400 mt-2">Proyectos ilimitados · KIA incluido · Soporte prioritario</p>
                    </div>
                    <a href="mailto:kreoiastudioperu@gmail.com?subject=Upgrade%20Kostruye%2B"
                      className="text-xs text-blue-600 hover:underline">Cambiar plan →</a>
                  </div>
                </section>
              </>
            )}

            {tab === "sunat" && (
              <section className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100">
                    <FileText className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Facturación Electrónica SUNAT</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Credenciales SOL de tu empresa en KREO-SUNAT</p>
                  </div>
                  {sunatConfigurado ? (
                    <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
                      <CheckCircle2 className="h-3 w-3" />Configurado
                    </span>
                  ) : (
                    <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
                      <AlertCircle className="h-3 w-3" />Pendiente
                    </span>
                  )}
                </div>

                {!isAdmin ? (
                  <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center">
                    <p className="text-sm text-slate-500">Solo el administrador puede configurar las credenciales SUNAT.</p>
                  </div>
                ) : (
                  <form onSubmit={saveSunat} className="space-y-4">
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
                      Ingresa las credenciales SOL de tu empresa. Se guardan cifradas por organización y nunca se comparten. El RUC y Usuario SOL los encuentras en <strong>SUNAT SOL → Mi RUC y otros registros</strong>.
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1.5">RUC de la empresa</label>
                      <input
                        value={sunatRuc}
                        onChange={(e) => setSunatRuc(e.target.value)}
                        placeholder="20XXXXXXXXX"
                        maxLength={11}
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1.5">Usuario SOL <span className="text-slate-400 font-normal">(RUC + código de usuario, ej: 20601234567JLOM)</span></label>
                      <input
                        value={solUsuario}
                        onChange={(e) => setSolUsuario(e.target.value.toUpperCase())}
                        placeholder="20601234567USUARIO"
                        autoComplete="off"
                        required
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1.5">Clave SOL</label>
                      <div className="relative">
                        <input
                          type={showSecret ? "text" : "password"}
                          value={solClave}
                          onChange={(e) => setSolClave(e.target.value)}
                          placeholder="Clave SOL"
                          required
                          className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 pr-10 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors font-mono"
                        />
                        <button type="button" onClick={() => setShowSecret(!showSecret)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button type="submit" disabled={savingSunat}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
                        {savingSunat && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Guardar credenciales
                      </button>
                      <button type="button" onClick={testSunat} disabled={testingSunat || !sunatConfigurado}
                        className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-colors">
                        {testingSunat ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Verificar conexión
                      </button>
                    </div>
                  </form>
                )}
              </section>
            )}

            {tab === "members" && (
              <section className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100">
                      <Users className="h-4 w-4 text-purple-600" />
                    </div>
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Miembros del equipo</h2>
                  </div>
                  <span className="text-xs text-slate-400">{members.length} {members.length === 1 ? "miembro" : "miembros"}</span>
                </div>

                {/* Lista de miembros */}
                <div className="space-y-2 mb-5">
                  {members.map((m) => {
                    const RoleIcon = ROLE_ICONS[m.role] ?? User;
                    return (
                      <div key={m.user_id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600 shrink-0">
                            {m.email[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{m.email}</p>
                            {m.is_self && <p className="text-xs text-slate-400">Tú</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {isAdmin && !m.is_self ? (
                            <select
                              value={m.role}
                              onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                              className="text-xs font-semibold rounded-full px-2.5 py-0.5 border-0 outline-none cursor-pointer appearance-none pr-6 bg-no-repeat"
                              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b7280'/%3E%3C/svg%3E\")", backgroundPosition: "right 6px center", paddingRight: "22px" }}
                            >
                              <option value="admin">Administrador</option>
                              <option value="contador">Contador</option>
                              <option value="user">Usuario</option>
                            </select>
                          ) : (
                            <span className={`flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-0.5 ${ROLE_COLORS[m.role] ?? "bg-slate-100 text-slate-600"}`}>
                              <RoleIcon className="h-3 w-3" />
                              {ROLE_LABELS[m.role] ?? m.role}
                            </span>
                          )}
                          {isAdmin && !m.is_self && (
                            <>
                              <button onClick={() => handleChangeMemberPassword(m)}
                                className="p-1 rounded-md text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors" title="Cambiar contraseña">
                                <Key className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleRemove(m)}
                                className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Eliminar miembro">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Invite form — only admins */}
                {isAdmin ? (
                  <form onSubmit={handleInvite} className="rounded-lg border border-dashed border-slate-300 p-4 space-y-3">
                    <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                      <UserPlus className="h-3.5 w-3.5" />Agregar miembro
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="email" required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="correo@empresa.com"
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="Contraseña opcional"
                        value={invitePassword}
                        onChange={(e) => setInvitePassword(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as "admin" | "contador" | "user")}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                      >
                        <option value="user">Usuario</option>
                        <option value="contador">Contador</option>
                        <option value="admin">Administrador</option>
                      </select>
                      <button type="submit" disabled={inviting}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors shrink-0">
                        {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                        Agregar
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">Si el correo no tiene cuenta, se creará automáticamente con contraseña temporal <code className="font-mono bg-slate-100 px-1 rounded">***REDACTED***</code></p>
                  </form>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center">
                    <p className="text-sm text-slate-500">Para agregar o eliminar miembros, contacta al administrador de tu organización.</p>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
