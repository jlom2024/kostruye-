"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type Project } from "@/types/database";
import { MapPin, Calendar, ChevronRight, FolderKanban, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

const statusLabel: Record<Project["status"], string> = {
  active:  "Activo",
  paused:  "Pausado",
  closed:  "Cerrado",
};

const statusColor: Record<Project["status"], string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  closed: "bg-slate-100 text-slate-600",
};

interface Props {
  projects: Project[];
}

export function ProjectsGrid({ projects: initialProjects }: Props) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, projectId: string, projectName: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`¿Eliminar el proyecto "${projectName}"? Esta acción no se puede deshacer.`)) return;

    setDeletingId(projectId);
    const supabase = createClient();
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) {
      alert("Error al eliminar: " + error.message);
    } else {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      router.refresh();
    }
    setDeletingId(null);
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 mb-6">
          <FolderKanban className="h-8 w-8 text-blue-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">¡Bienvenido a Kostruye+!</h3>
        <p className="text-slate-500 max-w-sm mx-auto mb-8 text-sm">
          Aún no tienes proyectos registrados. Sigue estos pasos para comenzar a gestionar tus obras:
        </p>
        
        <div className="grid gap-4 max-w-lg w-full text-left mx-auto mb-10 px-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="text-blue-600 font-bold text-sm mb-1">Paso 1</div>
            <p className="text-xs text-slate-600">Haz clic en <strong>"Nuevo proyecto"</strong> arriba para registrar tu primera obra.</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="text-blue-600 font-bold text-sm mb-1">Paso 2</div>
            <p className="text-xs text-slate-600">Carga tu presupuesto y empieza a gestionar compras, almacén y valorizaciones.</p>
          </div>
        </div>

        <Link
          href="/proyectos/nuevo"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
        >
          Crear mi primer proyecto
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <div key={project.id} className="relative group">
          <Link
            href={`/proyectos/${project.id}/presupuesto`}
            className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-300 hover:shadow-md transition-all h-full"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 pr-2">
                <span className="text-xs font-mono text-slate-400">{project.code}</span>
                <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors mt-0.5 leading-snug">
                  {project.name}
                </h3>
              </div>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0", statusColor[project.status])}>
                {statusLabel[project.status]}
              </span>
            </div>

            {project.client && (
              <p className="text-sm text-slate-600 mb-3 truncate">{project.client}</p>
            )}

            <div className="mt-auto flex flex-col gap-1.5 text-xs text-slate-500">
              {project.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {project.location}
                </span>
              )}
              {project.start_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Inicio: {new Date(project.start_date).toLocaleDateString("es-PE")}
                </span>
              )}
            </div>

            <div className="flex items-center justify-end mt-4 text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Ver proyecto <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </div>
          </Link>

          {/* Botón eliminar — flota en la esquina inferior izquierda */}
          <button
            onClick={(e) => handleDelete(e, project.id, project.name)}
            disabled={deletingId === project.id}
            title="Eliminar proyecto"
            className={cn(
              "absolute bottom-4 left-5 z-10 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all",
              "bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700",
              deletingId === project.id && "opacity-100 animate-pulse"
            )}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
