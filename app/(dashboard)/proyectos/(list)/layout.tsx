import { Sidebar } from "@/components/layout/sidebar";

export default function ProyectosListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-y-auto bg-slate-50">
        {children}
      </main>
    </div>
  );
}
