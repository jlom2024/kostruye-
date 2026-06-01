import { Topbar } from "@/components/layout/topbar";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { LeanClient } from "./lean-client";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", id)
    .single();
  if (!project) notFound();

  return (
    <>
      <Topbar title="Lean Construction" subtitle={project.name} />
      <LeanClient projectId={id} />
    </>
  );
}
