import { Users, Plus, Mail, Phone, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function LeadsPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">Contactos capturados por tus campañas</p>
        </div>
        <button className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
          <Plus className="w-4 h-4" />
          Nuevo formulario
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total leads', value: '0' },
          { label: 'Este mes', value: '0' },
          { label: 'Tasa conversión', value: '0%' },
          { label: 'Formularios activos', value: '0' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">Leads recientes</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Exportar</span>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left py-2 font-medium">Nombre</th>
                <th className="text-left py-2 font-medium">Contacto</th>
                <th className="text-left py-2 font-medium">Campaña</th>
                <th className="text-left py-2 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="py-12 text-center text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Sin leads aún. Crea un formulario en tu campaña.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Formularios activos</h3>
          <div className="flex flex-col items-center justify-center h-40 text-gray-300">
            <Plus className="w-8 h-8 mb-2" />
            <p className="text-xs text-center">Sin formularios. Crea uno desde una campaña.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
