"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, UserPlus, Trash2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

const ROLE_LABELS: Record<string, string> = {
  admin:           "Administrador",
  project_manager: "Director de Proyecto",
  field_engineer:  "Residente / Ing. Campo",
  purchasing:      "Logística / Compras",
  warehouse:       "Almacenero",
  hr:              "RRHH / Tareo",
  readonly:        "Solo lectura",
};

export function ConfigTeam({
  projectId,
  organizationId,
  members,
  orgMembers,
}: {
  projectId: string;
  organizationId: string;
  members: any[];
  orgMembers: any[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  // Invitación por email
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName]   = useState("");
  const [inviteRole, setInviteRole]   = useState("field_engineer");
  const [inviting, setInviting]       = useState(false);

  // Miembros de la org que aún no están en el proyecto
  const availableUsers = orgMembers.filter(
    (om) => !members.some((pm) => pm.user_id === om.user_id)
  );

  // ── Agregar desde org ──────────────────────────────────────────────────────

  async function handleAddMember(userId: string) {
    setLoading(true);
    const { error } = await supabase
      .from("project_members")
      .insert({ project_id: projectId, user_id: userId, role: "field_engineer" });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Miembro añadido al proyecto"); router.refresh(); }
  }

  // ── Cambiar rol ────────────────────────────────────────────────────────────

  async function handleRoleChange(memberId: string, role: string) {
    const { error } = await supabase
      .from("project_members")
      .update({ role })
      .eq("id", memberId);
    if (error) toast.error(error.message);
    else { toast.success("Rol actualizado"); router.refresh(); }
  }

  // ── Quitar miembro ─────────────────────────────────────────────────────────

  async function handleRemoveMember(memberId: string) {
    if (!confirm("¿Seguro que quieres quitar a este miembro del proyecto?")) return;
    setLoading(true);
    const { error } = await supabase
      .from("project_members")
      .delete()
      .eq("id", memberId);
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Miembro quitado"); router.refresh(); }
  }

  // ── Invitar por email ──────────────────────────────────────────────────────

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name:  inviteName.trim(),
          role:  inviteRole,
          projectId,
          organizationId,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Error al invitar"); return; }
      toast.success(json.message);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("field_engineer");
      router.refresh();
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="space-y-10 max-w-4xl">

      {/* ── Miembros actuales ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
          Equipo del Proyecto
        </h3>

        {members.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Sin miembros todavía. Invita a alguien abajo.</p>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                <tr>
                  <th className="px-6 py-3">Usuario</th>
                  <th className="px-6 py-3">Rol en Proyecto</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{m.profiles?.name || "Sin nombre"}</div>
                      <div className="text-xs text-slate-500">{m.profiles?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.id, e.target.value)}
                        className="bg-transparent border-none text-slate-600 focus:ring-0 cursor-pointer hover:text-blue-600 transition-colors"
                      >
                        {Object.entries(ROLE_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Invitar por email (usuario nuevo) ────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Mail className="h-4 w-4" /> Invitar por email
        </h3>
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Email *</label>
              <input
                type="email"
                required
                placeholder="juan@empresa.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Nombre completo</label>
              <input
                type="text"
                placeholder="Juan Pérez"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Rol en el proyecto</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(ROLE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={inviting || !inviteEmail.trim()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold px-5 py-2 rounded-lg transition-colors w-full justify-center"
              >
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {inviting ? "Invitando..." : "Enviar invitación"}
              </button>
            </div>
          </form>
          <p className="text-xs text-slate-400 mt-3">
            Si el usuario ya tiene cuenta en Kostruye+, se agrega directamente. Si no, recibirá un email para crear su contraseña.
          </p>
        </div>
      </section>

      {/* ── Agregar desde la organización (si hay disponibles) ───────────── */}
      {availableUsers.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
            Añadir desde Organización
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-200 transition-colors">
                <div>
                  <div className="font-medium text-slate-900">{u.profiles?.name}</div>
                  <div className="text-xs text-slate-500">{u.profiles?.email}</div>
                </div>
                <button
                  disabled={loading}
                  onClick={() => handleAddMember(u.user_id)}
                  className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                  Añadir
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
