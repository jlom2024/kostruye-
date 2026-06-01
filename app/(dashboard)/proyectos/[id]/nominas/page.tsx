import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { notFound } from "next/navigation";
import { NominasClient } from "./nominas-client";

export default async function NominasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("name, currency")
    .eq("id", id)
    .single();

  if (!project) notFound();

  return (
    <>
      <Topbar title="Nóminas" subtitle={project.name} />
      <NominasClient projectId={id} currency={project.currency} />
    </>
  );
}
