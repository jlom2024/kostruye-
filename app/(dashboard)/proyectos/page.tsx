import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { ProjectsGrid } from "./projects-grid";
import { Sidebar } from "@/components/layout/sidebar";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function ProyectosPage() {
  const supabase = await createClient();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-y-auto bg-slate-50">
        <Topbar
          title="Proyectos"
          subtitle="Todas las obras activas"
          actions={
            <Link
              href="/proyectos/nuevo"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nuevo proyecto
            </Link>
          }
        />
        <div className="flex-1 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Error al cargar proyectos: {error.message}
            </div>
          )}
          <ProjectsGrid projects={projects ?? []} />
        </div>
      </main>
    </div>
  );
}
