import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { notFound } from "next/navigation";

interface Props {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectLayout({ children, params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!project) notFound();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar projectId={project.id} projectName={project.name} />
      <main className="flex flex-1 flex-col overflow-y-auto bg-slate-50">
        {/* Topbar de configuración — se inyecta aquí para que tenga el nombre del proyecto */}
        {children}
      </main>
    </div>
  );
}
