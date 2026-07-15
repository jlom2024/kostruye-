import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SuppliersClient } from "./suppliers-client";

export default async function ProveedoresPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await (supabase as any)
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  const membership = memberships?.[0];

  if (!membership) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <div className="max-w-md">
            <h1 className="text-xl font-bold text-slate-800 mb-2">No se encontró organización</h1>
            <p className="text-slate-500 mb-4">No pareces estar vinculado a ninguna organización. Contacta a tu administrador para que te asigne un rol.</p>
            <button onClick={() => window.location.href = "/proyectos"} className="text-blue-600 hover:underline font-medium">Volver a proyectos</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden bg-slate-50">
        <Topbar title="Proveedores" subtitle="Catálogo de proveedores de la organización" />
        <SuppliersClient organizationId={membership.organization_id} />
      </main>
    </div>
  );
}
