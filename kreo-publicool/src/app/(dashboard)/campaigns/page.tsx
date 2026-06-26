import { Plus, Megaphone, Filter } from 'lucide-react'
import Link from 'next/link'

export default function CampaignsPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campañas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona todas tus campañas en redes sociales</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            Filtrar
          </button>
          <Link
            href="/campaigns/new"
            className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva campaña
          </Link>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {['Todas', 'Activas', 'Borradores', 'Pausadas', 'Completadas'].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              tab === 'Todas'
                ? 'bg-white text-gray-900 font-medium shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Empty state */}
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
    </div>
  )
}
