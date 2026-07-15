import { Topbar } from "@/components/layout/topbar";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { AlmacenClient } from "./almacen-client";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: project } = await (supabase as any)
    .from("projects")
    .select("name, currency")
    .eq("id", id)
    .single();
  if (!project) notFound();

  return (
    <>
      <Topbar title="Almacén" subtitle={project.name} />
      <AlmacenClient projectId={id} currency={project.currency} />
    </>
  );
}
