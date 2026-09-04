import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

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
    await sb.from("background_jobs").update({ progress: 10 }).eq("id", jobId);

    let resultUrl = "";

    if (job_type === "export_budget_xlsx") {
      // 1. Obtener presupuesto y capítulos
      const { data: chapters, error: chErr } = await sb
        .from("budget_chapters")
        .select(`
          id, name, order_index,
          budget_items (
            id, item_code, description, unit, quantity, unit_price, total, order_index
          )
        `)
        .eq("budget_id", payload.budget_id)
        .order("order_index");

      if (chErr) throw new Error("Error obteniendo presupuesto: " + chErr.message);
      await sb.from("background_jobs").update({ progress: 40 }).eq("id", jobId);

      // 2. Generar Excel
      const rows = [];
      rows.push(["CÓDIGO", "DESCRIPCIÓN", "UND.", "METRADO", "P. UNIT.", "PARCIAL"]);
      
      let grandTotal = 0;

      for (const ch of chapters || []) {
        // Fila de capítulo
        rows.push([ch.order_index, ch.name, "", "", "", ""]);
        
        // Fila de items
        const items = (ch.budget_items || []).sort((a: any, b: any) => a.order_index - b.order_index);
        for (const item of items) {
          rows.push([
            item.item_code,
            item.description,
            item.unit,
            item.quantity,
            item.unit_price,
            item.total
          ]);
          grandTotal += Number(item.total || 0);
        }
      }

      rows.push(["", "TOTAL PRESUPUESTO", "", "", "", grandTotal]);

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Presupuesto");
      ws.addRows(rows);
      const excelBuffer = Buffer.from(await wb.xlsx.writeBuffer());
      
      await sb.from("background_jobs").update({ progress: 70 }).eq("id", jobId);

      // 3. Subir a Supabase Storage
      const fileName = `presupuesto_${payload.budget_id}_${Date.now()}.xlsx`;
      const { data: uploadData, error: uploadErr } = await sb
        .storage
        .from("reports")
        .upload(fileName, excelBuffer, {
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          upsert: true
        });

      if (uploadErr) {
        // Fallback: Si el bucket no existe, simulamos para no romper el demo local
        console.error("Error subiendo a Storage:", uploadErr.message);
        throw new Error("No se pudo subir a Storage (asegúrate de correr la migración 025).");
      }

      const { data: signedUrlData } = await sb.storage.from("reports").createSignedUrl(fileName, 604800);
      resultUrl = signedUrlData?.signedUrl || '';
      await sb.from("background_jobs").update({ progress: 90 }).eq("id", jobId);

    } else if (job_type === "export_budget_pdf") {
      await new Promise((r) => setTimeout(r, 2000));
      resultUrl = `/static/reports/budget_${jobId}.pdf`;
    } else {
      resultUrl = "/proyectos";
    }

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
