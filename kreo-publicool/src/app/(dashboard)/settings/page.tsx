import { Settings, Camera, Globe, Music2, Briefcase, X, Plus, CheckCircle, AlertCircle } from 'lucide-react'

const socialNetworks = [
  { id: 'instagram', label: 'Camera', icon: Camera, color: 'text-pink-500 bg-pink-50 border-pink-200', desc: 'Publica imágenes, reels, stories y carruseles', connected: false },
  { id: 'facebook', label: 'Globe', icon: Globe, color: 'text-blue-600 bg-blue-50 border-blue-200', desc: 'Publica en páginas y grupos de Globe', connected: false },
  { id: 'tiktok', label: 'TikTok', icon: Music2, color: 'text-gray-900 bg-gray-50 border-gray-200', desc: 'Sube videos cortos y gestiona tu cuenta', connected: false },
  { id: 'linkedin', label: 'LinkedIn', icon: Briefcase, color: 'text-blue-700 bg-blue-50 border-blue-200', desc: 'Publica en tu perfil y páginas de empresa', connected: false },
  { id: 'twitter', label: 'X / X', icon: X, color: 'text-gray-900 bg-gray-50 border-gray-200', desc: 'Tweets, threads y media', connected: false },
]

export default function SettingsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">Conecta tus redes sociales y gestiona tu cuenta</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-gray-200">
        {['Redes sociales', 'Organización', 'Equipo', 'Facturación'].map((tab, i) => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              i === 0 ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="max-w-2xl">
        <h2 className="text-base font-semibold text-gray-800 mb-1">Redes sociales conectadas</h2>
        <p className="text-sm text-gray-500 mb-6">
          Conecta tus cuentas para publicar directamente desde KREO-PubliCool.
        </p>

        <div className="space-y-3">
          {socialNetworks.map(({ id, label, icon: Icon, color, desc, connected }) => (
            <div
              key={id}
              className="flex items-center gap-4 p-5 bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition-colors"
            >
              <div className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  {connected ? (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      Conectado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <AlertCircle className="w-3 h-3" />
                      No conectado
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>

              <button className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
                connected
                  ? 'border border-red-200 text-red-600 hover:bg-red-50'
                  : 'bg-violet-600 hover:bg-violet-700 text-white'
              }`}>
                {connected ? 'Desconectar' : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Conectar
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-800">
            <strong>Nota:</strong> Para conectar redes sociales necesitas configurar las OAuth apps en el panel de desarrolladores de cada red. Ver documentación en el CLAUDE.md del proyecto.
          </p>
        </div>
      </div>
    </div>
  )
}
