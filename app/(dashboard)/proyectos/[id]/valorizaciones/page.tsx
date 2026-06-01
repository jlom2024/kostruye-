import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { notFound } from "next/navigation";
import { ValorizacionesClient } from "./valorizaciones-client";

export default async function ValorizacionesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("name, currency")
    .eq("id", id)
    .single();

  if (!project) notFound();

  // Presupuesto venta (para total del contrato)
  const { data: budget } = await supabase
    .from("budgets")
    .select("id, total")
    .eq("project_id", id)
    .eq("budget_type", "venta")
    .single();

  // Valorizaciones (sólo cabeceras, los ítems se cargan on-demand)
  const { data: valorizaciones } = await supabase
    .from("valorizaciones")
    .select("*")
    .eq("project_id", id)
    .order("val_number", { ascending: true });

  return (
    <>
      <Topbar title="Valorizaciones" subtitle={project.name} />
      <ValorizacionesClient
        projectId={id}
        currency={project.currency}
        budgetId={budget?.id ?? null}
        ventaTotal={budget?.total ?? 0}
        initialValorizaciones={valorizaciones ?? []}
      />
    </>
  );
}
