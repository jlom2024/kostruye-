import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Procesa una tarea en segundo plano actualizando el progreso en la base de datos.
 */
export async function processJobInBackground(jobId: string) {
  const sb = getAdminClient();

  try {
    // 1. Marcar como procesando
    await sb
      .from("background_jobs")
      .update({ status: "processing", progress: 5 })
      .eq("id", jobId);

    // Obtener los datos del job
    const { data: job, error: getErr } = await sb
      .from("background_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (getErr || !job) {
      throw new Error(getErr?.message ?? "Job no encontrado");
    }

    const { job_type, payload } = job as any;

    // Simular el proceso pesado en pasos (Fase 1 de demo)
    // En producción esto invocará los generadores reales de PDF/Excel/Recálculos
    console.log(`[JobProcessor] Iniciando Job ${jobId} de tipo ${job_type}...`);

    // Paso 1: Inicialización
    await new Promise((r) => setTimeout(r, 2000));
    await sb.from("background_jobs").update({ progress: 25 }).eq("id", jobId);

    // Paso 2: Procesamiento de datos
    await new Promise((r) => setTimeout(r, 3000));
    await sb.from("background_jobs").update({ progress: 60 }).eq("id", jobId);

    // Paso 3: Generación del archivo final / finalización
    await new Promise((r) => setTimeout(r, 3000));
    await sb.from("background_jobs").update({ progress: 85 }).eq("id", jobId);

    // Paso 4: Carga y finalización
    let resultUrl = "";
    if (job_type === "export_budget_pdf") {
      resultUrl = `/static/reports/budget_${jobId}.pdf`;
    } else if (job_type === "export_budget_xlsx") {
      resultUrl = `/static/reports/budget_${jobId}.xlsx`;
    } else {
      resultUrl = "/proyectos";
    }

    await new Promise((r) => setTimeout(r, 1000));

    // Marcar como completado
    await sb
      .from("background_jobs")
      .update({
        status: "completed",
        progress: 100,
        result_url: resultUrl,
      })
      .eq("id", jobId);

    console.log(`[JobProcessor] Job ${jobId} completado con éxito.`);
  } catch (err: any) {
    console.error(`[JobProcessor] Error en Job ${jobId}:`, err.message);
    await sb
      .from("background_jobs")
      .update({
        status: "failed",
        error_message: err.message ?? "Error desconocido en segundo plano",
      })
      .eq("id", jobId);
  }
}
