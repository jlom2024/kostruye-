import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { ConfiguracionClient } from "./config-client";

export default async function ConfiguracionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) notFound();

  // Traer miembros del proyecto con sus perfiles
  const { data: members } = await supabase
    .from("project_members")
    .select("*, profiles:user_id(id, name, email)")
    .eq("project_id", id);

  // Traer todos los miembros de la organización para poder invitarlos
  const { data: orgMembers } = await supabase
    .from("organization_members")
    .select("*, profiles:user_id(id, name, email)")
    .eq("organization_id", project.organization_id);
  // Traer presupuestos para el monto de contrato
  const { data: budgets } = await supabase
    .from("budgets")
    .select("id, budget_type, total")
    .eq("project_id", id);

  const venta = budgets?.find((b) => b.budget_type === "venta");

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50">
      <Topbar 
        title="Configuración" 
        subtitle={`${project.code} · ${project.name}`} 
      />
      <ConfiguracionClient 
        project={project} 
        projectId={id} 
        members={members ?? []}
        orgMembers={orgMembers ?? []}
        venta={venta}
      />
    </div>
  );
}
