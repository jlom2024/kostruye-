import { BarChart3, TrendingUp, Eye, MousePointer, Users, ArrowUpRight } from 'lucide-react'

const metrics = [
  { label: 'Alcance total', value: '0', change: '+0%', icon: Eye, color: 'bg-blue-50 text-blue-600' },
  { label: 'Impresiones', value: '0', change: '+0%', icon: BarChart3, color: 'bg-violet-50 text-violet-600' },
  { label: 'Engagement rate', value: '0%', change: '+0%', icon: TrendingUp, color: 'bg-green-50 text-green-600' },
  { label: 'Clics totales', value: '0', change: '+0%', icon: MousePointer, color: 'bg-orange-50 text-orange-600' },
  { label: 'Leads generados', value: '0', change: '+0%', icon: Users, color: 'bg-pink-50 text-pink-600' },
]

export default function AnalyticsPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analítica</h1>
          <p className="text-sm text-gray-500 mt-0.5">Rendimiento de todas tus campañas</p>
        </div>
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map((p) => (
            <button key={p} className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${p === '30d' ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-8">
        {metrics.map(({ label, value, change, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center mb-3`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
              <ArrowUpRight className="w-3 h-3" />
              {change} vs mes anterior
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Rendimiento por campaña</h3>
          <div className="flex items-center justify-center h-48 text-gray-300">
            <div className="text-center">
              <BarChart3 className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm">Conecta Supabase para ver datos reales</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Mejores publicaciones</h3>
          <div className="flex items-center justify-center h-48 text-gray-300">
            <div className="text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2" />
              <p className="text-xs">Sin datos aún</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
