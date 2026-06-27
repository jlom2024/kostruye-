import { Megaphone, Users, TrendingUp, Eye, BarChart3, Plus, Building2 } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentOrg, getOrgStats, getOrgCampaigns } from '@/lib/supabase/queries'
import { formatDate } from '@/lib/utils'
import type { Campaign } from '@/types/database'

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  scheduled: 'bg-violet-100 text-violet-700',
}

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activa',
  paused: 'Pausada',
  completed: 'Completada',
  scheduled: 'Programada',
}

export default async function DashboardPage() {
  const ctx = await getCurrentOrg()
  if (!ctx) redirect('/login')

  const [stats, recentCampaigns] = await Promise.all([
    getOrgStats(ctx.orgId),
    getOrgCampaigns(ctx.orgId),
  ])

  const meta = ctx.user.user_metadata ?? {}
  const firstName = ((meta.full_name as string) || ctx.user.email || '').split(' ')[0]

  const kpis = [
    { label: 'Campañas activas', value: String(stats.activeCampaigns), icon: Megaphone, color: 'bg-violet-100 text-violet-600' },
    { label: 'Total campañas', value: String(stats.totalCampaigns), icon: BarChart3, color: 'bg-blue-100 text-blue-600' },
    { label: 'Marcas', value: String(stats.totalBrands), icon: Building2, color: 'bg-green-100 text-green-600' },
    { label: 'Leads totales', value: String(stats.totalLeads), icon: Users, color: 'bg-orange-100 text-orange-600' },
    { label: 'Engagement rate', value: '—', icon: TrendingUp, color: 'bg-pink-100 text-pink-600' },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hola, {firstName} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{ctx.org.name} · {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
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

      {/* Campaigns list or empty state */}
      {recentCampaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-14 h-14 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-7 h-7 text-violet-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Comienza tu primera campaña</h3>
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
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Campañas recientes</h2>
            <Link href="/campaigns" className="text-xs text-violet-600 hover:underline font-medium">
              Ver todas →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentCampaigns.slice(0, 5).map((c: Campaign) => (
              <div key={c.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Megaphone className="w-4 h-4 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {c.networks.join(', ')} · {c.frequency_per_week}×/semana
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {statusLabels[c.status] ?? c.status}
                </span>
                <p className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
                  {formatDate(c.created_at)}
                </p>
                <Link
                  href={`/campaigns/${c.id}/content`}
                  className="text-xs text-violet-600 hover:underline flex-shrink-0 font-medium"
                >
                  Abrir
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
