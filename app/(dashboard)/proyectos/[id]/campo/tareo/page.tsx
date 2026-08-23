import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { TareoClient } from "./tareo-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TareoPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: project },
    { data: workers },
    { data: activeBudget }
  ] = await Promise.all([
    supabase.from("projects").select("id, name, organization_id").eq("id", id).single(),
    supabase.from("workers").select("id, full_name, category").eq("project_id", id).eq("is_active", true).order("full_name"),
    supabase.from("budgets").select("id").eq("project_id", id).eq("budget_type", "venta").eq("is_active", true).single()
  ]);

  if (!project) notFound();

  // Traer las partidas del presupuesto activo para asignación
  let budgetItems: any[] = [];
  if (activeBudget) {
    const { data: items } = await supabase
      .from("budget_items")
      .select("id, item_code, description")
      .eq("budget_id", activeBudget.id)
      .order("item_code");
    
    if (items) budgetItems = items;
  }

  // Permisos: todos los auth (admin/user) pueden acceder al tareo por ahora.
  // Podríamos refinar la RLS.

  return (
    <div className="p-6">
      <TareoClient 
        projectId={id} 
        workers={workers || []} 
        budgetItems={budgetItems} 
      />
    </div>
  );
}
