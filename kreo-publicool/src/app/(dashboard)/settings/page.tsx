import { Camera, Globe, Music2, Briefcase, X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getCurrentOrg, getOrgSocialAccounts } from '@/lib/supabase/queries'
import { ConnectButton } from './connect-button'

const networkMeta = {
  instagram: { label: 'Instagram', icon: Camera, color: 'text-pink-500 bg-pink-50 border-pink-200', desc: 'Publica imágenes, reels, stories y carruseles. Requiere cuenta Business o Creator.' },
  facebook: { label: 'Facebook', icon: Globe, color: 'text-blue-600 bg-blue-50 border-blue-200', desc: 'Publica en páginas de Facebook. Requiere rol de administrador en la página.' },
  tiktok: { label: 'TikTok', icon: Music2, color: 'text-gray-900 bg-gray-50 border-gray-200', desc: 'Sube videos cortos y gestiona tu cuenta TikTok for Business.' },
  linkedin: { label: 'LinkedIn', icon: Briefcase, color: 'text-blue-700 bg-blue-50 border-blue-200', desc: 'Publica en tu perfil y páginas de empresa de LinkedIn.' },
  twitter: { label: 'X / Twitter', icon: X, color: 'text-gray-900 bg-gray-50 border-gray-200', desc: 'Tweets, threads y contenido multimedia.' },
} as const

type NetworkKey = keyof typeof networkMeta

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string; network?: string; missing?: string }>
}) {
  const ctx = await getCurrentOrg()
  if (!ctx) redirect('/login')

  const sp = await searchParams
  const accounts = await getOrgSocialAccounts(ctx.orgId)

  const connectedNetworks = new Set(accounts.map((a) => a.network as string))

  const connectedAccount = (network: string) =>
    accounts.find((a) => a.network === network)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">Conecta tus redes sociales y gestiona tu cuenta</p>
      </div>

      {/* Alert banners */}
      {sp.connected && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-600" />
          <span>
            <strong className="capitalize">{sp.connected}</strong> conectado correctamente
            {sp.accounts && sp.accounts !== '0' ? ` (${sp.accounts} cuenta${Number(sp.accounts) !== 1 ? 's' : ''})` : ''}.
          </span>
        </div>
      )}
      {sp.error && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span>
            {sp.error === 'missing_credentials'
              ? `Falta configurar ${sp.missing} en las variables de entorno del servidor.`
              : sp.error === 'callback_failed'
              ? `Error al conectar ${sp.network}. Verifica que tu app tenga los permisos correctos.`
              : `Error: ${sp.error}`}
          </span>
        </div>
      )}

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
        <h2 className="text-base font-semibold text-gray-800 mb-1">Redes sociales</h2>
        <p className="text-sm text-gray-500 mb-6">
          Conecta tus cuentas para publicar directamente desde KREO-PubliCool.
        </p>

        <div className="space-y-3">
          {(Object.keys(networkMeta) as NetworkKey[]).map((id) => {
            const { label, icon: Icon, color, desc } = networkMeta[id]
            const connected = connectedNetworks.has(id)
            const account = connectedAccount(id)

            return (
              <div
                key={id}
                className={`flex items-center gap-4 p-5 bg-white border rounded-xl transition-colors ${
                  connected ? 'border-green-200 bg-green-50/30' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    {connected ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
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
                  {connected && account ? (
                    <p className="text-xs text-green-700 mt-0.5">@{account.username}{account.followers ? ` · ${account.followers.toLocaleString()} seguidores` : ''}</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  )}
                </div>

                <ConnectButton network={id} connected={connected} username={account?.username} />
              </div>
            )
          })}
        </div>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Para conectar redes sociales necesitas crear una app en el panel de desarrolladores de cada red
            y añadir las credenciales OAuth en <code className="bg-amber-100 px-1 rounded">.env.local</code>.
          </p>
        </div>
      </div>
    </div>
  )
}
