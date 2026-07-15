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
  ClipboardCheck,
  Truck,
  ClipboardList,
  BarChart4,
  Activity,
  Wallet,
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
  { href: "/configuracion/inei", icon: Settings, label: "Índices INEI", roles: ["admin"] },
];

const allProjectNav = [
  { href: "dashboard",      icon: LayoutDashboard, label: "Dashboard",      roles: ["admin", "contador", "user"] },
  { href: "presupuesto",    icon: Calculator,      label: "Presupuesto",    roles: ["admin", "contador"] },
  { href: "presupuesto/formula", icon: Calculator, label: "Fórmulas Polinómicas", roles: ["admin", "contador"] },
  { href: "presupuesto/adicionales", icon: FileText, label: "Control de Cambios", roles: ["admin", "contador"] },
  { href: "compras",        icon: ShoppingCart,    label: "Compras",        roles: ["admin", "contador"] },
  { href: "servicios",      icon: Wrench,          label: "Servicios",      roles: ["admin", "contador"] },
  { href: "almacen",        icon: Warehouse,       label: "Almacén",        roles: ["admin", "user"] },
  { href: "campo/cuaderno", icon: BookOpen,        label: "Cuaderno de Obra",roles: ["admin", "user"] },
  { href: "campo/equipos",  icon: Truck,           label: "Equipos",        roles: ["admin", "user"] },
  { href: "campo/tareo",    icon: ClipboardCheck,  label: "Tareo Diario",   roles: ["admin", "user"] },
  { href: "campo/parte-equipos", icon: ClipboardList, label: "Parte Equipos", roles: ["admin", "user"] },
  { href: "campo/avance",   icon: BarChart4,       label: "Avance Diario",  roles: ["admin", "user"] },
  { href: "campo/hse",      icon: ShieldCheck,     label: "Calidad y HSE",  roles: ["admin", "user"] },
  { href: "campo/productividad", icon: Activity,  label: "Productividad", roles: ["admin", "user", "contador"] },
  { href: "nominas",        icon: Users,           label: "Nóminas",        roles: ["admin", "contador"] },
  { href: "valorizaciones", icon: FileText,        label: "Valorizaciones", roles: ["admin", "contador"] },
  { href: "control-costos", icon: Scale,           label: "Control de Costos", roles: ["admin", "contador"] },
  { href: "lean",           icon: TrendingUp,      label: "Lean",           roles: ["admin", "user"] },
  { href: "contabilidad",   icon: BookOpen,        label: "Contabilidad",   roles: ["admin", "contador"] },
  { href: "caja-chica",     icon: Wallet,          label: "Caja Chica",     roles: ["admin", "contador", "user"] },
  { href: "fideicomiso",    icon: ShieldCheck,     label: "Fideicomiso CORFID", roles: ["admin", "contador"] },
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
              <rect width="32" height="32" rx="7" fill="#0F172A"/>
              <rect x="4" y="2" width="7" height="28" rx="1" fill="#F59E0B"/>
              <line x1="4" y1="10" x2="11" y2="10" stroke="#0F172A" strokeWidth="0.9" opacity="0.35"/>
              <line x1="4" y1="17" x2="11" y2="17" stroke="#0F172A" strokeWidth="0.9" opacity="0.35"/>
              <line x1="4" y1="24" x2="11" y2="24" stroke="#0F172A" strokeWidth="0.9" opacity="0.35"/>
              <line x1="4" y1="10" x2="11" y2="2"  stroke="#0F172A" strokeWidth="0.6" opacity="0.2"/>
              <line x1="4" y1="2"  x2="11" y2="10" stroke="#0F172A" strokeWidth="0.6" opacity="0.2"/>
              <line x1="4" y1="17" x2="11" y2="10" stroke="#0F172A" strokeWidth="0.6" opacity="0.2"/>
              <line x1="4" y1="10" x2="11" y2="17" stroke="#0F172A" strokeWidth="0.6" opacity="0.2"/>
              <line x1="4" y1="24" x2="11" y2="17" stroke="#0F172A" strokeWidth="0.6" opacity="0.2"/>
              <line x1="4" y1="17" x2="11" y2="24" stroke="#0F172A" strokeWidth="0.6" opacity="0.2"/>
              <line x1="4" y1="30" x2="11" y2="24" stroke="#0F172A" strokeWidth="0.6" opacity="0.2"/>
              <line x1="4" y1="24" x2="11" y2="30" stroke="#0F172A" strokeWidth="0.6" opacity="0.2"/>
              <rect x="3" y="1" width="9" height="4" rx="1.5" fill="#B45309"/>
              <polygon points="11,13 11,17 29,5 29,3" fill="#F59E0B"/>
              <line x1="7.5" y1="2" x2="29" y2="4" stroke="#B45309" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="23" y1="10" x2="23" y2="15" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round"/>
              <rect x="21" y="15" width="5" height="2.5" rx="0.8" fill="#9CA3AF"/>
              <path d="M21.5,17.5 C21.5,20.5 24.5,20.5 24.5,17.5" stroke="#9CA3AF" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
              <polygon points="11,17 11,21 26,30 26,28" fill="#F59E0B"/>
              <rect x="3" y="30" width="9" height="2" rx="1" fill="#B45309"/>
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
        <a
          href="/Manual-Kostruye-Plus.pdf"
          download="Manual-Kostruye-Plus.pdf"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-white/8 hover:text-white transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          Manual de usuario
        </a>
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
