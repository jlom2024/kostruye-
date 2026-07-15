import { createClient } from "@/lib/supabase/server";
import { IneiClient } from "./inei-client";

export default async function IneiPage() {
  const supabase = await createClient();

  // Traer todos los índices INEI agrupados o listados.
  // Podríamos ordenarlos por año, mes, y código.
  const { data: indices, error } = await supabase
    .from("inei_indices")
    .select("*")
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false })
    .order("index_code", { ascending: true });

  if (error) {
    console.error("Error cargando índices INEI:", error);
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full p-4 sm:p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Índices Unificados INEI</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona los Índices Unificados de Precios de la Construcción para el cálculo de reajustes (Fórmula Polinómica).
        </p>
      </div>

      <IneiClient initialIndices={indices || []} />
    </div>
  );
}
