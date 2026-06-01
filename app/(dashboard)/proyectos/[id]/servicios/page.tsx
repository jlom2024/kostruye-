import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { notFound } from "next/navigation";
import { ServiceOrdersClient } from "./service-orders-client";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("name, currency, organization_id")
    .eq("id", id)
    .single();
  if (!project) notFound();

  return (
    <>
      <Topbar title="Servicios" subtitle={project.name} />
      <ServiceOrdersClient
        projectId={id}
        currency={project.currency ?? "PEN"}
        organizationId={project.organization_id}
      />
    </>
  );
}
