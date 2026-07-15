"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, X, Loader2, Trash2, Pencil, Search, Building2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Supplier {
  id: string;
  name: string;
  ruc: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}

const EMPTY_FORM = {
  name:         "",
  ruc:          "",
  contact_name: "",
  phone:        "",
  email:        "",
  address:      "",
  notes:        "",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function SuppliersClient({ organizationId }: { organizationId: string }) {
  const supabase = createClient() as any;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");

  const [panelOpen, setPanelOpen]   = useState(false);
  const [editing, setEditing]       = useState<Supplier | null>(null);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [form, setForm]             = useState({ ...EMPTY_FORM });

  // ── Load ───────────────────────────────────────────────────────────────────

  async function load() {
    const { data } = await supabase
      .from("suppliers")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name");
    setSuppliers(data ?? []);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [organizationId]); // eslint-disable-line

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = suppliers.filter((s) =>
    [s.name, s.ruc, s.contact_name, s.email].some((f) =>
      f?.toLowerCase().includes(search.toLowerCase())
    )
  );

  // ── Panel ──────────────────────────────────────────────────────────────────

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setPanelOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({
      name:         s.name,
      ruc:          s.ruc          ?? "",
      contact_name: s.contact_name ?? "",
      phone:        s.phone        ?? "",
      email:        s.email        ?? "",
      address:      s.address      ?? "",
      notes:        s.notes        ?? "",
    });
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setEditing(null);
  }

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.name.trim()) { toast.error("El nombre es requerido"); return; }
    setSaving(true);

    const payload = {
      organization_id: organizationId,
      name:            form.name.trim(),
      ruc:             form.ruc?.trim()          || null,
      contact_name:    form.contact_name?.trim() || null,
      phone:           form.phone?.trim()        || null,
      email:           form.email?.trim()        || null,
      address:         form.address?.trim()      || null,
      notes:           form.notes?.trim()        || null,
    };

    if (editing) {
      const { error } = await supabase.from("suppliers").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Proveedor actualizado");
    } else {
      const { error } = await supabase.from("suppliers").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Proveedor creado");
    }

    setSaving(false);
    closePanel();
    await load();
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!editing) return;
    if (!confirm(`¿Eliminar "${editing.name}"? Se desvinculará de todas las OC donde aparece.`)) return;
    setDeleting(true);
    const { error } = await supabase.from("suppliers").delete().eq("id", editing.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Proveedor eliminado");
    closePanel();
    await load();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* ── Lista ─────────────────────────────────────────────────────────── */}
      <div className={cn("flex flex-1 flex-col overflow-y-auto", panelOpen && "mr-[480px]")}>

        {/* Barra búsqueda + acción */}
        <div className="flex items-center gap-3 px-6 py-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, RUC, contacto..."
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nuevo proveedor
          </button>
        </div>

        {/* Tabla */}
        <div className="px-6 pb-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
              <Building2 className="mb-3 h-9 w-9 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">
                {search ? "Sin resultados para esa búsqueda" : "Aún no hay proveedores"}
              </p>
              {!search && (
                <p className="mt-1 text-xs text-slate-400">
                  Agrega el primero con "Nuevo proveedor"
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">RUC</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Contacto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Teléfono</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Email</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      className="cursor-pointer transition-colors hover:bg-slate-50"
                      onClick={() => openEdit(s)}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{s.ruc ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{s.contact_name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{s.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{s.email ?? "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <Pencil className="h-3.5 w-3.5 text-slate-300" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
                {filtered.length} proveedor{filtered.length !== 1 ? "es" : ""}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Panel lateral ─────────────────────────────────────────────────── */}
      {panelOpen && (
        <div className="fixed right-0 top-0 z-40 flex h-screen w-[480px] flex-col border-l border-slate-200 bg-white shadow-xl">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h3 className="text-base font-bold text-slate-900">
              {editing ? "Editar proveedor" : "Nuevo proveedor"}
            </h3>
            <div className="flex items-center gap-1">
              {editing && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  title="Eliminar proveedor"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              )}
              <button
                onClick={closePanel}
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">

            <Fld label="Nombre comercial / Razón social *">
              <input
                value={form.name ?? ""}
                onChange={(e) => set("name", e.target.value)}
                className={inp()}
                placeholder="Ferretería El Maestro S.A.C."
                autoFocus
              />
            </Fld>

            <Fld label="RUC">
              <input
                value={form.ruc ?? ""}
                onChange={(e) => set("ruc", e.target.value)}
                className={inp()}
                placeholder="20123456789"
                maxLength={11}
              />
            </Fld>

            <div className="grid grid-cols-2 gap-4">
              <Fld label="Contacto">
                <input
                  value={form.contact_name ?? ""}
                  onChange={(e) => set("contact_name", e.target.value)}
                  className={inp()}
                  placeholder="Juan Pérez"
                />
              </Fld>
              <Fld label="Teléfono">
                <input
                  value={form.phone ?? ""}
                  onChange={(e) => set("phone", e.target.value)}
                  className={inp()}
                  placeholder="999 888 777"
                />
              </Fld>
            </div>

            <Fld label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={inp()}
                placeholder="ventas@proveedor.com"
              />
            </Fld>

            <Fld label="Dirección">
              <input
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                className={inp()}
                placeholder="Av. Industrial 123, Lima"
              />
            </Fld>

            <Fld label="Notas">
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                className={inp() + " resize-none"}
                placeholder="Condiciones comerciales, tiempo de entrega habitual..."
              />
            </Fld>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 px-6 py-4">
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editing ? "Guardar cambios" : "Crear proveedor"}
              </button>
              <button
                onClick={closePanel}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function inp() {
  return "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition-colors bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}
