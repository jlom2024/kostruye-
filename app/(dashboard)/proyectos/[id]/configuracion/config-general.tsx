"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function ConfigGeneral({ project, projectId }: { project: any; projectId: string }) {
  const router = useRouter();
  const supabase = createClient() as any;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: project.code,
    name: project.name,
    client: project.client ?? "",
    location: project.location ?? "",
    currency: project.currency,
    status: project.status,
    start_date: project.start_date ?? "",
    end_date: project.end_date ?? "",
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("projects")
      .update({
        code: form.code.toUpperCase(),
        name: form.name,
        client: form.client || null,
        location: form.location || null,
        currency: form.currency,
        status: form.status,
        start_date: form.start_date || null,
        end_date: form.end_date || null
      })
      .eq("id", projectId);
    
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Proyecto actualizado");
      router.refresh();
    }
  };

  const inp = "w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors";

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Código</label>
          <input value={form.code} onChange={e => setForm({...form, code: e.target.value})} className={inp} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Estado</label>
          <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={inp}>
            <option value="active">Activo</option>
            <option value="paused">Pausado</option>
            <option value="closed">Cerrado</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">Nombre del Proyecto</label>
        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inp} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Cliente</label>
          <input value={form.client} onChange={e => setForm({...form, client: e.target.value})} className={inp} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Ubicación</label>
          <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} className={inp} />
        </div>
      </div>

      <div className="flex justify-end">
        <button disabled={saving} type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar Cambios
        </button>
      </div>
    </form>
  );
}
