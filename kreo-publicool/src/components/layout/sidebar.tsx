'use client'

import { LayoutDashboard, Megaphone, Calendar, BarChart3, Users, Settings, Zap, Building2, LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/brands', icon: Building2, label: 'Marcas' },
  { href: '/campaigns', icon: Megaphone, label: 'Campañas' },
  { href: '/calendar', icon: Calendar, label: 'Calendario' },
  { href: '/analytics', icon: BarChart3, label: 'Analítica' },
  { href: '/leads', icon: Users, label: 'Leads' },
]

function NavLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  const pathname = usePathname()
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
        active
          ? 'bg-violet-100 text-violet-700 font-medium'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
      )}
    >
      <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-violet-600' : '')} />
      {label}
    </Link>
  )
}

interface SidebarProps {
  orgName: string
  orgPlan: string
  userInitial: string
  userEmail?: string
}

export function DashboardSidebar({ orgName, orgPlan, userInitial, userEmail }: SidebarProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
    router.push('/login')
  }

  const planLabel = { free: 'Plan Free', starter: 'Starter', pro: 'Pro', agency: 'Agency' }[orgPlan] ?? 'Plan Free'

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-gray-900">PubliCool</p>
            <p className="text-xs text-gray-400">KREO IA Studio</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-gray-100 space-y-1">
        <NavLink href="/settings" icon={Settings} label="Configuración" />
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 mt-2">
          <div className="w-7 h-7 bg-violet-200 rounded-full flex items-center justify-center text-xs font-black text-violet-700 flex-shrink-0">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-700 truncate">{orgName}</p>
            <p className="text-xs text-gray-400">{planLabel}</p>
          </div>
          <button
            onClick={handleSignOut}
            title="Cerrar sesión"
            className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
