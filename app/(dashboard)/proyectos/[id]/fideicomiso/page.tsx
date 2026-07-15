import { Topbar } from "@/components/layout/topbar";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { FideicomisoClient } from "./fideicomiso-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FideicomisoPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) notFound();

  // Traer las valorizaciones aprobadas del proyecto
  const { data: valorizaciones } = await supabase
    .from("valorizaciones")
    .select("id, val_number, period_name, total_amount")
    .eq("project_id", id)
    .eq("status", "approved")
    .order("val_number", { ascending: false });

  // Traer compras y facturas listas para liberar
  const { data: invoices } = await supabase
    .from("electronic_invoices")
    .select("id, numero_formateado, receptor_razon_social, total, moneda, fecha_emision")
    .eq("project_id", id)
    .eq("estado_sunat", "aceptado")
    .order("created_at", { ascending: false });

  // Traer las planillas cerradas listas para liberar
  const { data: payrolls } = await supabase
    .from("payroll_periods")
    .select("id, period_name, total_net, start_date, end_date")
    .eq("project_id", id)
    .in("status", ["closed", "paid"])
    .order("created_at", { ascending: false });

  return (
    <>
      <Topbar title="Fideicomiso CORFID" subtitle={project.name} />
      <FideicomisoClient
        projectId={id}
        project={project}
        valorizaciones={valorizaciones ?? []}
        invoices={invoices ?? []}
        payrolls={payrolls ?? []}
      />
    </>
  );
}
