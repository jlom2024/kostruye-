import { Topbar } from "@/components/layout/topbar";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ContabilidadClient } from "./contabilidad-client";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("name, currency")
    .eq("id", id)
    .single();
  if (!project) notFound();

  const [
    { data: budgets }, 
    { data: pos }, 
    { data: vals },
    { data: payrollPeriods },
    { data: withdrawalCosts },
    { data: soAdvances },
  ] = await Promise.all([
    supabase.from("budgets").select("budget_type, total").eq("project_id", id),
    supabase.from("purchase_orders").select("status, total").eq("project_id", id),
    supabase
      .from("valorizaciones")
      .select("total_amount, status")
      .eq("project_id", id)
      .eq("status", "approved"),
    supabase
      .from("payroll_periods")
      .select("total_gross")
      .eq("project_id", id)
      .in("status", ["closed", "paid"]),
    supabase
      .from("project_material_cost")
      .select("costo_materiales")
      .eq("project_id", id)
      .maybeSingle(),
    supabase
      .from("project_service_cost")
      .select("costo_servicios")
      .eq("project_id", id)
      .maybeSingle(),
  ]);

  const ventaTotal     = budgets?.find(b => b.budget_type === "venta")?.total ?? 0;
  const metaTotal      = budgets?.find(b => b.budget_type === "meta")?.total  ?? 0;
  const poCommitted    = (pos ?? [])
    .filter(p => p.status !== "cancelled")
    .reduce((s, p) => s + Number(p.total ?? 0), 0);
  const valorizadoTotal = (vals ?? []).reduce((s, v) => s + Number(v.total_amount ?? 0), 0);

  const costoMO = (payrollPeriods ?? []).reduce((s, p) => s + Number(p.total_gross ?? 0), 0);
  
  const matCost = Number((withdrawalCosts as any)?.costo_materiales ?? 0);
  const usandoKardex = matCost > 0;
  const costoMateriales = usandoKardex
    ? matCost
    : (pos ?? []).filter((p) => p.status === "received").reduce((s, p) => s + Number(p.total ?? 0), 0);

  const costoServicios = Number((soAdvances as any)?.costo_servicios ?? 0);

  return (
    <>
      <Topbar title="Contabilidad" subtitle={project.name} />
      <ContabilidadClient
        projectId={id}
        currency={project.currency ?? "PEN"}
        ventaTotal={Number(ventaTotal)}
        metaTotal={Number(metaTotal)}
        poCommitted={poCommitted}
        valorizadoTotal={valorizadoTotal}
        costoMateriales={costoMateriales}
        costoMO={costoMO}
        costoServicios={costoServicios}
      />
    </>
  );
}
