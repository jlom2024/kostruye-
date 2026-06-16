"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderKanban,
  Calculator,
  ShoppingCart,
  Warehouse,
  Users,
  FileText,
  TrendingUp,
  BookOpen,
  Settings,
  Settings2,
  LogOut,
  ChevronRight,
  Building2,
  Wrench,
  ShieldCheck,
  Scale,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type OrgRole = "admin" | "contador" | "user" | null;

interface OrgInfo {
  role: OrgRole;
  orgName: string | null;
  orgLogo: string | null;
}

const allMainNav = [
  { href: "/proyectos",   icon: FolderKanban, label: "Proyectos",   roles: ["admin", "contador", "user"] },
  { href: "/clientes",    icon: Users,        label: "Clientes",    roles: ["admin", "contador"] },
  { href: "/proveedores", icon: Building2,    label: "Proveedores", roles: ["admin", "contador"] },
];

const allProjectNav = [
  { href: "dashboard",      icon: LayoutDashboard, label: "Dashboard",      roles: ["admin", "contador", "user"] },
  { href: "presupuesto",    icon: Calculator,      label: "Presupuesto",    roles: ["admin", "contador"] },
  { href: "compras",        icon: ShoppingCart,    label: "Compras",        roles: ["admin", "contador"] },
  { href: "servicios",      icon: Wrench,          label: "Servicios",      roles: ["admin", "contador"] },
  { href: "almacen",        icon: Warehouse,       label: "Almacén",        roles: ["admin", "user"] },
  { href: "nominas",        icon: Users,           label: "Nóminas",        roles: ["admin", "contador"] },
  { href: "valorizaciones", icon: FileText,        label: "Valorizaciones", roles: ["admin", "contador"] },
  { href: "control-costos", icon: Scale,           label: "Control de Costos", roles: ["admin", "contador"] },
  { href: "lean",           icon: TrendingUp,      label: "Lean",           roles: ["admin", "user"] },
  { href: "contabilidad",   icon: BookOpen,        label: "Contabilidad",   roles: ["admin", "contador"] },
  { href: "auditoria",      icon: ShieldCheck,     label: "Auditoría",      roles: ["admin", "contador"] },
  { href: "configuracion",  icon: Settings2,       label: "Configuración",  roles: ["admin"] },
];

interface SidebarProps {
  projectId?: string;
  projectName?: string;
}

export function Sidebar({ projectId, projectName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [org, setOrg] = useState<OrgInfo>({ role: null, orgName: null, orgLogo: null });

  useEffect(() => {
    fetch("/api/org/members")
      .then((r) => r.json())
      .then((d) => {
        setOrg({
          role: d.my_role ?? null,
          orgName: d.org_name ?? null,
          orgLogo: d.org_logo ?? null,
        });
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const { role, orgName, orgLogo } = org;

  const mainNav = role
    ? allMainNav.filter((item) => item.roles.includes(role))
    : allMainNav;

  const projectNav = role
    ? allProjectNav.filter((item) => item.roles.includes(role))
    : allProjectNav;

  const showConfig = role === "admin" || role === null;

  return (
    <aside className="flex h-full w-60 flex-col bg-[#0F1E38] text-white">
      {/* Logo — org logo si existe, sino Kostruye+ */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 min-h-[64px]">
        {orgLogo ? (
          <img
            src={orgLogo}
            alt={orgName ?? "Logo"}
            className="h-8 w-auto max-w-[160px] object-contain"
          />
        ) : (
          <>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <rect width="32" height="32" rx="6" fill="white" fillOpacity="0.08"/>
              <rect x="5" y="5" width="5" height="22" rx="1" fill="white"/>
              <polygon points="10,5 10,15 21,5" fill="white"/>
              <polygon points="10,17 10,27 21,27 16,17" fill="white"/>
              <rect x="16.5" y="8" width="3" height="9" rx="0.75" fill="#60A5FA"/>
              <rect x="14" y="10.5" width="8" height="3" rx="0.75" fill="#60A5FA"/>
            </svg>
            <div className="leading-tight">
              <span className="text-sm font-bold tracking-widest uppercase text-white">KONSTRUYE</span>
              <span className="text-sm font-bold text-blue-400">+</span>
            </div>
          </>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto scrollbar-thin px-3 py-4">

        {mainNav.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              pathname === href
                ? "bg-blue-600/30 text-white font-medium"
                : "text-slate-400 hover:bg-white/8 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}

        {projectId && (
          <>
            <div className="mt-4 mb-1 px-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 uppercase tracking-wider">
                <ChevronRight className="h-3 w-3" />
                <span className="truncate">{projectName ?? "Proyecto"}</span>
              </div>
            </div>

            {projectNav.map(({ href, icon: Icon, label }) => {
              const fullHref = `/proyectos/${projectId}/${href}`;
              const isActive = pathname.startsWith(fullHref);
              return (
                <Link
                  key={href}
                  href={fullHref}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-blue-600/30 text-white font-medium"
                      : "text-slate-400 hover:bg-white/8 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="border-t border-white/10 px-3 py-3 space-y-1">
        {showConfig && (
          <Link
            href="/configuracion"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-white/8 hover:text-white transition-colors"
          >
            <Settings className="h-4 w-4" />
            Configuración
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-white/8 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
