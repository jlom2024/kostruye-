import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { processJobInBackground } from "@/lib/jobs/processor";

/**
 * GET /api/jobs?id=UUID
 * Obtiene el estado y progreso de un job en segundo plano.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("id");

  if (!jobId) {
    return NextResponse.json({ error: "Falta id del job" }, { status: 400 });
  }

  const { data: job, error } = await supabase
    .from("background_jobs")
    .select("id, job_type, status, progress, result_url, error_message")
    .eq("id", jobId)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: error?.message ?? "Job no encontrado" }, { status: 404 });
  }

  return NextResponse.json(job);
}

/**
 * POST /api/jobs
 * Encola un nuevo job y retorna de inmediato con status 202.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { job_type, project_id, payload } = await request.json() as {
    job_type: "export_budget_pdf" | "export_budget_xlsx" | "recalculate_apu" | "import_s10";
    project_id?: string;
    payload?: Record<string, any>;
  };

  if (!job_type) {
    return NextResponse.json({ error: "Falta job_type" }, { status: 400 });
  }

  // Obtener la organización del usuario
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Usuario sin organización" }, { status: 403 });
  }

  const orgId = membership.organization_id;

  // Validar que el proyecto pertenezca a la organización del usuario
  if (project_id) {
    const { data: project } = await supabase
      .from("projects")
      .select("organization_id")
      .eq("id", project_id)
      .single();

    if (!project || (project as any).organization_id !== orgId) {
      return NextResponse.json({ error: "El proyecto no pertenece a tu organización" }, { status: 400 });
    }
  }

  // Insertar en la tabla de jobs
  const { data: job, error } = await supabase
    .from("background_jobs")
    .insert({
      org_id: orgId,
      project_id: project_id || null,
      job_type,
      payload: payload || {},
      status: "pending",
      progress: 0,
      created_by: user.id
    })
    .select("id")
    .single();

  if (error || !job) {
    return NextResponse.json({ error: error?.message ?? "Error encolando job" }, { status: 500 });
  }

  // Ejecutar el procesamiento de fondo de manera asincrónica sin esperar con await
  processJobInBackground(job.id);

  // Retornar 202 Accepted de inmediato con el id del job para polling del frontend
  return NextResponse.json({
    message: "Tarea encolada con éxito",
    job_id: job.id,
    status: "pending"
  }, { status: 202 });
}
