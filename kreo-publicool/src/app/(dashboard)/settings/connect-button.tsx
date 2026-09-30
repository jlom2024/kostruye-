'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  network: string
  connected: boolean
  username?: string
}

export function ConnectButton({ network, connected, username }: Props) {
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    window.location.href = `/api/social/auth/${network}`
  }

  const handleDisconnect = async () => {
    if (!confirm(`¿Desconectar ${username ? `@${username}` : network}?`)) return
    setLoading(true)
    const res = await fetch(`/api/social/disconnect/${network}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success(`${network} desconectado`)
      window.location.reload()
    } else {
      toast.error('Error al desconectar')
      setLoading(false)
    }
  }

  if (connected) {
    return (
      <button
        onClick={handleDisconnect}
        disabled={loading}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 transition-all flex-shrink-0"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Desconectar'}
      </button>
    )
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-60 transition-all flex-shrink-0"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
        <>
          <Plus className="w-3.5 h-3.5" />
          Conectar
        </>
      )}
    </button>
  )
}
