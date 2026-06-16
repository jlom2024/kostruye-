import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { notFound } from "next/navigation";
import { ValorizacionesClient } from "./valorizaciones-client";
import { ReajustePanel } from "@/components/reajuste/reajuste-panel";
import { userCanProject } from "@/lib/permissions";

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

  // Permiso para aprobar valorizaciones — project-aware (misma base que la RLS)
  const canApprove = await userCanProject(supabase, id, "valorizaciones", "approve");
  // Editar fórmulas de reajuste usa el permiso del módulo valorizaciones
  const canEditReajuste = await userCanProject(supabase, id, "valorizaciones", "edit");

  // Índices INEI disponibles (catálogo distinto por código)
  const { data: ineiRaw } = await supabase
    .from("inei_indices")
    .select("index_code, index_name")
    .order("index_code");
  const ineiIndices = Array.from(
    new Map((ineiRaw ?? []).map((i) => [i.index_code, i])).values()
  );

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

  // Fórmulas polinómicas del proyecto (para reajuste por factor K)
  const { data: formulas } = await supabase
    .from("reajuste_formulas")
    .select("id, name, contract_date")
    .eq("project_id", id)
    .order("created_at");

  return (
    <>
      <Topbar title="Valorizaciones" subtitle={project.name} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="px-6 pt-5">
          <ReajustePanel
            projectId={id}
            budgetId={budget?.id ?? null}
            ineiIndices={ineiIndices as { index_code: string; index_name: string }[]}
            canEdit={canEditReajuste}
          />
        </div>
        <ValorizacionesClient
          projectId={id}
          currency={project.currency}
          budgetId={budget?.id ?? null}
          ventaTotal={budget?.total ?? 0}
          initialValorizaciones={valorizaciones ?? []}
          canApprove={canApprove}
          formulas={(formulas ?? []) as { id: string; name: string; contract_date: string | null }[]}
        />
      </div>
    </>
  );
}
