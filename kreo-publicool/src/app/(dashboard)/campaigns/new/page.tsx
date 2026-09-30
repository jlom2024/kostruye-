import { CreateCampaignWizard } from '@/components/campaigns/create-campaign-wizard'

export default function NewCampaignPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nueva campaña</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configura tu campaña en redes sociales</p>
      </div>
      <CreateCampaignWizard />
    </div>
  )
}
