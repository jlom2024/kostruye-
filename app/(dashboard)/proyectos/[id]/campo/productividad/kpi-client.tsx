"use client";

import { useMemo } from "react";
import { Clock, Truck, TrendingUp, AlertTriangle } from "lucide-react";

interface KpiData {
  budget_item_id: string;
  project_id: string;
  item_code: string;
  item_name: string;
  unit: string;
  theoretical_quantity: number;
  theoretical_price: number;
  total_executed_quantity: number;
  total_hh_used: number;
  total_hm_used: number;
}

interface Props {
  projectId: string;
  projectName: string;
  kpis: KpiData[];
}

export function KpiClient({ kpis }: Props) {
  // Solo consideramos partidas que tienen algún movimiento (avance, HH o HM)
  const activeKpis = useMemo(() => {
    return kpis.filter(
      (k) =>
        k.total_executed_quantity > 0 || k.total_hh_used > 0 || k.total_hm_used > 0
    );
  }, [kpis]);

  const globalMetrics = useMemo(() => {
    let totalHH = 0;
    let totalHM = 0;
    let totalExecuted = 0;
    let totalTheoretical = 0;

    activeKpis.forEach((k) => {
      totalHH += Number(k.total_hh_used);
      totalHM += Number(k.total_hm_used);
      totalExecuted += Number(k.total_executed_quantity);
      totalTheoretical += Number(k.theoretical_quantity);
    });

    const percentComplete =
      totalTheoretical > 0 ? (totalExecuted / totalTheoretical) * 100 : 0;

    return { totalHH, totalHM, percentComplete };
  }, [activeKpis]);

  return (
    <div className="space-y-6">
      {/* 3 KPIs principales */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="p-5 flex flex-row items-center justify-between pb-2 bg-slate-50/50 border-b border-slate-100 rounded-t-xl">
            <h3 className="text-sm font-semibold text-slate-700">Total Horas Hombre (HH)</h3>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="p-5">
            <div className="text-2xl font-bold text-slate-900">{globalMetrics.totalHH.toFixed(2)}</div>
            <p className="text-xs text-slate-500 mt-1">Consumo general del proyecto</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="p-5 flex flex-row items-center justify-between pb-2 bg-slate-50/50 border-b border-slate-100 rounded-t-xl">
            <h3 className="text-sm font-semibold text-slate-700">Total Horas Máquina (HM)</h3>
            <Truck className="h-4 w-4 text-slate-400" />
          </div>
          <div className="p-5">
            <div className="text-2xl font-bold text-slate-900">{globalMetrics.totalHM.toFixed(2)}</div>
            <p className="text-xs text-slate-500 mt-1">Consumo general de equipos</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="p-5 flex flex-row items-center justify-between pb-2 bg-slate-50/50 border-b border-slate-100 rounded-t-xl">
            <h3 className="text-sm font-semibold text-slate-700">Avance Global Promedio</h3>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </div>
          <div className="p-5">
            <div className="text-2xl font-bold text-slate-900">
              {globalMetrics.percentComplete.toFixed(1)}%
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${Math.min(globalMetrics.percentComplete, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Rendimiento */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50">
          <h2 className="text-base font-bold text-slate-900">Rendimiento por Partida (Control de Producción)</h2>
          <p className="text-sm text-slate-500 mt-1">
            Compara el avance físico real vs los recursos consumidos (HH y HM)
          </p>
        </div>
        <div className="p-5">
          {activeKpis.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-200 rounded-lg">
              <TrendingUp className="h-10 w-10 text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-800">No hay datos de producción aún</p>
              <p className="text-sm text-slate-500 mt-1">
                Registra Tareos, Partes de Equipo y Avances Diarios para poblar este dashboard.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Partida</th>
                    <th className="px-4 py-3 text-right">Meta (Teórico)</th>
                    <th className="px-4 py-3 text-right">Avance Real</th>
                    <th className="px-4 py-3 text-center">% Avance</th>
                    <th className="px-4 py-3 text-right">HH Usadas</th>
                    <th className="px-4 py-3 text-right">HM Usadas</th>
                    <th className="px-4 py-3 text-right">Rend. Real (HH/Ud)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {activeKpis.map((kpi) => {
                    const percent =
                      kpi.theoretical_quantity > 0
                        ? (Number(kpi.total_executed_quantity) / Number(kpi.theoretical_quantity)) * 100
                        : 0;

                    const rendRealHH =
                      Number(kpi.total_executed_quantity) > 0
                        ? Number(kpi.total_hh_used) / Number(kpi.total_executed_quantity)
                        : 0;

                    const hasAlert = percent > 0 && rendRealHH > 10; // Criterio de alerta

                    return (
                      <tr key={kpi.budget_item_id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            {kpi.item_code}
                            {hasAlert && (
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <div className="text-xs text-slate-500 truncate max-w-[200px]" title={kpi.item_name}>
                            {kpi.item_name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {Number(kpi.theoretical_quantity).toLocaleString("es-PE")} {kpi.unit}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900 whitespace-nowrap">
                          {Number(kpi.total_executed_quantity).toLocaleString("es-PE")} {kpi.unit}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            percent >= 100 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {percent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {Number(kpi.total_hh_used).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">
                          {Number(kpi.total_hm_used).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {rendRealHH > 0 ? rendRealHH.toFixed(2) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
