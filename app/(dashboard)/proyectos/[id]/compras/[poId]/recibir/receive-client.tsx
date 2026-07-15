"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface PoItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total: number;
  resource_id: string | null;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  status: string;
  issue_date: string;
  total: number;
  suppliers?: { name: string };
  purchase_order_items: PoItem[];
}

interface Props {
  projectId: string;
  po: PurchaseOrder;
  receivedMap: Record<string, number>;
}

export function ReceiveClient({ projectId, po, receivedMap }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");

  // Cantidades a recibir en este acto
  const [quantities, setQuantities] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    po.purchase_order_items.forEach(item => {
      const pending = item.quantity - (receivedMap[item.id] || 0);
      initial[item.id] = pending > 0 ? String(pending) : "0";
    });
    return initial;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const itemsToReceive = po.purchase_order_items.filter(item => {
      const qty = parseFloat(quantities[item.id] || "0");
      return qty > 0;
    });

    if (itemsToReceive.length === 0) {
      toast.error("No hay cantidades a recibir.");
      return;
    }

    setIsSubmitting(true);

    // 1. Crear la cabecera de la recepción
    const { data: receipt, error: rErr } = await supabase
      .from("purchase_receipts")
      .insert({
        purchase_order_id: po.id,
        receipt_date: receiptDate,
        notes,
        status: 'draft'
      })
      .select()
      .single();

    if (rErr || !receipt) {
      toast.error("Error al crear la recepción: " + rErr?.message);
      setIsSubmitting(false);
      return;
    }

    // 2. Insertar los ítems de la recepción
    const { error: iErr } = await supabase.from("purchase_receipt_items").insert(
      itemsToReceive.map(item => ({
        receipt_id: receipt.id,
        purchase_order_item_id: item.id,
        received_quantity: parseFloat(quantities[item.id]),
        unit_price: item.unit_price
      }))
    );

    if (iErr) {
      toast.error("Error al guardar ítems: " + iErr.message);
      setIsSubmitting(false);
      return;
    }

    // 3. Confirmar la recepción (que activa el stock via stored procedure)
    const { error: cErr } = await supabase.rpc("fn_confirm_purchase_receipt", {
      p_receipt_id: receipt.id
    });

    if (cErr) {
      toast.error("Error al confirmar recepción: " + cErr.message);
      setIsSubmitting(false);
      return;
    }

    toast.success("✅ Recepción confirmada. Materiales ingresados al Almacén.");
    setIsSubmitting(false);
    router.push(`/proyectos/${projectId}/compras`);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          href={`/proyectos/${projectId}/compras`}
          className="inline-flex items-center justify-center h-9 w-9 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          <span className="text-sm text-slate-500 font-medium">
            {po.purchase_order_items.length} ítems en la OC
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-semibold text-slate-900 text-base">Datos de la Recepción</h3>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-600 uppercase">Fecha de Recepción</label>
              <input
                type="date"
                value={receiptDate}
                onChange={e => setReceiptDate(e.target.value)}
                required
                className="w-full text-sm border-slate-300 rounded-lg"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="block text-xs font-semibold text-slate-600 uppercase">Observaciones</label>
              <textarea
                placeholder="Condición de llegada, embalaje, etc."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="w-full text-sm border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50">
            <h3 className="font-semibold text-slate-900 text-base">Ítems de la Orden de Compra</h3>
            <p className="text-xs text-slate-500 mt-1">
              Ingresa las cantidades recibidas en este acto. Los materiales se incorporarán automáticamente al Almacén.
            </p>
          </div>
          <div className="p-5">
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Descripción</th>
                    <th className="px-4 py-3 text-center">Und</th>
                    <th className="px-4 py-3 text-right">Cant. OC</th>
                    <th className="px-4 py-3 text-right">Recibido Prev.</th>
                    <th className="px-4 py-3 text-right">Pendiente</th>
                    <th className="px-4 py-3 text-center w-36">Recibir Ahora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {po.purchase_order_items.map(item => {
                    const prevReceived = receivedMap[item.id] || 0;
                    const pending = item.quantity - prevReceived;
                    const pct = (prevReceived / item.quantity) * 100;
                    const isComplete = pending <= 0;
                    return (
                      <tr key={item.id} className={isComplete ? 'bg-slate-50/50' : ''}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-950">{item.description}</div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 max-w-[120px]">
                            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-500 font-medium">{item.unit}</td>
                        <td className="px-4 py-3 text-right font-medium">{Number(item.quantity).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{prevReceived.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">
                          {isComplete ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="h-3 w-3" /> Completo
                            </span>
                          ) : (
                            <span className="font-semibold text-orange-600">{pending.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            max={pending > 0 ? pending : 0}
                            step="0.01"
                            value={quantities[item.id] || "0"}
                            onChange={e => setQuantities(prev => ({ ...prev, [item.id]: e.target.value }))}
                            disabled={isComplete}
                            className="w-full text-sm border-slate-300 rounded-lg text-right disabled:bg-slate-50 disabled:text-slate-400"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Link 
            href={`/proyectos/${projectId}/compras`}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </Link>
          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Procesando..." : "✅ Confirmar Recepción e Ingresar al Almacén"}
          </button>
        </div>
      </form>
    </div>
  );
}
