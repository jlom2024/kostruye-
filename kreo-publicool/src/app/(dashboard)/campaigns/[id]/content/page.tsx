import { ContentGenerator } from '@/components/content/content-generator'
import { Sparkles } from 'lucide-react'

export default function ContentPage({ params }: { params: { id: string } }) {
  // TODO: fetch campaign from Supabase — using mock data until connected
  const mockCampaign = {
    id: params.id,
    brandName: 'Mi Marca',
    brandTone: 'profesional y cercano',
    industry: 'Retail',
    objective: 'engagement' as const,
    networks: ['instagram', 'facebook'] as const,
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Generador de contenido IA</h1>
          <p className="text-sm text-gray-500">Genera copies, hooks y hashtags optimizados por red social</p>
        </div>
      </div>

      <ContentGenerator
        campaignId={mockCampaign.id}
        brandName={mockCampaign.brandName}
        brandTone={mockCampaign.brandTone}
        industry={mockCampaign.industry}
        objective={mockCampaign.objective}
        networks={[...mockCampaign.networks]}
      />
    </div>
  )
}
