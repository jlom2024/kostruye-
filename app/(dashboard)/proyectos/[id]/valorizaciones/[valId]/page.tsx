import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ValorizacionDetailClient } from "./valorizacion-detail-client";

interface Props {
  params: Promise<{ id: string; valId: string }>;
}

export default async function ValorizacionDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const { id, valId } = resolvedParams;
  const supabase = await createClient();

  // Obtener Cabecera de la Valorización
  const { data: valorizacion, error: vErr } = await supabase
    .from("valorizaciones")
    .select("*, reajuste_formulas(name)")
    .eq("id", valId)
    .single();

  if (vErr || !valorizacion) {
    notFound();
  }

  // Obtener el Detalle (Items) con los nombres de las partidas
  const { data: items, error: iErr } = await supabase
    .from("valorizacion_items")
    .select(`
      *,
      budget_items:budget_item_id (
        id,
        item_code,
        description,
        unit,
        quantity,
        price,
        total
      )
    `)
    .eq("valorizacion_id", valId)
    .order("budget_items(item_code)", { ascending: true });

  if (iErr) {
    console.error("Error cargando items:", iErr);
  }

  // Aplanar el resultado para facilidad del cliente
  const formattedItems = (items || []).map(item => ({
    id: item.id,
    budget_item_id: item.budget_item_id,
    code: item.budget_items?.item_code || '-',
    description: item.budget_items?.description || 'Sin descripción',
    unit: item.budget_items?.unit || '-',
    presupuesto_qty: item.budget_items?.quantity || 0,
    presupuesto_price: item.budget_items?.price || 0,
    presupuesto_total: item.budget_items?.total || 0,
    
    prev_qty: item.cumul_amount - item.period_amount,
    prev_amount: (item.cumul_amount - item.period_amount) * (item.budget_items?.price || 0),
    prev_percent: item.prev_percent,
    
    actual_qty: item.period_amount,
    actual_amount: item.item_total,
    actual_percent: item.period_percent,
    
    cumul_qty: item.cumul_amount,
    cumul_amount: item.cumul_amount * (item.budget_items?.price || 0),
    cumul_percent: item.cumul_percent,

    saldo_qty: (item.budget_items?.quantity || 0) - item.cumul_amount,
    saldo_amount: (item.budget_items?.total || 0) - (item.cumul_amount * (item.budget_items?.price || 0))
  }));

  // Ordenar por código de partida (asumiendo que item_code tiene formato "01.01", "01.02")
  formattedItems.sort((a, b) => a.code.localeCompare(b.code));

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto p-4 sm:p-6">
      <ValorizacionDetailClient 
        projectId={id} 
        valorizacion={valorizacion}
        items={formattedItems}
      />
    </div>
  );
}
