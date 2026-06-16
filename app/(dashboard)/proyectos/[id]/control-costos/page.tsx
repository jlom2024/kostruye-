import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { notFound } from "next/navigation";
import { ControlCostosClient } from "./control-costos-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ControlCostosPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("name, currency")
    .eq("id", id)
    .single();
  if (!project) notFound();

  // Presupuesto venta = partidas de control
  const { data: ventaBudget } = await supabase
    .from("budgets")
    .select("id")
    .eq("project_id", id)
    .eq("budget_type", "venta")
    .maybeSingle();

  const budgetId = (ventaBudget as { id: string } | null)?.id ?? null;

  const [{ data: chapters }, { data: items }, { data: withdrawals }] = await Promise.all([
    budgetId
      ? supabase.from("budget_chapters").select("id, code, name, sort_order").eq("budget_id", budgetId).order("sort_order")
      : Promise.resolve({ data: [] }),
    budgetId
      ? supabase.from("budget_items").select("id, item_code, description, unit, quantity, unit_price, total, chapter_id, sort_order").eq("budget_id", budgetId).order("sort_order")
      : Promise.resolve({ data: [] }),
    supabase.from("stock_withdrawals").select("budget_item_id, total_cost").eq("project_id", id),
  ]);

  // Agregar consumo real (materiales/Kardex) por partida
  const realByItem: Record<string, number> = {};
  for (const w of (withdrawals ?? []) as { budget_item_id: string | null; total_cost: number | null }[]) {
    if (!w.budget_item_id) continue;
    realByItem[w.budget_item_id] = (realByItem[w.budget_item_id] ?? 0) + Number(w.total_cost ?? 0);
  }

  return (
    <>
      <Topbar title="Control de Costos" subtitle={project.name} />
      <ControlCostosClient
        currency={project.currency}
        chapters={(chapters ?? []) as never[]}
        items={(items ?? []) as never[]}
        realByItem={realByItem}
        hasBudget={!!budgetId}
      />
    </>
  );
}
