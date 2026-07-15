import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { HSEClient } from "./hse-client";

interface Props {
  params: {
    id: string;
  };
}

export default async function HSEPage({ params }: Props) {
  const supabase = await createClient();

  // Obtener el proyecto activo
  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", params.id)
    .single();

  if (!project) {
    return notFound();
  }

  // Cargar checklists de seguridad
  const { data: checklists } = await supabase
    .from("hse_checklists")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  // Cargar incidentes
  const { data: incidents } = await supabase
    .from("hse_incidents")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  return (
    <HSEClient 
      projectId={project.id}
      projectName={project.name}
      initialChecklists={checklists ?? []}
      initialIncidents={incidents ?? []}
    />
  );
}
