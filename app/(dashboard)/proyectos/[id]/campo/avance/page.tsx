import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { AvanceClient } from "./avance-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AvancePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: project },
    { data: activeBudget }
  ] = await Promise.all([
    (supabase.from("projects") as any).select("id, name, organization_id").eq("id", id).single(),
    (supabase.from("budgets") as any).select("id").eq("project_id", id).eq("budget_type", "venta").eq("is_active", true).single()
  ]);

  if (!project) notFound();

  let budgetItems: any[] = [];
  if (activeBudget) {
    const { data: items } = await (supabase
      .from("budget_items") as any)
      .select("id, item_code, description, unit, quantity")
      .eq("budget_id", activeBudget.id)
      .order("item_code");
    
    if (items) budgetItems = items;
  }

  return (
    <div className="p-6">
      <AvanceClient 
        projectId={id} 
        budgetItems={budgetItems} 
      />
    </div>
  );
}
