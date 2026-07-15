"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ShieldCheck, ShieldAlert, Plus, FileText, CheckCircle2,
  AlertTriangle, Trash2, Loader2,
} from "lucide-react";

interface Props {
  projectId: string;
  project: any;
  valorizaciones: any[];
  invoices: any[];
  payrolls: any[];
}

export function FideicomisoClient({ projectId, project, valorizaciones, invoices, payrolls }: Props) {
  const sb = createClient();
  const qc = useQueryClient();

  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedVal, setSelectedVal] = useState("");
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [selectedPayrolls, setSelectedPayrolls] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const sym = project.currency === "USD" ? "$" : "S/";
  const fmt = (n: number) =>
    `${sym} ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Query: solicitudes de fideicomiso
  const { data: requests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["fideicomiso-requests", projectId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("fideicomiso_requests")
        .select(`
          *,
          valorizaciones(val_number, period_name),
          fideicomiso_request_items(*)
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createRequest = useMutation({
    mutationFn: async () => {
      if (!selectedVal) throw new Error("Debes seleccionar una valorización de sustento.");
      const totalInvoices = invoices
        .filter((i) => selectedInvoices.includes(i.id))
        .reduce((sum, i) => sum + Number(i.total), 0);
      const totalPayrolls = payrolls
        .filter((p) => selectedPayrolls.includes(p.id))
        .reduce((sum, p) => sum + Number(p.total_net), 0);
      const grandTotal = totalInvoices + totalPayrolls;

      if (grandTotal === 0) throw new Error("Debes seleccionar al menos un comprobante o planilla a liberar.");

      setLoading(true);

      const reqNum = `SLF-${requests.length + 1}`.padStart(7, "0");

      // 1. Insertar cabecera de la solicitud
      const { data: req, error: rErr } = await sb
        .from("fideicomiso_requests")
        .insert({
          project_id: projectId,
          request_number: reqNum,
          valorizacion_id: selectedVal,
          total_amount: grandTotal,
          notes,
          status: "submitted",
        })
        .select()
        .single();

      if (rErr || !req) throw new Error(rErr?.message ?? "Error al crear solicitud.");

      // 2. Insertar ítems
      const itemsPayload: any[] = [];
      invoices
        .filter((i) => selectedInvoices.includes(i.id))
        .forEach((i) => {
          itemsPayload.push({
            request_id: req.id,
            item_type: "invoice",
            reference_id: i.id,
            description: `Factura ${i.numero_formateado} - ${i.receptor_razon_social}`,
            amount: Number(i.total),
          });
        });

      payrolls
        .filter((p) => selectedPayrolls.includes(p.id))
        .forEach((p) => {
          itemsPayload.push({
            request_id: req.id,
            item_type: "payroll",
            reference_id: p.id,
            description: `Planilla Semanal - ${p.period_name}`,
            amount: Number(p.total_net),
          });
        });

      const { error: itemsErr } = await sb.from("fideicomiso_request_items").insert(itemsPayload);
      if (itemsErr) throw new Error(itemsErr.message);

      return req;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fideicomiso-requests", projectId] });
      toast.success("✅ Solicitud de Liberación creada correctamente.");
      setPanelOpen(false);
      setSelectedVal("");
      setSelectedInvoices([]);
      setSelectedPayrolls([]);
      setNotes("");
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  const deleteRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("fideicomiso_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fideicomiso-requests", projectId] });
      toast.success("Solicitud eliminada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await sb
        .from("fideicomiso_requests")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fideicomiso-requests", projectId] });
      toast.success("Estado de solicitud actualizado.");
    },
  });

  const toggleInvoice = (id: string) => {
    setSelectedInvoices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const togglePayroll = (id: string) => {
    setSelectedPayrolls((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const totalSelected =
    invoices.filter((i) => selectedInvoices.includes(i.id)).reduce((s, i) => s + Number(i.total), 0) +
    payrolls.filter((p) => selectedPayrolls.includes(p.id)).reduce((s, p) => s + Number(p.total_net), 0);

  const authorized = !!project.fideicomiso_authorized_at;

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className={cn("flex flex-1 flex-col overflow-auto p-6 space-y-6", panelOpen && "mr-[480px]")}>
        {/* Fideicomiso status header */}
        <div className={cn(
          "rounded-xl border p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4",
          authorized ? "bg-emerald-50/50 border-emerald-100" : "bg-amber-50/50 border-amber-100"
        )}>
          <div className="flex gap-3">
            <div className={cn(
              "p-2.5 rounded-lg shrink-0",
              authorized ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            )}>
              {authorized ? <ShieldCheck className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-800">
                {authorized ? "Fideicomiso CORFID Activo" : "Fideicomiso Pendiente de Configuración"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {authorized
                  ? `DH Consultores / CORFID RUC: ${project.fideicomiso_ruc || "Definido"}`
                  : "Por favor, autoriza a DH Consultores en la sección de Configuración para activar CORFID."}
              </p>
            </div>
          </div>
          {authorized && (
            <button
              onClick={() => setPanelOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shrink-0"
            >
              <Plus className="h-4 w-4" /> Nueva Solicitud
            </button>
          )}
        </div>

        {/* Historial de solicitudes */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
            <h3 className="text-base font-semibold text-slate-850">Solicitudes de Liberación de Fondos</h3>
            <p className="text-xs text-slate-500 mt-1">
              Fideicomisos supervisados por CORFID y aprobados por la supervisión de obra.
            </p>
          </div>
          <div className="p-5">
            {requestsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <FileText className="h-10 w-10 text-slate-300 mb-3" />
                <h4 className="text-sm font-semibold text-slate-700">Sin solicitudes creadas</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Empieza creando una nueva solicitud para sustentar el desembolso ante el fiduciario.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((req) => {
                  const statusColors: any = {
                    draft: "bg-slate-100 text-slate-600 border-slate-200",
                    submitted: "bg-blue-100 text-blue-700 border-blue-200",
                    approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
                    rejected: "bg-red-100 text-red-700 border-red-200",
                  };
                  const statusLabels: any = {
                    draft: "Borrador",
                    submitted: "Presentada",
                    approved: "Aprobada por Fiduciario",
                    rejected: "Rechazada",
                  };
                  return (
                    <div key={req.id} className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-sm transition-shadow">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-bold text-slate-800">{req.request_number}</span>
                          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", statusColors[req.status])}>
                            {statusLabels[req.status]}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5">
                          Sustento: Val N° {req.valorizaciones?.val_number ?? "—"} ({req.valorizaciones?.period_name ?? "—"})
                        </p>
                        {req.notes && <p className="text-xs text-slate-400 mt-1 italic">"{req.notes}"</p>}
                      </div>

                      <div className="flex items-center gap-6 self-stretch md:self-auto justify-between">
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Monto Solicitado</p>
                          <p className="text-base font-bold text-slate-800 mt-0.5">{fmt(Number(req.total_amount))}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {req.status === "submitted" && (
                            <>
                              <button
                                className="px-2.5 py-1 text-xs font-semibold border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors"
                                onClick={() => changeStatus.mutate({ id: req.id, status: "approved" })}
                              >
                                Aprobar
                              </button>
                              <button
                                className="px-2.5 py-1 text-xs font-semibold border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors"
                                onClick={() => changeStatus.mutate({ id: req.id, status: "rejected" })}
                              >
                                Rechazar
                              </button>
                            </>
                          )}
                          <button
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg"
                            onClick={() => {
                              if (confirm("¿Eliminar solicitud de liberación?")) {
                                deleteRequest.mutate(req.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Creación Lateral */}
      {panelOpen && (
        <div className="fixed right-0 top-0 z-40 flex h-screen w-[480px] flex-col border-l border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0">
            <div>
              <h3 className="text-base font-bold text-slate-900">Nueva Solicitud de Liberación</h3>
              <p className="text-xs text-slate-500 mt-0.5">Sustenta y agrupa gastos para CORFID</p>
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              className="text-slate-400 hover:text-slate-600 font-semibold"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Sustento */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-600 uppercase">1. Sustento de Producción</label>
              <select
                value={selectedVal}
                onChange={(e) => setSelectedVal(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecciona Valorización Aprobada...</option>
                {valorizaciones.map((val) => (
                  <option key={val.id} value={val.id}>
                    Valorización N° {val.val_number} ({val.period_name}) - {fmt(Number(val.total_amount))}
                  </option>
                ))}
              </select>
            </div>

            {/* Facturas */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600 uppercase">2. Facturas SUNAT a Pagar</label>
              {invoices.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No hay comprobantes de compras pendientes.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                  {invoices.map((inv) => {
                    const isChecked = selectedInvoices.includes(inv.id);
                    return (
                      <label key={inv.id} className="flex items-center gap-3 p-2 bg-white rounded border border-slate-100 hover:border-blue-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleInvoice(inv.id)}
                          className="rounded text-blue-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{inv.receptor_razon_social}</p>
                          <p className="text-[10px] text-slate-400 font-mono">F: {inv.numero_formateado}</p>
                        </div>
                        <span className="text-xs font-bold text-slate-800 shrink-0">{fmt(Number(inv.total))}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Planillas */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600 uppercase">3. Planillas a Liberar</label>
              {payrolls.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No hay nóminas pendientes en este período.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                  {payrolls.map((p) => {
                    const isChecked = selectedPayrolls.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-3 p-2 bg-white rounded border border-slate-100 hover:border-blue-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePayroll(p.id)}
                          className="rounded text-blue-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{p.period_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Planilla Semanal</p>
                        </div>
                        <span className="text-xs font-bold text-slate-800 shrink-0">{fmt(Number(p.total_net))}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notas */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-600 uppercase">Observaciones</label>
              <textarea
                placeholder="Detalle para CORFID sobre esta liberación..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full text-sm border-slate-200 rounded-lg focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 p-6 bg-slate-50 shrink-0 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-slate-700">Monto Total a Liberar:</span>
              <span className="text-lg font-bold text-blue-700">{fmt(totalSelected)}</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPanelOpen(false)}
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => createRequest.mutate()}
                disabled={loading || totalSelected === 0}
                className="flex-[2] px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Procesando..." : "🚀 Enviar a CORFID"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
