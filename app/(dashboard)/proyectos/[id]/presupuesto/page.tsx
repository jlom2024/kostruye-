import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { BudgetEditor } from "./budget-editor";
import { ImportOcrButton } from "./import-ocr-button";
import { ImportS10Button } from "./import-s10-button";
import { userCanProject } from "@/lib/permissions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PresupuestoPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) notFound();

  // Permiso de edición de presupuesto/APU — project-aware (misma base que la RLS)
  const canEdit = await userCanProject(supabase, id, "presupuesto", "edit");

  const { data: budgets } = await supabase
    .from("budgets")
    .select("*")
    .eq("project_id", id);

  const ventaBudget = budgets?.find((b) => b.budget_type === "venta");
  const metaBudget  = budgets?.find((b) => b.budget_type === "meta");

  return (
    <>
      <Topbar
        title="Presupuesto"
        subtitle={project.name}
        actions={
          ventaBudget && canEdit ? (
            <div className="flex items-center gap-2">
              <ImportS10Button budgetId={ventaBudget.id} />
              <ImportOcrButton budgetId={ventaBudget.id} />
            </div>
          ) : null
        }
      />

      <div className="flex-1 p-6 space-y-5">
        {/* Tarjetas resumen */}
        <div className="grid gap-4 md:grid-cols-2">
          <BudgetCard type="Venta" color="blue"  budget={ventaBudget} currency={project.currency} />
          <BudgetCard type="Meta"  color="green" budget={metaBudget}  currency={project.currency} />
        </div>

        {/* Selector de presupuesto activo */}
        {ventaBudget && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-slate-700">Presupuesto Venta</h2>
              <span className="text-xs text-slate-400">{ventaBudget.name}</span>
            </div>
            <BudgetEditor
              budgetId={ventaBudget.id}
              currency={project.currency}
              canEdit={canEdit}
            />
          </div>
        )}

        {!ventaBudget && (
          <div className="rounded-xl border-2 border-dashed border-slate-200 py-12 text-center">
            <p className="text-sm text-slate-400">No hay presupuesto configurado para este proyecto.</p>
          </div>
        )}
      </div>
    </>
  );
}

function BudgetCard({
  type, color, budget, currency,
}: {
  type: string;
  color: "blue" | "green";
  budget: { total: number } | undefined;
  currency: string;
}) {
  const colorMap = {
    blue:  { border: "border-blue-200",  bg: "bg-blue-50",  text: "text-blue-700",  label: "text-blue-500"  },
    green: { border: "border-green-200", bg: "bg-green-50", text: "text-green-700", label: "text-green-500" },
  };
  const c = colorMap[color];
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-5`}>
      <p className={`text-xs font-semibold uppercase tracking-wider ${c.label}`}>
        Presupuesto {type}
      </p>
      <p className={`text-2xl font-bold ${c.text} mt-2`}>
        {budget ? formatCurrency(budget.total, currency as "PEN" | "USD") : "—"}
      </p>
      {!budget && <p className="text-xs text-slate-500 mt-1">No configurado</p>}
    </div>
  );
}
