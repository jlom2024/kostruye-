"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Wallet, Plus, Trash2, Loader2, Clock, ShieldCheck,
} from "lucide-react";

interface Props {
  projectId: string;
  currency: string;
  members: any[];
}

export function CajaChicaClient({ projectId, currency, members }: Props) {
  const sb = createClient();
  const qc = useQueryClient();

  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [newBoxPanel, setNewBoxPanel] = useState(false);
  const [newTxPanel, setNewTxPanel] = useState(false);

  // Form nueva caja
  const [boxName, setBoxName] = useState("");
  const [initialBalance, setInitialBalance] = useState("0");
  const [responsibleUser, setResponsibleUser] = useState("");

  // Form nueva transacción
  const [txType, setTxType] = useState<"income" | "expense">("expense");
  const [txAmount, setTxAmount] = useState("");
  const [txConcept, setTxConcept] = useState("");
  const [txDocType, setTxDocType] = useState("Factura");
  const [txDocNum, setTxDocNum] = useState("");
  const [txSupplier, setTxSupplier] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);

  const sym = currency === "USD" ? "$" : "S/";
  const fmt = (n: number) =>
    `${sym} ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Queries
  const { data: boxes = [], isLoading: boxesLoading } = useQuery({
    queryKey: ["petty-cash-boxes", projectId],
    queryFn: async () => {
      const { data, error } = await (sb.from("petty_cash_boxes") as any)
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["petty-cash-transactions", activeBoxId],
    enabled: !!activeBoxId,
    queryFn: async () => {
      const { data, error } = await (sb.from("petty_cash_transactions") as any)
        .select("*")
        .eq("box_id", activeBoxId!)
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createBox = useMutation({
    mutationFn: async () => {
      if (!boxName.trim() || !responsibleUser) throw new Error("Nombre y responsable son requeridos.");
      const { error } = await (sb.from("petty_cash_boxes") as any).insert({
        project_id: projectId,
        name: boxName,
        balance: Number(initialBalance) || 0,
        responsible_id: responsibleUser,
        status: "open",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["petty-cash-boxes", projectId] });
      toast.success("✅ Caja chica aperturada correctamente.");
      setNewBoxPanel(false);
      setBoxName("");
      setInitialBalance("0");
      setResponsibleUser("");
    },
    onError: (e) => toast.error(e.message),
  });

  const createTransaction = useMutation({
    mutationFn: async () => {
      if (!txAmount || !txConcept.trim()) throw new Error("Monto y concepto son requeridos.");
      const { error } = await (sb.from("petty_cash_transactions") as any).insert({
        box_id: activeBoxId,
        transaction_type: txType,
        amount: Number(txAmount),
        concept: txConcept,
        document_type: txType === "expense" ? txDocType : null,
        document_number: txType === "expense" ? txDocNum : null,
        supplier_name: txType === "expense" ? txSupplier : null,
        transaction_date: txDate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["petty-cash-transactions", activeBoxId] });
      qc.invalidateQueries({ queryKey: ["petty-cash-boxes", projectId] });
      toast.success("✅ Movimiento registrado con éxito.");
      setNewTxPanel(false);
      setTxAmount("");
      setTxConcept("");
      setTxDocNum("");
      setTxSupplier("");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteBox = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (sb.from("petty_cash_boxes") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["petty-cash-boxes", projectId] });
      toast.success("Caja chica eliminada.");
      setActiveBoxId(null);
    },
  });

  const activeBox = (boxes as any[]).find((b: any) => b.id === activeBoxId);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar Cajas Chicas */}
      <div className="w-80 border-r border-slate-200 bg-slate-50 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <span className="text-xs font-bold text-slate-500 uppercase">Cajas Aperturadas</span>
          <button 
            onClick={() => setNewBoxPanel(true)} 
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
          >
            + Abrir Caja
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {boxesLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : boxes.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              Sin cajas activas. Abre la primera.
            </div>
          ) : (
            (boxes as any[]).map((box: any) => (
              <div
                key={box.id}
                onClick={() => setActiveBoxId(box.id)}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between",
                  activeBoxId === box.id
                    ? "bg-blue-50 border-blue-200 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300"
                )}
              >
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-slate-800 text-sm truncate max-w-[80%]">
                    {box.name}
                  </span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium border",
                    box.status === "open" 
                      ? "bg-green-50 text-green-700 border-green-200" 
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  )}>
                    {box.status === "open" ? "Abierta" : "Cerrada"}
                  </span>
                </div>
                <div className="flex justify-between items-end mt-4">
                  <span className="text-xs text-slate-400">Saldo actual</span>
                  <span className="font-bold text-slate-900">{fmt(Number(box.balance))}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detalle Caja Activa */}
      <div className="flex-1 overflow-auto bg-white flex flex-col">
        {activeBox ? (
          <>
            {/* Header Detalle */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-800">{activeBox.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Control de saldos y rendiciones</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setNewTxPanel(true)} 
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + Registrar Movimiento
                </button>
                <button
                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg"
                  onClick={() => {
                    if (confirm("¿Cerrar esta caja chica de forma definitiva?")) {
                      deleteBox.mutate(activeBox.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Listado Transacciones */}
            <div className="flex-1 p-6 overflow-y-auto">
              {txLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <Wallet className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">Sin movimientos registrados</p>
                  <p className="text-xs text-slate-400 mt-1">Registra un ingreso de fondos o egreso de caja.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Fecha</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Concepto</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Comprobante</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Proveedor</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 w-32">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(transactions as any[]).map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-500 text-xs font-mono">{tx.transaction_date}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800 text-xs">{tx.concept}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">
                            {tx.document_type ? `${tx.document_type} ${tx.document_number ?? ""}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{tx.supplier_name ?? "—"}</td>
                          <td className={cn(
                            "px-4 py-3 text-right font-bold text-xs",
                            tx.transaction_type === "income" ? "text-green-600" : "text-slate-800"
                          )}>
                            {tx.transaction_type === "income" ? "+" : "-"}{fmt(Number(tx.amount))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center p-12">
            <Wallet className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-base font-semibold text-slate-700">Ninguna Caja Chica Seleccionada</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Selecciona una caja chica en el panel lateral o abre una nueva para el control de gastos de la obra.
            </p>
          </div>
        )}
      </div>

      {/* Modal Nueva Caja */}
      {newBoxPanel && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 text-base">Apertura de Caja Chica</h3>
              <p className="text-xs text-slate-500 mt-1">Crea un fondo de caja asignando un responsable de obra.</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase">Nombre de la Caja</label>
                <input
                  placeholder="Caja Chica Obra Principal"
                  value={boxName}
                  onChange={(e) => setBoxName(e.target.value)}
                  className="w-full text-sm border-slate-300 rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase">Fondo Inicial ({sym})</label>
                <input
                  type="number"
                  placeholder="1000.00"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="w-full text-sm border-slate-300 rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase">Responsable de la Rendición</label>
                <select
                  value={responsibleUser}
                  onChange={(e) => setResponsibleUser(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona miembro responsable...</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      Colaborador ({m.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setNewBoxPanel(false)}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => createBox.mutate()}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Aperturar Caja
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nueva Transacción */}
      {newTxPanel && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 text-base">Registrar Movimiento de Caja</h3>
              <p className="text-xs text-slate-500 mt-1">Ingresos de fondos o egresos autorizados.</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTxType("expense")}
                  className={cn(
                    "px-4 py-2 text-sm font-semibold border rounded-lg transition-colors",
                    txType === "expense" 
                      ? "bg-slate-800 text-white border-slate-850" 
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  )}
                >
                  Egreso / Rendición
                </button>
                <button
                  onClick={() => setTxType("income")}
                  className={cn(
                    "px-4 py-2 text-sm font-semibold border rounded-lg transition-colors",
                    txType === "income" 
                      ? "bg-green-600 text-white border-green-700" 
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  )}
                >
                  Reembolso / Ingreso
                </button>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase">Monto ({sym})</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full text-sm border-slate-300 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase">Concepto</label>
                <input
                  placeholder="Compra de clavos 3 pulgadas"
                  value={txConcept}
                  onChange={(e) => setTxConcept(e.target.value)}
                  className="w-full text-sm border-slate-300 rounded-lg"
                />
              </div>

              {txType === "expense" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-600 uppercase">Tipo Comprobante</label>
                      <select
                        value={txDocType}
                        onChange={(e) => setTxDocType(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="Factura">Factura</option>
                        <option value="Boleta">Boleta</option>
                        <option value="Recibo">Recibo Simple</option>
                        <option value="Ninguno">Sin Comprobante</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-600 uppercase">N° Documento</label>
                      <input
                        placeholder="F001-12345"
                        value={txDocNum}
                        onChange={(e) => setTxDocNum(e.target.value)}
                        className="w-full text-sm border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-600 uppercase">Proveedor</label>
                    <input
                      placeholder="Ferretería El Progreso"
                      value={txSupplier}
                      onChange={(e) => setTxSupplier(e.target.value)}
                      className="w-full text-sm border-slate-300 rounded-lg"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase">Fecha del Movimiento</label>
                <input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full text-sm border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setNewTxPanel(false)}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => createTransaction.mutate()}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Guardar Movimiento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
