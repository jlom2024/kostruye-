"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Trash2, Save } from "lucide-react";
import { useRouter } from "next/navigation";

export function ConfigParams({ 
  projectId, 
  project,
  venta: initialVenta 
}: { 
  projectId: string; 
  project: any;
  venta: any;
}) {
  const router = useRouter();
  const supabase = createClient() as any;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [venta, setVenta] = useState(initialVenta);
  const [montoInput, setMontoInput] = useState(
    initialVenta?.total 
      ? initialVenta.total.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) 
      : ""
  );

  const handleSaveMonto = async () => {
    setSaving(true);
    const total = parseFloat(montoInput.replace(/,/g, "")) || 0;
    
    if (venta) {
      const { error } = await supabase
        .from("budgets")
        .update({ total })
        .eq("id", venta.id);
      
      if (!error) {
        setVenta({ ...venta, total });
        toast.success("Monto actualizado");
        router.refresh();
      } else toast.error(error.message);
    } else {
      const { data, error } = await supabase.from("budgets").insert([
        { project_id: projectId, budget_type: "venta", name: `Presupuesto Venta`, currency: project.currency, total },
        { project_id: projectId, budget_type: "meta",  name: `Presupuesto Meta`,  currency: project.currency, total: 0 },
      ]).select();
      
      if (!error && data) {
        const v = data.find((b: any) => b.budget_type === "venta");
        if (v) setVenta({ id: v.id, total: v.total });
        toast.success("Presupuesto creado y monto guardado");
        router.refresh();
      } else if (error) toast.error(error.message);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (confirm !== project.name) return;
    setDeleting(true);
    
    // Aquí llamaríamos a un API route para el borrado en cascada
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    setDeleting(false);
    
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Error al eliminar" }));
      toast.error(error ?? "Error al eliminar");
    } else {
      toast.success("Proyecto eliminado permanentemente");
      router.push("/proyectos");
    }
  };

  const inp = "w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors bg-white";

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Monto de Contrato */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Monto de Contrato</h3>
        <p className="text-xs text-slate-500">Este es el presupuesto venta total que se usará para el cálculo del margen operativo (RO).</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              {project.currency === "PEN" ? "S/" : "$"}
            </span>
            <input
              type="text"
              value={montoInput}
              onChange={(e) => setMontoInput(e.target.value.replace(/[^0-9.]/g, ""))}
              onBlur={() => {
                const num = parseFloat(montoInput.replace(/,/g, "")) || 0;
                setMontoInput(num ? num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : "");
              }}
              className={inp + " pl-9"}
              placeholder="0.00"
            />
          </div>
          <button
            onClick={handleSaveMonto}
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </button>
        </div>
      </section>

      {/* Zona de Peligro */}
      <section className="bg-white border border-red-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-4 w-4" />
          <h3 className="text-sm font-semibold uppercase tracking-wider">Zona de Peligro</h3>
        </div>
        <p className="text-sm text-slate-600">
          Eliminar el proyecto borra permanentemente todas sus partidas, APUs, compras, valorizaciones y nóminas.
          Esta acción <strong>no se puede deshacer</strong>.
        </p>
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">
            Escribe <span className="font-mono font-bold">{project.name}</span> para confirmar:
          </label>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={project.name}
            className="w-full rounded-lg border border-red-300 px-3.5 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
          />
        </div>
        <button
          onClick={handleDelete}
          disabled={confirm !== project.name || deleting}
          className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40 transition-colors flex items-center gap-2"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Eliminar Proyecto
        </button>
      </section>
    </div>
  );
}
