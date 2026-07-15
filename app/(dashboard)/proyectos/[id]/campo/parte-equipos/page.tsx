import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ParteEquiposClient } from "./parte-equipos-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ParteEquiposPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: project },
    { data: equipments },
    { data: activeBudget }
  ] = await Promise.all([
    supabase.from("projects").select("id, name, organization_id").eq("id", id).single(),
    supabase.from("equipments").select("id, code, name, type, status").eq("project_id", id).eq("status", "activo").order("name"),
    supabase.from("budgets").select("id").eq("project_id", id).eq("is_active", true).single()
  ]);

  if (!project) notFound();

  let budgetItems: any[] = [];
  if (activeBudget) {
    const { data: items } = await supabase
      .from("budget_items")
      .select("id, item_code, description")
      .eq("budget_id", activeBudget.id)
      .order("item_code");
    
    if (items) budgetItems = items;
  }

  return (
    <div className="p-6">
      <ParteEquiposClient 
        projectId={id} 
        equipments={equipments || []} 
        budgetItems={budgetItems} 
      />
    </div>
  );
}
