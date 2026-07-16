import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { notFound } from "next/navigation";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // ── Proyecto ────────────────────────────────────────────────────────────────
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (!project) notFound();

  // ── Presupuestos ────────────────────────────────────────────────────────────
  const { data: budgets } = await supabase
    .from("budgets")
    .select("*")
    .eq("project_id", id);

  const ventaBudget = budgets?.find((b) => b.budget_type === "venta");
  const metaBudget  = budgets?.find((b) => b.budget_type === "meta");

  // ── Capítulos + OCs + Valorizaciones + Nóminas + Costos reales en paralelo ──
  const [
    { data: chapters },
    { data: pos },
    { data: items },
    { data: vals },
    { data: payrollPeriods },
    { data: withdrawalCosts },
    { data: soAdvances },
    { data: incidents },
    { data: fideicomisoRequests },
    { data: checklists },
  ] = await Promise.all([
    ventaBudget
      ? supabase
          .from("budget_chapters")
          .select("id, code, name, total")
          .eq("budget_id", ventaBudget.id)
          .order("sort_order")
      : Promise.resolve({ data: [] }),
    supabase
      .from("purchase_orders")
      .select("id, status, total, po_number, issue_date, created_at, suppliers(name)")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    ventaBudget
      ? supabase
          .from("budget_items")
          .select("id, total")
          .eq("budget_id", ventaBudget.id)
      : Promise.resolve({ data: [] }),
    supabase
      .from("valorizaciones")
      .select("id, val_number, period_name, end_date, status, total_amount")
      .eq("project_id", id)
      .in("status", ["approved", "submitted"])
      .order("end_date", { ascending: true }),
    supabase
      .from("payroll_periods")
      .select("total_gross")
      .eq("project_id", id)
      .in("status", ["closed", "paid"]),
    // ── RO Real: costo materiales (vista) ───────────────────────────────────────
    supabase
      .from("project_material_cost")
      .select("costo_materiales")
      .eq("project_id", id)
      .maybeSingle(),
    // ── RO Real: costo servicios (vista) ────────────────────────────────────────
    supabase
      .from("project_service_cost")
      .select("costo_servicios")
      .eq("project_id", id)
      .maybeSingle(),
    // ── HSE Incidents ──────────────────────────────────────────────────────────
    (supabase.from("hse_incidents") as any)
      .select("id, severity, status, description, location, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    // ── Fideicomiso Requests ───────────────────────────────────────────────────
    (supabase.from("fideicomiso_requests") as any)
      .select("id, status, total_amount, request_number")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    // ── HSE Checklists ─────────────────────────────────────────────────────────
    (supabase.from("hse_checklists") as any)
      .select("id")
      .eq("project_id", id),
  ]);

  // ── Cálculos de plazo ───────────────────────────────────────────────────────
  const today      = new Date();
  const startDate  = project.start_date ? new Date(project.start_date + "T00:00:00") : null;
  const endDate    = project.end_date   ? new Date(project.end_date   + "T00:00:00") : null;
  const totalDays  = startDate && endDate
    ? Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000)
    : null;
  const daysElapsed = startDate
    ? Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / 86400000))
    : null;
  const daysRemaining = endDate
    ? Math.ceil((endDate.getTime() - today.getTime()) / 86400000)
    : null;
  const plazoPercent = totalDays && daysElapsed !== null
    ? Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)))
    : null;

  // ── Cálculos de presupuesto ─────────────────────────────────────────────────
  const computedTotal = (items ?? []).reduce((s, i) => s + Number(i.total ?? 0), 0);
  const poCommitted   = (pos ?? [])
    .filter((p) => p.status !== "cancelled")
    .reduce((s, p) => s + Number(p.total ?? 0), 0);

  // ── Resultado Operativo REAL ────────────────────────────────────────────────
  const costoMO = (payrollPeriods ?? [])
    .reduce((s, p) => s + Number(p.total_gross ?? 0), 0);

  // Costo real materiales (desde la vista de la migración 009)
  const matCost = Number(withdrawalCosts?.costo_materiales ?? 0);
  const usandoKardex = matCost > 0;
  
  const costoMateriales = usandoKardex
    ? matCost
    : (pos ?? [])
        .filter((p) => p.status === "received")
        .reduce((s, p) => s + Number(p.total ?? 0), 0);

  // Costo real servicios (desde la vista de la migración 009)
  const costoServicios = Number(soAdvances?.costo_servicios ?? 0);

  // Alias para compatibilidad con el componente visual
  const costoOCsReceived = costoMateriales;

  // ── OC timeline para Curva S comprometida (sin canceladas, con fecha) ───────
  const ocTimeline = (pos ?? [])
    .filter((p) => p.status !== "cancelled")
    .map((p) => ({
      date: (p.issue_date ?? (p.created_at as string).slice(0, 10)) as string,
      amount: Number(p.total ?? 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <Topbar
        title={project.name}
        subtitle={`${project.code}${project.client ? ` · ${project.client}` : ""}${project.location ? ` · ${project.location}` : ""}`}
      />
      <DashboardClient
        project={project}
        ventaTotal={ventaBudget?.total ?? 0}
        metaTotal={metaBudget?.total ?? 0}
        computedTotal={computedTotal}
        chapters={chapters ?? []}
        pos={pos ?? []}
        poCommitted={poCommitted}
        itemCount={(items ?? []).length}
        plazo={{ totalDays, daysElapsed, daysRemaining, plazoPercent }}
        valorizaciones={vals ?? []}
        costoMO={costoMO}
        costoOCsReceived={costoOCsReceived}
        costoServicios={costoServicios}
        ocTimeline={ocTimeline}
        usandoKardex={usandoKardex}
        incidents={incidents ?? []}
        fideicomisoRequests={fideicomisoRequests ?? []}
        checklists={checklists ?? []}
      />
    </>
  );
}
