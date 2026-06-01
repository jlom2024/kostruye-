"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

const CURRENCIES = [
  { value: "PEN", label: "S/ — Soles (PEN)" },
  { value: "USD", label: "$ — Dólares (USD)" },
];

export default function NuevoProyectoPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code:            "",
    name:            "",
    client:          "",
    location:        "",
    currency:        "PEN" as "PEN" | "USD",
    start_date:      "",
    end_date:        "",
    monto_contrato:  "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [montoDisplay, setMontoDisplay] = useState("");

  function handleMontoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMontoDisplay(e.target.value.replace(/[^0-9.]/g, ""));
  }
  function handleMontoBlur() {
    const num = parseFloat(montoDisplay.replace(/,/g, "")) || 0;
    if (!num) { setMontoDisplay(""); return; }
    setMontoDisplay(num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }));
  }
  function handleMontoFocus() {
    setMontoDisplay(montoDisplay.replace(/,/g, ""));
  }

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const errs: Partial<typeof form> = {};
    if (!form.code.trim())   errs.code = "Requerido";
    if (!form.name.trim())   errs.name = "Requerido";
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);

    // Get user's organization
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("No autenticado"); setLoading(false); return; }

    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!membership) {
      toast.error("No perteneces a ninguna organización");
      setLoading(false);
      return;
    }

    // Create project
    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        organization_id: membership.organization_id,
        code:            form.code.trim().toUpperCase(),
        name:            form.name.trim(),
        client:          form.client.trim() || null,
        location:        form.location.trim() || null,
        currency:        form.currency,
        status:          "active",
        start_date:      form.start_date || null,
        end_date:        form.end_date   || null,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message.includes("unique") ? "Ya existe un proyecto con ese código" : error.message);
      setLoading(false);
      return;
    }

    // Add creator as admin of project
    await supabase.from("project_members").insert({
      project_id: project.id,
      user_id:    user.id,
      role:       "admin",
    });

    // Create default budgets (venta + meta)
    const monto = parseFloat(montoDisplay.replace(/,/g, "")) || 0;
    await supabase.from("budgets").insert([
      { project_id: project.id, budget_type: "venta", name: `Presupuesto Venta - ${form.code.trim().toUpperCase()}`, currency: form.currency, total: monto },
      { project_id: project.id, budget_type: "meta",  name: `Presupuesto Meta - ${form.code.trim().toUpperCase()}`,  currency: form.currency, total: 0 },
    ]);

    toast.success("Proyecto creado");
    router.push(`/proyectos/${project.id}/presupuesto`);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-y-auto bg-slate-50">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white px-8 py-5 flex items-center gap-4">
          <Link href="/proyectos" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Nueva Obra</h1>
            <p className="text-sm text-slate-500 mt-0.5">Registra los datos del proyecto</p>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 p-8">
          <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">

            {/* Identification */}
            <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Identificación</h2>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Código de obra *" error={errors.code}>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => set("code", e.target.value)}
                    placeholder="KS-002"
                    className={inputCls(!!errors.code)}
                  />
                </Field>
                <Field label="Moneda" error={errors.currency}>
                  <select
                    value={form.currency}
                    onChange={(e) => set("currency", e.target.value)}
                    className={inputCls(false)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Nombre de la obra *" error={errors.name}>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Ej: Edificio Multifamiliar Los Cedros"
                  className={inputCls(!!errors.name)}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Cliente" error={errors.client}>
                  <input
                    type="text"
                    value={form.client}
                    onChange={(e) => set("client", e.target.value)}
                    placeholder="Nombre del cliente"
                    className={inputCls(false)}
                  />
                </Field>
                <Field label="Ubicación" error={errors.location}>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => set("location", e.target.value)}
                    placeholder="Ciudad, Región"
                    className={inputCls(false)}
                  />
                </Field>
              </div>
              <Field label="Monto de contrato (Presupuesto Venta inicial)" error={errors.monto_contrato}>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    {form.currency === "PEN" ? "S/" : "$"}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={montoDisplay}
                    onChange={handleMontoChange}
                    onBlur={handleMontoBlur}
                    onFocus={handleMontoFocus}
                    placeholder="0"
                    className={inputCls(false) + " pl-9"}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Opcional. Puedes construirlo desde el APU o ingresarlo directo aquí.</p>
              </Field>
            </section>

            {/* Dates */}
            <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Plazo</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Fecha de inicio">
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => set("start_date", e.target.value)}
                    className={inputCls(false)}
                  />
                </Field>
                <Field label="Fecha de fin estimada">
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => set("end_date", e.target.value)}
                    className={inputCls(false)}
                  />
                </Field>
              </div>
            </section>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading ? "Creando..." : "Crear proyecto"}
              </button>
              <Link
                href="/proyectos"
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function inputCls(hasError: boolean) {
  return [
    "w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors",
    "placeholder:text-slate-400",
    hasError
      ? "border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200"
      : "border-slate-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
  ].join(" ");
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
