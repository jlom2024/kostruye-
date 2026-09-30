import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { MoreHorizontal, Camera, Globe, Music2, Briefcase, X } from 'lucide-react'
import Link from 'next/link'
import type { Campaign, SocialNetwork } from '@/types/database'
import { formatDate } from '@/lib/utils'

const networkIcons: Record<SocialNetwork, React.ReactNode> = {
  instagram: <Camera className="w-3 h-3" />,
  facebook: <Globe className="w-3 h-3" />,
  tiktok: <Music2 className="w-3 h-3" />,
  linkedin: <Briefcase className="w-3 h-3" />,
  twitter: <X className="w-3 h-3" />,
}

const statusConfig = {
  draft: { label: 'Borrador', variant: 'ghost' as const },
  active: { label: 'Activa', variant: 'success' as const },
  paused: { label: 'Pausada', variant: 'warning' as const },
  completed: { label: 'Completada', variant: 'info' as const },
  scheduled: { label: 'Programada', variant: 'default' as const },
}

const objectiveLabels: Record<string, string> = {
  awareness: 'Reconocimiento',
  engagement: 'Interacción',
  traffic: 'Tráfico',
  leads: 'Leads',
  sales: 'Ventas',
  conversions: 'Conversiones',
}

interface Props {
  campaign: Campaign & { postsTotal?: number; postsPublished?: number }
}

export function CampaignCard({ campaign }: Props) {
  const status = statusConfig[campaign.status]
  const progress = campaign.postsTotal
    ? Math.round(((campaign.postsPublished ?? 0) / campaign.postsTotal) * 100)
    : 0

  return (
    <Link href={`/campaigns/${campaign.id}`} className="block">
      <div className="bg-white rounded-xl border border-gray-100 p-5 hover:border-violet-200 hover:shadow-md transition-all group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-violet-700 transition-colors">
              {campaign.name}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{objectiveLabels[campaign.objective]}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={status.variant}>{status.label}</Badge>
            <button className="p-1 text-gray-300 hover:text-gray-600 rounded" onClick={(e) => e.preventDefault()}>
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Networks */}
        <div className="flex items-center gap-1.5 mb-4">
          {campaign.networks.map((n) => (
            <span key={n} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
              {networkIcons[n]}
            </span>
          ))}
        </div>

        {/* Progress */}
        {campaign.postsTotal ? (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{campaign.postsPublished ?? 0} publicaciones</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        ) : null}

        {/* Dates */}
        <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-50 pt-3">
          {campaign.start_date ? (
            <span>{formatDate(campaign.start_date)} — {campaign.end_date ? formatDate(campaign.end_date) : '∞'}</span>
          ) : (
            <span>Sin fechas</span>
          )}
          {campaign.frequency_per_week && (
            <span>{campaign.frequency_per_week}×/semana</span>
          )}
        </div>
      </div>
    </Link>
  )
}
