"use client";

import { cn } from "@/lib/utils";
import {
  TrendingUp,
  ShoppingCart,
  FileText,
  CalendarClock,
  AlertTriangle,
  DollarSign,
  HardHat,
  BarChart3,
  Wrench,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Chapter { id: string; code: string; name: string; total: number }
interface PO       { id: string; status: string; total: number; po_number: string; suppliers: { name: string } | null }

interface Plazo {
  totalDays:     number | null;
  daysElapsed:   number | null;
  daysRemaining: number | null;
  plazoPercent:  number | null;
}

interface ValPoint {
  val_number: number;
  period_name: string;
  end_date: string;
  status: string;
  total_amount: number;
}

interface OCPoint {
  date: string;
  amount: number;
}

interface Props {
  project:          Record<string, unknown>;
  ventaTotal:       number;
  metaTotal:        number;
  computedTotal:    number;
  chapters:         Chapter[];
  pos:              PO[];
  poCommitted:      number;
  itemCount:        number;
  plazo:            Plazo;
  valorizaciones:   ValPoint[];
  costoMO:          number;
  costoOCsReceived: number;
  costoServicios:   number;
  ocTimeline:       OCPoint[];
  usandoKardex:     boolean;
}

// ── Status config ─────────────────────────────────────────────────────────────

const PO_STATUS: Record<string, { label: string; color: string }> = {
  draft:     { label: "Borrador",    color: "#94a3b8" },
  sent:      { label: "Enviada",     color: "#3b82f6" },
  partial:   { label: "Parcial",     color: "#f59e0b" },
  received:  { label: "Recibida",    color: "#22c55e" },
  cancelled: { label: "Anulada",     color: "#ef4444" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, currency: string) {
  const sym = currency === "PEN" ? "S/" : "$";
  return `${sym} ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtShort(n: number, currency: string) {
  const sym = currency === "PEN" ? "S/" : "$";
  if (n >= 1_000_000) return `${sym} ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${sym} ${(n / 1_000).toFixed(1)}K`;
  return `${sym} ${n.toFixed(0)}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardClient({
  project,
  ventaTotal,
  metaTotal,
  computedTotal,
  chapters,
  pos,
  poCommitted,
  itemCount,
  plazo,
  valorizaciones,
  costoMO,
  costoOCsReceived,
  costoServicios,
  ocTimeline,
  usandoKardex,
}: Props) {
  const currency = (project.currency as string) ?? "PEN";

  // Capítulos top 8
  const chapterData = [...chapters]
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
  const maxChapter = chapterData[0]?.total ?? 1;

  // OCs por estado
  const statusCounts: Record<string, number> = {};
  for (const po of pos) {
    statusCounts[po.status] = (statusCounts[po.status] ?? 0) + 1;
  }
  const pieData = Object.entries(statusCounts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name:  PO_STATUS[status]?.label ?? status,
      value: count,
      color: PO_STATUS[status]?.color ?? "#94a3b8",
    }));
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

  // Plazo
  const { totalDays, daysElapsed, daysRemaining, plazoPercent } = plazo;
  const plazoOverdue = daysRemaining !== null && daysRemaining < 0;
  const plazoWarning = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 30;

  // Presupuesto APU vs contrato
  const budgetPercent = ventaTotal > 0 ? Math.min(100, Math.round((computedTotal / ventaTotal) * 100)) : 0;

  // OC comprometido vs contrato
  const ocPercent = ventaTotal > 0 ? Math.min(100, Math.round((poCommitted / ventaTotal) * 100)) : 0;

  // Resultado Operativo
  const ingreso    = valorizaciones.reduce((s, v) => s + Number(v.total_amount), 0);
  const costoTotal = costoMO + costoOCsReceived + costoServicios;
  const ro         = ingreso - costoTotal;
  const roMargen   = ingreso > 0 ? Math.round((ro / ingreso) * 100) : 0;
  const roPositive = ro >= 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

        {/* Presupuesto Venta */}
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          iconColor="text-blue-600 bg-blue-50"
          label="Presupuesto Venta"
          value={fmt(ventaTotal, currency)}
          sub={metaTotal > 0 ? `Meta: ${fmt(metaTotal, currency)}` : "Sin presupuesto meta"}
        />

        {/* APU calculado */}
        <KpiCard
          icon={<FileText className="h-4 w-4" />}
          iconColor="text-violet-600 bg-violet-50"
          label="Presupuesto APU"
          value={fmt(computedTotal, currency)}
          sub={`${itemCount} partidas · ${budgetPercent}% del contrato`}
        />

        {/* OCs comprometidas */}
        <KpiCard
          icon={<ShoppingCart className="h-4 w-4" />}
          iconColor="text-amber-600 bg-amber-50"
          label="OCs comprometidas"
          value={fmt(poCommitted, currency)}
          sub={`${pos.filter(p => p.status !== "cancelled").length} OC activas · ${ocPercent}% del contrato`}
        />

        {/* Plazo */}
        <KpiCard
          icon={<CalendarClock className="h-4 w-4" />}
          iconColor={plazoOverdue ? "text-red-600 bg-red-50" : plazoWarning ? "text-amber-600 bg-amber-50" : "text-green-600 bg-green-50"}
          label="Plazo"
          value={
            daysRemaining === null ? "Sin fecha fin" :
            plazoOverdue ? `${Math.abs(daysRemaining)} días vencido` :
            `${daysRemaining} días restantes`
          }
          sub={
            totalDays !== null && daysElapsed !== null
              ? `Día ${daysElapsed} de ${totalDays} · ${plazoPercent}% del plazo`
              : (project.start_date as string) ? "Sin fecha de fin definida" : "Sin fechas definidas"
          }
          alert={plazoOverdue}
        />
      </div>

      {/* ── Plazo progress bar ─────────────────────────────────────────────── */}
      {plazoPercent !== null && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Avance de plazo</span>
            <span className={cn(
              "text-xs font-bold",
              plazoOverdue ? "text-red-600" : plazoWarning ? "text-amber-600" : "text-slate-700"
            )}>
              {plazoPercent}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                plazoOverdue ? "bg-red-500" : plazoWarning ? "bg-amber-400" : "bg-blue-500"
              )}
              style={{ width: `${Math.min(100, plazoPercent)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-slate-400">
            <span>{project.start_date as string ? new Date((project.start_date as string) + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span>
            <span>{project.end_date as string ? new Date((project.end_date as string) + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span>
          </div>
        </div>
      )}

      {/* ── Resultado Operativo (S10) ───────────────────────────────────────── */}
      <ResultadoOperativo
        ingreso={ingreso}
        costoMO={costoMO}
        costoOCsReceived={costoOCsReceived}
        costoServicios={costoServicios}
        costoTotal={costoTotal}
        ro={ro}
        roMargen={roMargen}
        roPositive={roPositive}
        currency={currency}
        usandoKardex={usandoKardex}
      />

      {/* ── Charts row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Capítulos del presupuesto — barras CSS */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Presupuesto por capítulo</h3>
          {chapterData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-300">
              <FileText className="h-8 w-8 mb-2" />
              <p className="text-sm">Sin capítulos en el presupuesto</p>
            </div>
          ) : (
            <div className="space-y-3">
              {chapterData.map((c) => {
                const pct = maxChapter > 0 ? Math.round((c.total / maxChapter) * 100) : 0;
                return (
                  <div key={c.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600 truncate max-w-[60%]">
                        <span className="font-mono text-slate-400 mr-1.5">{c.code}</span>
                        {c.name}
                      </span>
                      <span className="text-xs font-medium text-slate-700 tabular-nums">
                        {fmtShort(c.total, currency)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* OCs por estado — donut SVG */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Estado de OCs</h3>
          {pieData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-300">
              <ShoppingCart className="h-8 w-8 mb-2" />
              <p className="text-sm">Sin órdenes de compra</p>
            </div>
          ) : (
            <>
              <DonutChart data={pieData} total={pieTotal} />
              <div className="mt-4 space-y-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-slate-600">{d.name}</span>
                    </div>
                    <span className="font-semibold text-slate-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Últimas OCs ────────────────────────────────────────────────────── */}
      {pos.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Últimas órdenes de compra</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">N° OC</th>
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Proveedor</th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Total</th>
                <th className="pb-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pos.slice(0, 6).map((po) => {
                const meta = PO_STATUS[po.status];
                return (
                  <tr key={po.id}>
                    <td className="py-2 font-mono text-xs text-slate-700">{po.po_number}</td>
                    <td className="py-2 text-slate-600">{po.suppliers?.name ?? <span className="italic text-slate-400">Sin proveedor</span>}</td>
                    <td className="py-2 text-right font-medium text-slate-800">{fmt(po.total, currency)}</td>
                    <td className="py-2 text-center">
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: meta?.color + "20", color: meta?.color }}
                      >
                        {meta?.label ?? po.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {pos.length > 6 && (
            <p className="mt-2 text-xs text-slate-400 text-center">
              +{pos.length - 6} órdenes más · Ver todas en Compras
            </p>
          )}
        </div>
      )}

      {/* ── Curva S ────────────────────────────────────────────────────────── */}
      <CurvaS
        valorizaciones={valorizaciones}
        ocTimeline={ocTimeline}
        ventaTotal={ventaTotal}
        startDate={project.start_date as string | null}
        endDate={project.end_date as string | null}
        currency={currency}
      />

    </div>
  );
}

// ── ResultadoOperativo ────────────────────────────────────────────────────────

function ResultadoOperativo({
  ingreso, costoMO, costoOCsReceived, costoServicios, costoTotal, ro, roMargen, roPositive, currency, usandoKardex,
}: {
  ingreso: number; costoMO: number; costoOCsReceived: number; costoServicios: number;
  costoTotal: number; ro: number; roMargen: number; roPositive: boolean;
  currency: string; usandoKardex: boolean;
}) {
  const hasData = ingreso > 0 || costoMO > 0 || costoOCsReceived > 0 || costoServicios > 0;

  if (!hasData) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-5">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-500">Resultado Operativo (RO)</span>
          <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">S10</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Aparecerá al registrar valorizaciones aprobadas o nóminas cerradas.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-4 w-4 text-slate-600" />
        <h3 className="text-sm font-semibold text-slate-700">Resultado Operativo</h3>
        {usandoKardex ? (
          <span className="ml-auto text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
            Kardex PPP ✓
          </span>
        ) : (
          <span className="ml-auto text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
            Basado en OCs recibidas
          </span>
        )}
      </div>

      {/* KPI cards RO */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 mb-4">
        <RoCard
          icon={<DollarSign className="h-3.5 w-3.5" />}
          iconColor="text-green-600 bg-green-50"
          label="Ingreso valorizado"
          value={fmtShort(ingreso, currency)}
          note="Valorizaciones aprobadas"
        />
        <RoCard
          icon={<HardHat className="h-3.5 w-3.5" />}
          iconColor="text-orange-600 bg-orange-50"
          label="Mano de obra"
          value={fmtShort(costoMO, currency)}
          note="Nóminas cerradas"
        />
        <RoCard
          icon={<ShoppingCart className="h-3.5 w-3.5" />}
          iconColor="text-amber-600 bg-amber-50"
          label="Materiales"
          value={fmtShort(costoOCsReceived, currency)}
          note={usandoKardex ? "Vales de salida (PPP)" : "OCs recibidas"}
        />
        <RoCard
          icon={<Wrench className="h-3.5 w-3.5" />}
          iconColor="text-cyan-600 bg-cyan-50"
          label="Subcontratos / Equip."
          value={fmtShort(costoServicios, currency)}
          note="Órdenes de servicio"
        />
        <RoCard
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          iconColor={roPositive ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"}
          label="Resultado Operativo"
          value={`${roPositive ? "+" : ""}${fmtShort(ro, currency)}`}
          note={`Margen: ${roMargen}%`}
          highlight
          positive={roPositive}
        />
      </div>

      {/* Barra de desglose de costos */}
      {costoTotal > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5 text-xs text-slate-500">
            <span>Desglose del costo real</span>
            <span className="tabular-nums">{fmtShort(costoTotal, currency)} total</span>
          </div>
          <div className="h-3 w-full rounded-full overflow-hidden flex">
            {costoMO > 0 && (
              <div className="h-full bg-orange-400"
                style={{ width: `${Math.round((costoMO / costoTotal) * 100)}%` }}
                title={`MO: ${fmtShort(costoMO, currency)}`} />
            )}
            {costoOCsReceived > 0 && (
              <div className="h-full bg-amber-400"
                style={{ width: `${Math.round((costoOCsReceived / costoTotal) * 100)}%` }}
                title={`Materiales: ${fmtShort(costoOCsReceived, currency)}`} />
            )}
            {costoServicios > 0 && (
              <div className="h-full bg-cyan-400"
                style={{ width: `${Math.round((costoServicios / costoTotal) * 100)}%` }}
                title={`Servicios: ${fmtShort(costoServicios, currency)}`} />
            )}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-slate-500">
            {costoMO > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-orange-400 shrink-0" />
                MO ({Math.round((costoMO / costoTotal) * 100)}%)
              </span>
            )}
            {costoOCsReceived > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                Materiales ({Math.round((costoOCsReceived / costoTotal) * 100)}%)
              </span>
            )}
            {costoServicios > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-400 shrink-0" />
                Servicios ({Math.round((costoServicios / costoTotal) * 100)}%)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RoCard({
  icon, iconColor, label, value, note, highlight, positive,
}: {
  icon: React.ReactNode; iconColor: string; label: string;
  value: string; note: string; highlight?: boolean; positive?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-lg border p-3",
      highlight
        ? positive ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"
        : "border-slate-100 bg-slate-50/50"
    )}>
      <div className={cn("inline-flex rounded-md p-1 mb-2", iconColor)}>{icon}</div>
      <p className="text-xs text-slate-500 leading-tight mb-0.5">{label}</p>
      <p className={cn(
        "text-base font-bold leading-tight",
        highlight ? (positive ? "text-emerald-700" : "text-red-700") : "text-slate-800"
      )}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{note}</p>
    </div>
  );
}

// ── CurvaS ────────────────────────────────────────────────────────────────────

function CurvaS({
  valorizaciones,
  ocTimeline,
  ventaTotal,
  startDate,
  endDate,
  currency,
}: {
  valorizaciones: ValPoint[];
  ocTimeline: OCPoint[];
  ventaTotal: number;
  startDate: string | null;
  endDate: string | null;
  currency: string;
}) {
  const sym = currency === "PEN" ? "S/" : "$";

  if (valorizaciones.length === 0 && ocTimeline.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
        <TrendingUp className="h-6 w-6 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-400">Curva S — Avance físico vs planificado</p>
        <p className="text-xs text-slate-300 mt-1">
          {ventaTotal === 0
            ? "Registra el presupuesto venta para ver la curva planificada"
            : "Aparecerá al aprobar valorizaciones"}
        </p>
      </div>
    );
  }

  const projectStart = startDate ? new Date(startDate + "T00:00:00").getTime() : null;
  const projectEnd   = endDate   ? new Date(endDate   + "T00:00:00").getTime() : null;

  // Recopilar todas las fechas únicas
  const dateSet = new Set<string>();
  if (startDate) dateSet.add(startDate);
  valorizaciones.forEach((v) => dateSet.add(v.end_date));
  ocTimeline.forEach((p) => dateSet.add(p.date));
  if (endDate) dateSet.add(endDate);
  const sortedDates = [...dateSet].sort();

  // Pre-indexar OC por fecha para búsqueda rápida
  const ocByDate = new Map<string, number>();
  for (const p of ocTimeline) {
    ocByDate.set(p.date, (ocByDate.get(p.date) ?? 0) + p.amount);
  }
  const valByDate = new Map<string, number>();
  for (const v of valorizaciones) {
    valByDate.set(v.end_date, (valByDate.get(v.end_date) ?? 0) + v.total_amount);
  }

  // Construir serie de puntos
  let cumulReal = 0;
  let cumulCommitted = 0;
  const chartData = sortedDates.map((fecha) => {
    if (valByDate.has(fecha)) cumulReal += valByDate.get(fecha)!;
    if (ocByDate.has(fecha))  cumulCommitted += ocByDate.get(fecha)!;

    let plan: number | null = null;
    if (projectStart && projectEnd && ventaTotal > 0) {
      const ptMs = new Date(fecha + "T00:00:00").getTime() - projectStart;
      const totalMs = projectEnd - projectStart;
      plan = Math.round(Math.max(0, Math.min(1, ptMs / totalMs)) * ventaTotal * 100) / 100;
    }

    return {
      fecha,
      real:      fecha === startDate ? 0 : cumulReal > 0 ? cumulReal : null,
      committed: fecha === startDate ? 0 : cumulCommitted > 0 ? cumulCommitted : null,
      plan,
    };
  });

  function fmtM(n: number) {
    if (n >= 1_000_000) return `${sym} ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${sym} ${(n / 1_000).toFixed(0)}K`;
    return `${sym} ${n.toFixed(0)}`;
  }

  function fmtDate(d: string) {
    return new Date(d + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
  }

  const hasCommitted = ocTimeline.length > 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Curva S — Avance valorizado</h3>
          <p className="text-xs text-slate-400 mt-0.5">Real · Planificado{hasCommitted ? " · Comprometido (OCs)" : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-5 rounded-full bg-blue-500 opacity-60" /> Planificado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-5 rounded-full bg-green-500" /> Real
          </span>
          {hasCommitted && (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-5 rounded-full bg-amber-400" /> Comprometido
            </span>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="fecha"
            tickFormatter={fmtDate}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmtM}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              value != null ? `${sym} ${value.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "—",
              name === "plan" ? "Planificado" : name === "real" ? "Real ejecutado" : "Comprometido",
            ]}
            labelFormatter={(label: string) => fmtDate(label)}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
          />
          <Line
            type="monotone"
            dataKey="plan"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            strokeOpacity={0.6}
            connectNulls
          />
          {hasCommitted && (
            <Line
              type="monotone"
              dataKey="committed"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={false}
              strokeOpacity={0.8}
              connectNulls
            />
          )}
          <Line
            type="monotone"
            dataKey="real"
            stroke="#22c55e"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#22c55e", strokeWidth: 0 }}
            activeDot={{ r: 6 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── DonutChart SVG ────────────────────────────────────────────────────────────

function DonutChart({ data, total }: { data: { name: string; value: number; color: string }[]; total: number }) {
  const R = 54;
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * R;

  let cumulative = 0;
  const segments = data.map((d) => {
    const fraction = total > 0 ? d.value / total : 0;
    const offset   = circumference * (1 - cumulative);
    const dashlen  = circumference * fraction - 1.5;
    cumulative += fraction;
    return { ...d, offset, dashlen };
  });

  return (
    <div className="flex justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke={seg.color}
            strokeWidth="18"
            strokeDasharray={`${Math.max(0, seg.dashlen)} ${circumference}`}
            strokeDashoffset={seg.offset}
            style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="22" fontWeight="700" fill="#1e293b">
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fill="#94a3b8">
          total OC
        </text>
      </svg>
    </div>
  );
}

// ── KpiCard ───────────────────────────────────────────────────────────────────

function KpiCard({
  icon, iconColor, label, value, sub, alert,
}: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: string;
  sub: string;
  alert?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border bg-white p-4",
      alert ? "border-red-200" : "border-slate-200"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("rounded-lg p-1.5", iconColor)}>{icon}</div>
        {alert && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
      </div>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-lg font-bold text-slate-900 leading-tight">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}

