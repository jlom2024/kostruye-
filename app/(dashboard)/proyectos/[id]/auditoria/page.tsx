import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { notFound } from "next/navigation";
import { AuditoriaClient } from "./auditoria-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AuditoriaPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await (supabase as any)
    .from("projects")
    .select("name")
    .eq("id", id)
    .single();

  if (!project) notFound();

  // Últimos 300 eventos de auditoría del proyecto (RLS scope por organización)
  const { data: logs } = await (supabase as any)
    .from("audit_logs")
    .select("id, table_name, record_id, operation, changed_by, changed_at, old_values, new_values")
    .eq("project_id", id)
    .order("changed_at", { ascending: false })
    .limit(300);

  // Resolver nombres/correos de los autores
  const actorIds = Array.from(
    new Set((logs ?? []).map((l: any) => (l as { changed_by: string | null }).changed_by).filter(Boolean))
  ) as string[];

  let actors: Record<string, string> = {};
  if (actorIds.length) {
    const { data: profiles } = await (supabase as any)
      .from("profiles")
      .select("id, name, email")
      .in("id", actorIds);
    actors = Object.fromEntries(
      (profiles ?? []).map((p: any) => {
        const row = p as { id: string; name: string | null; email: string | null };
        return [row.id, row.name || row.email || row.id.slice(0, 8)];
      })
    );
  }

  return (
    <>
      <Topbar title="Auditoría" subtitle={project.name} />
      <AuditoriaClient
        logs={(logs ?? []) as never[]}
        actors={actors}
      />
    </>
  );
}
