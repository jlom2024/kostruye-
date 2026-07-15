"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, X, Loader2, Trash2, Pencil, Search, Users } from "lucide-react";

type ClientType = "empresa" | "persona" | "estado";

interface Client {
  id: string;
  name: string;
  type: ClientType;
  ruc: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  district: string | null;
  city: string | null;
  notes: string | null;
  active: boolean;
}

const TYPE_LABELS: Record<ClientType, string> = {
  empresa: "Empresa",
  persona: "Persona natural",
  estado:  "Entidad pública",
};

const TYPE_COLORS: Record<ClientType, string> = {
  empresa: "bg-blue-50 text-blue-700",
  persona: "bg-purple-50 text-purple-700",
  estado:  "bg-green-50 text-green-700",
};

const EMPTY: Omit<Client, "id" | "active"> = {
  name: "", type: "empresa", ruc: "", contact_name: "",
  phone: "", email: "", address: "", district: "", city: "", notes: "",
};

export function ClientesClient({ organizationId }: { organizationId: string }) {
  const supabase = createClient() as any;

  const [clients, setClients]     = useState<Client[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing]     = useState<Client | null>(null);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [form, setForm]           = useState({ ...EMPTY });

  async function load() {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name");
    setClients(data ?? []);
  }

  useEffect(() => { load().finally(() => setLoading(false)); }, [organizationId]); // eslint-disable-line

  const filtered = clients.filter((c) =>
    [c.name, c.ruc, c.contact_name, c.email, c.city].some((f) =>
      f?.toLowerCase().includes(search.toLowerCase())
    )
  );

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY });
    setPanelOpen(true);
  }

  function openEdit(c: Client) {
    setEditing(c);
    setForm({
      name: c.name, type: c.type,
      ruc: c.ruc ?? "", contact_name: c.contact_name ?? "",
      phone: c.phone ?? "", email: c.email ?? "",
      address: c.address ?? "", district: c.district ?? "",
      city: c.city ?? "", notes: c.notes ?? "",
    });
    setPanelOpen(true);
  }

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("El nombre es requerido"); return; }
    setSaving(true);
    const payload = {
      organization_id: organizationId,
      name:         form.name.trim(),
      type:         form.type,
      ruc:          form.ruc?.trim()          || null,
      contact_name: form.contact_name?.trim() || null,
      phone:        form.phone?.trim()        || null,
      email:        form.email?.trim()        || null,
      address:      form.address?.trim()      || null,
      district:     form.district?.trim()     || null,
      city:         form.city?.trim()         || null,
      notes:        form.notes?.trim()        || null,
    };
    if (editing) {
      const { error } = await supabase.from("clients").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Cliente actualizado");
    } else {
      const { error } = await supabase.from("clients").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Cliente creado");
    }
    setSaving(false);
    setPanelOpen(false);
    setEditing(null);
    await load();
  }

  async function handleDelete() {
    if (!editing) return;
    if (!confirm(`¿Eliminar "${editing.name}"?`)) return;
    setDeleting(true);
    const { error } = await supabase.from("clients").delete().eq("id", editing.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Cliente eliminado");
    setPanelOpen(false);
    setEditing(null);
    await load();
  }

  async function toggleActive(c: Client) {
    await supabase.from("clients").update({ active: !c.active }).eq("id", c.id);
    setClients((prev) => prev.map((x) => x.id === c.id ? { ...x, active: !x.active } : x));
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Lista */}
      <div className={cn("flex flex-1 flex-col overflow-y-auto", panelOpen && "mr-[500px]")}>
        <div className="flex items-center gap-3 px-6 py-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, RUC, ciudad..."
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nuevo cliente
          </button>
        </div>

        <div className="px-6 pb-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
              <Users className="mb-3 h-9 w-9 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">
                {search ? "Sin resultados" : "Aún no hay clientes"}
              </p>
              {!search && <p className="mt-1 text-xs text-slate-400">Agrega el primero con "Nuevo cliente"</p>}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {["Nombre", "Tipo", "RUC", "Contacto", "Ciudad", "Estado", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      className={cn("cursor-pointer transition-colors hover:bg-slate-50", !c.active && "opacity-50")}
                      onClick={() => openEdit(c)}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", TYPE_COLORS[c.type])}>
                          {TYPE_LABELS[c.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">{c.ruc ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{c.contact_name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{c.city ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", c.active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600")}>
                          {c.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center"><Pencil className="h-3.5 w-3.5 text-slate-300" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
                {filtered.length} cliente{filtered.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Panel lateral */}
      {panelOpen && (
        <div className="fixed right-0 top-0 z-40 flex h-screen w-[500px] flex-col border-l border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h3 className="text-base font-bold text-slate-900">
              {editing ? "Editar cliente" : "Nuevo cliente"}
            </h3>
            <div className="flex items-center gap-1">
              {editing && (
                <>
                  <button
                    onClick={() => toggleActive(editing)}
                    className="rounded-md px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-100"
                    title={editing.active ? "Desactivar" : "Activar"}
                  >
                    {editing.active ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </>
              )}
              <button onClick={() => { setPanelOpen(false); setEditing(null); }} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <Fld label="Tipo de cliente">
              <div className="flex gap-2">
                {(["empresa", "persona", "estado"] as ClientType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => set("type", t)}
                    className={cn(
                      "flex-1 rounded-lg border py-2 text-xs font-medium transition-colors",
                      form.type === t
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-500 hover:border-slate-300"
                    )}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </Fld>

            <Fld label="Nombre / Razón social *">
              <input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} className={inp()} placeholder="Inmobiliaria Lima Norte S.A.C." autoFocus />
            </Fld>

            <Fld label="RUC / DNI">
              <input value={form.ruc ?? ""} onChange={(e) => set("ruc", e.target.value)} className={inp()} placeholder="20123456789" maxLength={11} />
            </Fld>

            <div className="grid grid-cols-2 gap-4">
              <Fld label="Contacto principal">
                <input value={form.contact_name ?? ""} onChange={(e) => set("contact_name", e.target.value)} className={inp()} placeholder="Carlos Ramírez" />
              </Fld>
              <Fld label="Teléfono">
                <input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} className={inp()} placeholder="987 654 321" />
              </Fld>
            </div>

            <Fld label="Email">
              <input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} className={inp()} placeholder="contacto@empresa.com" />
            </Fld>

            <Fld label="Dirección">
              <input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} className={inp()} placeholder="Av. Javier Prado Este 1234" />
            </Fld>

            <div className="grid grid-cols-2 gap-4">
              <Fld label="Distrito">
                <input value={form.district ?? ""} onChange={(e) => set("district", e.target.value)} className={inp()} placeholder="San Isidro" />
              </Fld>
              <Fld label="Ciudad">
                <input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} className={inp()} placeholder="Lima" />
              </Fld>
            </div>

            <Fld label="Notas">
              <textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={3} className={inp() + " resize-none"} placeholder="Condiciones contractuales, personas de contacto adicionales..." />
            </Fld>
          </div>

          <div className="border-t border-slate-200 px-6 py-4">
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editing ? "Guardar cambios" : "Crear cliente"}
              </button>
              <button
                onClick={() => { setPanelOpen(false); setEditing(null); }}
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
