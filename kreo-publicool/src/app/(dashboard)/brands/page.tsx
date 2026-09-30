import { Building2, Plus, Globe, Palette } from 'lucide-react'

export default function BrandsPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marcas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona las marcas de tu organización</p>
        </div>
        <button className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
          <Plus className="w-4 h-4" />
          Nueva marca
        </button>
      </div>

      <div className="bg-white rounded-xl border border-dashed border-gray-200 p-16 text-center">
        <div className="w-14 h-14 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-7 h-7 text-violet-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Sin marcas configuradas</h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
          Crea tu primera marca para organizar tus campañas, conectar redes sociales y definir el tono de comunicación.
        </p>
        <button className="inline-flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
          <Plus className="w-4 h-4" />
          Crear primera marca
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6">
        {[
          { icon: Palette, title: 'Identidad visual', desc: 'Logo, colores y tipografía de la marca' },
          { icon: Globe, title: 'Redes sociales', desc: 'Conecta las cuentas de cada red para esta marca' },
          { icon: Building2, title: 'Tono de voz', desc: 'Define el estilo de comunicación para la IA' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
              <Icon className="w-4 h-4 text-gray-500" />
            </div>
            <h4 className="text-sm font-semibold text-gray-800 mb-1">{title}</h4>
            <p className="text-xs text-gray-500">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
