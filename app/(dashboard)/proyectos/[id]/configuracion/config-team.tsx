"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, UserPlus, Trash2, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

export function ConfigTeam({ 
  projectId, 
  members, 
  orgMembers 
}: { 
  projectId: string; 
  members: any[]; 
  orgMembers: any[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  // Filtrar miembros de la organización que aún no están en el proyecto
  const availableUsers = orgMembers.filter(
    (om) => !members.some((pm) => pm.user_id === om.user_id)
  );

  const handleAddMember = async (userId: string) => {
    setLoading(true);
    const { error } = await supabase
      .from("project_members")
      .insert({
        project_id: projectId,
        user_id: userId,
        role: "field_engineer" // Rol por defecto
      });
    
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Miembro añadido al proyecto");
      router.refresh();
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("¿Seguro que quieres quitar a este miembro del proyecto?")) return;
    
    setLoading(true);
    const { error } = await supabase
      .from("project_members")
      .delete()
      .eq("id", memberId);
    
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Miembro quitado");
      router.refresh();
    }
  };

  const handleRoleChange = async (memberId: string, role: string) => {
    const { error } = await supabase
      .from("project_members")
      .update({ role })
      .eq("id", memberId);
    
    if (error) toast.error(error.message);
    else {
      toast.success("Rol actualizado");
      router.refresh();
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Lista de Miembros Actuales */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Equipo del Proyecto</h3>
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
                      <option value="project_manager">Director de Proyecto</option>
                      <option value="field_engineer">Residente / Ing. Campo</option>
                      <option value="purchasing">Logística / Compras</option>
                      <option value="warehouse">Almacenero</option>
                      <option value="hr">RRHH / Tareo</option>
                      <option value="readonly">Solo lectura</option>
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
      </section>

      {/* Agregar Miembros desde la Organización */}
      {availableUsers.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Añadir desde Organización</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-200 transition-colors group">
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
