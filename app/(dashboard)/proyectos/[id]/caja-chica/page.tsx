import { Topbar } from "@/components/layout/topbar";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CajaChicaClient } from "./caja-chica-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CajaChicaPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await (supabase.from("projects") as any)
    .select("id, name, currency")
    .eq("id", id)
    .single();

  if (!project) notFound();

  // Obtener los miembros del proyecto para asignar como responsables de caja
  const { data: members } = await (supabase.from("project_members") as any)
    .select(`
      user_id,
      role
    `)
    .eq("project_id", id);

  // Obtener perfiles de usuarios de la organización
  const { data: orgMembers } = await (supabase.from("organization_members") as any)
    .select("user_id, role");

  return (
    <>
      <Topbar title="Caja Chica" subtitle={project.name} />
      <CajaChicaClient
        projectId={id}
        currency={project.currency ?? "PEN"}
        members={members ?? []}
      />
    </>
  );
}
