import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { EquiposClient } from "./equipos-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EquiposPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, organization_id")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const { data: equipments } = await supabase
    .from("equipments")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="p-6">
      <EquiposClient projectId={id} initialEquipments={equipments || []} />
    </div>
  );
}
