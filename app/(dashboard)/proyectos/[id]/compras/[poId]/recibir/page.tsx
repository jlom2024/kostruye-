import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ReceiveClient } from "./receive-client";

interface Props {
  params: Promise<{ id: string; poId: string }>;
}

export default async function RecibirPage({ params }: Props) {
  const { id, poId } = await params;
  const supabase = await createClient();

  const { data: po, error: pErr } = await supabase
    .from("purchase_orders")
    .select(`
      *,
      suppliers(name),
      purchase_order_items(*)
    `)
    .eq("id", poId)
    .single();

  if (pErr || !po) notFound();

  // Obtener recepciones previas para saber cuánto ya fue recibido
  const { data: prevReceipts } = await supabase
    .from("purchase_receipts")
    .select(`*, purchase_receipt_items(*)`)
    .eq("purchase_order_id", poId)
    .eq("status", "confirmed");

  // Calcular cantidades ya recibidas por item
  const receivedMap: Record<string, number> = {};
  (prevReceipts || []).forEach(receipt => {
    (receipt.purchase_receipt_items || []).forEach((item: any) => {
      receivedMap[item.purchase_order_item_id] =
        (receivedMap[item.purchase_order_item_id] || 0) + Number(item.received_quantity);
    });
  });

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto p-4 sm:p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Recepción de Materiales</h1>
        <p className="text-muted-foreground mt-2">
          OC {po.po_number} — {po.suppliers?.name}
        </p>
      </div>
      <ReceiveClient 
        projectId={id} 
        po={po} 
        receivedMap={receivedMap}
      />
    </div>
  );
}
