import { Plus, Megaphone } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentOrg, getOrgCampaigns } from '@/lib/supabase/queries'
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
  draft: 'Borrador', active: 'Activa', paused: 'Pausada', completed: 'Completada', scheduled: 'Programada',
}

const objectiveLabels: Record<string, string> = {
  awareness: 'Reconocimiento', engagement: 'Interacción', traffic: 'Tráfico',
  leads: 'Leads', sales: 'Ventas', conversions: 'Conversiones',
}

export default async function CampaignsPage() {
  const ctx = await getCurrentOrg()
  if (!ctx) redirect('/login')

  const campaigns = await getOrgCampaigns(ctx.orgId)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campañas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {campaigns.length} campaña{campaigns.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva campaña
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-14 h-14 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-7 h-7 text-violet-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Sin campañas aún</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto mb-6">
            Crea tu primera campaña y empieza a publicar contenido con IA en todas tus redes.
          </p>
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Crear campaña
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 px-6 py-3">Campaña</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Objetivo</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Redes</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Estado</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Creada</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaigns.map((c: Campaign) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Megaphone className="w-3.5 h-3.5 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{c.name}</p>
                        {c.frequency_per_week && (
                          <p className="text-xs text-gray-400">{c.frequency_per_week}×/semana</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-600">{objectiveLabels[c.objective] ?? c.objective}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs text-gray-500 capitalize">{c.networks.join(', ')}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {statusLabels[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/campaigns/${c.id}/content`}
                      className="text-xs text-violet-600 hover:underline font-medium"
                    >
                      Generar contenido →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
