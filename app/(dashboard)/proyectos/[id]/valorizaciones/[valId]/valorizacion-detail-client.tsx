"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Printer, FileDown } from "lucide-react";
import { toast } from "sonner";

interface ValorizacionItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  presupuesto_qty: number;
  presupuesto_price: number;
  presupuesto_total: number;
  
  prev_qty: number;
  prev_amount: number;
  prev_percent: number;
  
  actual_qty: number;
  actual_amount: number;
  actual_percent: number;
  
  cumul_qty: number;
  cumul_amount: number;
  cumul_percent: number;

  saldo_qty: number;
  saldo_amount: number;
}

interface Valorizacion {
  id: string;
  val_number: number;
  period_name: string;
  start_date: string;
  end_date: string;
  status: string;
  total_amount: number;
  factor_k: number;
  monto_reajuste: number;
  created_at: string;
  reajuste_formulas?: {
    name: string;
  };
}

interface Props {
  projectId: string;
  valorizacion: Valorizacion;
  items: ValorizacionItem[];
}

export function ValorizacionDetailClient({ projectId, valorizacion, items }: Props) {
  const supabase = createClient();
  const router = useRouter();

  const handleApprove = async () => {
    if (!confirm("¿Aprobar esta valorización? Cambiará el estado a Aprobado de forma permanente.")) return;

    const { error } = await supabase
      .from("valorizaciones")
      .update({ status: 'approved' })
      .eq("id", valorizacion.id);

    if (error) {
      toast.error("Error al aprobar: " + error.message);
    } else {
      toast.success("Valorización aprobada exitosamente");
      router.refresh();
    }
  };

  const fmtSoles = (val: number) => `S/ ${Number(val).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href={`/proyectos/${projectId}/valorizaciones`}
            className="inline-flex items-center justify-center h-9 w-9 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Valorización N° {valorizacion.val_number} - {valorizacion.period_name}
            </h1>
            <div className="text-slate-505 mt-1 flex items-center gap-2 text-sm">
              <span>Periodo: {new Date(valorizacion.start_date).toLocaleDateString("es-PE")} al {new Date(valorizacion.end_date).toLocaleDateString("es-PE")}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                valorizacion.status === 'approved' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {valorizacion.status === 'approved' ? 'Aprobada' : 'Borrador'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            <FileDown className="h-4 w-4" /> Exportar Excel
          </button>
          {valorizacion.status !== 'approved' && (
            <button 
              onClick={handleApprove} 
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              <CheckCircle className="h-4 w-4" /> Aprobar Valorización
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50/50 border border-blue-200 rounded-xl shadow-sm overflow-hidden p-5">
          <p className="text-blue-700 font-semibold text-sm">Avance Físico del Mes</p>
          <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{fmtSoles(valorizacion.total_amount)}</h3>
          <p className="text-xs text-slate-500 mt-2">Monto a valorizar según metrados ejecutados en obra.</p>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-5">
          <p className="text-slate-600 font-semibold text-sm">Reajuste (Factor K)</p>
          <h3 className="text-3xl font-extrabold text-orange-600 mt-2">{fmtSoles(valorizacion.monto_reajuste)}</h3>
          <div className="text-xs text-slate-500 mt-2 flex justify-between">
            <span>Factor K calculado:</span>
            <strong className="text-slate-800">{Number(valorizacion.factor_k).toFixed(4)}</strong>
          </div>
        </div>

        <div className="bg-blue-600 text-white rounded-xl shadow-sm overflow-hidden p-5">
          <p className="text-blue-100 font-semibold text-sm">TOTAL A FACTURAR (Sin IGV)</p>
          <h3 className="text-3xl font-extrabold text-white mt-2">{fmtSoles(Number(valorizacion.total_amount) + Number(valorizacion.monto_reajuste))}</h3>
          <p className="text-xs text-blue-100 mt-2">Avance del mes + Reajustes correspondientes.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th colSpan={4} className="border-r border-slate-200 px-4 py-2.5 text-center font-bold">Datos del Presupuesto (Monto Contractual)</th>
                <th colSpan={2} className="border-r border-slate-200 px-4 py-2.5 text-center font-bold">Avance Anterior</th>
                <th colSpan={2} className="border-r border-slate-200 px-4 py-2.5 text-center font-bold bg-blue-50 text-blue-800">Avance Actual (Mes)</th>
                <th colSpan={2} className="border-r border-slate-200 px-4 py-2.5 text-center font-bold">Avance Acumulado</th>
                <th colSpan={2} className="px-4 py-2.5 text-center font-bold">Saldo por Valorizar</th>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-100/50">
                <th className="px-4 py-2">Ítem</th>
                <th className="px-4 py-2">Descripción</th>
                <th className="px-4 py-2 text-center">Und</th>
                <th className="px-4 py-2 text-right border-r border-slate-200">Total (S/)</th>
                
                {/* Anterior */}
                <th className="px-4 py-2 text-right">Metrado</th>
                <th className="px-4 py-2 text-right border-r border-slate-200">Monto (S/)</th>
                
                {/* Actual */}
                <th className="px-4 py-2 text-right bg-blue-50 text-blue-700">Metrado</th>
                <th className="px-4 py-2 text-right border-r border-slate-200 bg-blue-50 text-blue-700">Monto (S/)</th>
                
                {/* Acumulado */}
                <th className="px-4 py-2 text-right">Metrado</th>
                <th className="px-4 py-2 text-right border-r border-slate-200">Monto (S/)</th>
                
                {/* Saldo */}
                <th className="px-4 py-2 text-right">Metrado</th>
                <th className="px-4 py-2 text-right">Monto (S/)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{item.code}</td>
                  <td className="px-4 py-3 max-w-[300px] truncate" title={item.description}>{item.description}</td>
                  <td className="px-4 py-3 text-center text-slate-500 font-medium">{item.unit}</td>
                  <td className="px-4 py-3 text-right border-r border-slate-200 font-semibold">{Number(item.presupuesto_total).toLocaleString('es-PE', {minimumFractionDigits: 2})}</td>
                  
                  {/* Anterior */}
                  <td className="px-4 py-3 text-right">{Number(item.prev_qty).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right border-r border-slate-200 text-slate-500">{Number(item.prev_amount).toLocaleString('es-PE', {minimumFractionDigits: 2})}</td>
                  
                  {/* Actual */}
                  <td className="px-4 py-3 text-right bg-blue-50/30 font-bold text-blue-700">{Number(item.actual_qty).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right border-r border-slate-200 bg-blue-50/30 font-bold text-blue-700">{Number(item.actual_amount).toLocaleString('es-PE', {minimumFractionDigits: 2})}</td>
                  
                  {/* Acumulado */}
                  <td className="px-4 py-3 text-right font-medium">{Number(item.cumul_qty).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right border-r border-slate-200 font-semibold text-emerald-700">{Number(item.cumul_amount).toLocaleString('es-PE', {minimumFractionDigits: 2})}</td>
                  
                  {/* Saldo */}
                  <td className="px-4 py-3 text-right">{Number(item.saldo_qty).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">{Number(item.saldo_amount).toLocaleString('es-PE', {minimumFractionDigits: 2})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
