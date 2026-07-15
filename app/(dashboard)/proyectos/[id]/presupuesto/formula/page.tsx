import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { FormulaClient } from "./formula-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FormulaPolinomicaPage({ params }: Props) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const supabase = await createClient();

  // Verificar el proyecto
  const { data: project, error: pErr } = await supabase
    .from("projects")
    .select("*, budgets(id, total)")
    .eq("id", id)
    .single();

  if (pErr || !project) {
    notFound();
  }

  // Obtener fórmulas polinómicas del proyecto
  // Suponiendo que la tabla es reajuste_formulas vinculada al proyecto o al presupuesto principal
  const budgetId = project.budgets?.[0]?.id;

  const { data: formulas, error: fErr } = await supabase
    .from("reajuste_formulas")
    .select("*, reajuste_monomios(*)")
    .eq("project_id", id);

  if (fErr) {
    console.error("Error cargando fórmulas:", fErr);
  }

  // Traer lista de índices únicos para el selector (para no traer todos los historicos, solo los codigos y nombres)
  // Como inei_indices tiene registros por cada mes, agrupamos o hacemos un distinct
  const { data: ineiDict, error: iErr } = await supabase
    .from("inei_indices")
    .select("index_code, index_name");
  
  // Dedup in memory
  const uniqueIndices = Array.from(
    new Map((ineiDict || []).map((item) => [item.index_code, item])).values()
  ).sort((a, b) => parseInt(a.index_code) - parseInt(b.index_code));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fórmula Polinómica</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona las fórmulas polinómicas y monomios para el reajuste de valorizaciones.
        </p>
      </div>

      <FormulaClient 
        projectId={id} 
        budgetId={budgetId}
        initialFormulas={formulas || []} 
        ineiDict={uniqueIndices}
      />
    </div>
  );
}
