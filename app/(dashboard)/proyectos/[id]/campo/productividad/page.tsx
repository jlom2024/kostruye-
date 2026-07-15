import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { KpiClient } from "./kpi-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductividadPage({ params }: Props) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const supabase = await createClient();

  // Verificar el proyecto
  const { data, error: pErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  const project: any = data;

  if (pErr || !project) {
    notFound();
  }

  // Cargar datos de productividad de la vista SQL
  // Solo consideramos items de este proyecto que tengan avance, horas o maquinaria registradas, o si queremos mostrar todos.
  // Vamos a mostrar todos los del proyecto.
  const { data: kpis, error: kpiErr } = await supabase
    .from("vw_productivity_kpi")
    .select("*")
    .eq("project_id", id)
    .order("item_code", { ascending: true });

  if (kpiErr) {
    console.error("Error cargando KPIs de productividad:", kpiErr);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Productividad</h1>
        <p className="text-muted-foreground mt-2">
          Rendimiento real (HH/HM) vs Teórico por partida del proyecto.
        </p>
      </div>

      <KpiClient 
        projectId={id} 
        projectName={project.name} 
        kpis={kpis || []} 
      />
    </div>
  );
}
