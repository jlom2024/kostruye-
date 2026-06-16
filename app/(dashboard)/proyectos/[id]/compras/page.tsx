import { Topbar } from "@/components/layout/topbar";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PurchaseOrdersClient } from "./purchase-orders-client";
import { userCanProject } from "@/lib/permissions";

export default async function ComprasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("name, currency, organization_id")
    .eq("id", id)
    .single();

  if (!project) notFound();

  // Permiso para aprobar/emitir órdenes — project-aware (misma base que la RLS)
  const canApprove = await userCanProject(supabase, id, "compras", "approve");

  return (
    <>
      <Topbar title="Compras" subtitle={project.name} />
      <PurchaseOrdersClient
        projectId={id}
        currency={project.currency}
        organizationId={project.organization_id}
        canApprove={canApprove}
      />
    </>
  );
}
