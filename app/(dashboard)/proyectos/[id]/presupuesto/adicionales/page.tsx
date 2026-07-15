import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { AdicionalesClient } from "./adicionales-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdicionalesPage({ params }: Props) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const supabase = await createClient();

  const { data: project, error: pErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (pErr || !project) {
    notFound();
  }

  const { data: changeOrders, error: cErr } = await supabase
    .from("change_orders")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  if (cErr) {
    console.error("Error cargando órdenes de cambio:", cErr);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Control de Cambios</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona los adicionales, deductivos y ampliaciones de plazo del proyecto.
        </p>
      </div>

      <AdicionalesClient 
        projectId={id} 
        initialOrders={changeOrders || []} 
      />
    </div>
  );
}
