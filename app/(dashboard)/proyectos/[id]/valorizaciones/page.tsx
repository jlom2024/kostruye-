import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ValorizacionesClient } from "./valorizaciones-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ValorizacionesPage({ params }: Props) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const supabase = await createClient();

  const { data: project, error: pErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (pErr || !project) {
    notFound();
  }

  const { data: valorizaciones, error: vErr } = await supabase
    .from("valorizaciones")
    .select("*, reajuste_formulas(name)")
    .eq("project_id", id)
    .order("val_number", { ascending: false });

  if (vErr) {
    console.error("Error cargando valorizaciones:", vErr);
  }

  const { data: formulas, error: fErr } = await supabase
    .from("reajuste_formulas")
    .select("id, name")
    .eq("project_id", id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Valorizaciones</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona las valorizaciones mensuales, avances físicos y reajustes.
        </p>
      </div>

      <ValorizacionesClient 
        projectId={id} 
        initialData={valorizaciones || []} 
        formulas={formulas || []}
      />
    </div>
  );
}
