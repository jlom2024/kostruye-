import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CuadernoClient } from "./cuaderno-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CuadernoDeObraPage({ params }: Props) {
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

  // Se extraen los asientos (entries) del cuaderno de obra ordenados cronológicamente inverso
  const { data: entries, error: cErr } = await supabase
    .from("site_diary_entries")
    .select(`*, author:author_id(id, email)`)
    .eq("project_id", id)
    .order("entry_number", { ascending: false });

  if (cErr) {
    console.error("Error cargando cuaderno de obra:", cErr);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cuaderno de Obra Digital</h1>
        <p className="text-muted-foreground mt-2">
          Bitácora oficial inmutable de ocurrencias, eventos y avances del proyecto.
        </p>
      </div>

      <CuadernoClient 
        projectId={id} 
        initialEntries={entries || []} 
      />
    </div>
  );
}
