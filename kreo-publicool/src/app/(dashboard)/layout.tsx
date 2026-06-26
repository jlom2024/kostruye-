import { LayoutDashboard, Megaphone, Calendar, BarChart3, Users, Settings, Zap, Building2 } from 'lucide-react'
import Link from 'next/link'

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/brands', icon: Building2, label: 'Marcas' },
  { href: '/campaigns', icon: Megaphone, label: 'Campañas' },
  { href: '/calendar', icon: Calendar, label: 'Calendario' },
  { href: '/analytics', icon: BarChart3, label: 'Analítica' },
  { href: '/leads', icon: Users, label: 'Leads' },
  { href: '/settings', icon: Settings, label: 'Configuración' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">PubliCool</p>
              <p className="text-xs text-gray-400">KREO IA Studio</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-violet-50 hover:text-violet-700 transition-colors"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
            <div className="w-7 h-7 bg-violet-200 rounded-full flex items-center justify-center text-xs font-bold text-violet-700">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">Antu</p>
              <p className="text-xs text-gray-400">Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  )
}
