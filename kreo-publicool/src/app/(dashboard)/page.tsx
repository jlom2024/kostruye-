import { Megaphone, Users, TrendingUp, Eye, BarChart3, Plus } from 'lucide-react'
import Link from 'next/link'

const kpis = [
  { label: 'Campañas activas', value: '0', icon: Megaphone, color: 'bg-violet-100 text-violet-600' },
  { label: 'Publicaciones hoy', value: '0', icon: BarChart3, color: 'bg-blue-100 text-blue-600' },
  { label: 'Alcance total', value: '0', icon: Eye, color: 'bg-green-100 text-green-600' },
  { label: 'Leads capturados', value: '0', icon: Users, color: 'bg-orange-100 text-orange-600' },
  { label: 'Engagement rate', value: '0%', icon: TrendingUp, color: 'bg-pink-100 text-pink-600' },
]

export default function DashboardPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bienvenido a KREO-PubliCool</p>
        </div>
        <Link
          href="/campaigns/new"
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva campaña
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center mb-3`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Empty state */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
        <div className="w-14 h-14 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Megaphone className="w-7 h-7 text-violet-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Comienza tu primera campaña
        </h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
          Crea campañas en redes sociales con IA, programa publicaciones y mide resultados desde un solo lugar.
        </p>
        <Link
          href="/campaigns/new"
          className="inline-flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Crear primera campaña
        </Link>
      </div>
    </div>
  )
}
