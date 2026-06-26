'use client'

import { useState } from 'react'
import { Sparkles, Copy, Check, RefreshCw, ThumbsUp, Camera, Globe, Music2, Briefcase, X, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { SocialNetwork, ContentFormat, CampaignObjective } from '@/types/database'

interface GeneratedVariant {
  hook: string
  copy: string
  cta: string
  hashtags: string[]
}

const networkConfig: Record<SocialNetwork, { label: string; icon: React.ElementType; color: string }> = {
  instagram: { label: 'Camera', icon: Camera, color: 'text-pink-500' },
  facebook: { label: 'Globe', icon: Globe, color: 'text-blue-600' },
  tiktok: { label: 'TikTok', icon: Music2, color: 'text-gray-900' },
  linkedin: { label: 'LinkedIn', icon: Briefcase, color: 'text-blue-700' },
  twitter: { label: 'X / X', icon: X, color: 'text-gray-900' },
}

const formats: { value: ContentFormat; label: string }[] = [
  { value: 'image', label: 'Imagen' },
  { value: 'video', label: 'Video' },
  { value: 'carousel', label: 'Carrusel' },
  { value: 'story', label: 'Story' },
  { value: 'reel', label: 'Reel' },
]

interface Props {
  campaignId: string
  brandName: string
  brandTone?: string
  industry?: string
  objective: CampaignObjective
  networks: SocialNetwork[]
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copiado al portapapeles')
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="p-1.5 text-gray-300 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function VariantCard({ variant, index, onApprove, approved }: {
  variant: GeneratedVariant
  index: number
  onApprove: () => void
  approved: boolean
}) {
  const [expanded, setExpanded] = useState(index === 0)

  return (
    <div className={cn(
      'border rounded-xl transition-all',
      approved ? 'border-violet-400 bg-violet-50' : 'border-gray-200 bg-white'
    )}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3">
          {approved && (
            <span className="w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </span>
          )}
          <div>
            <p className="text-sm font-medium text-gray-800">Variante {index + 1}</p>
            <p className="text-xs text-gray-400 truncate max-w-xs">{variant.hook}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onApprove() }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              approved
                ? 'bg-violet-600 text-white'
                : 'border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700'
            )}
          >
            <ThumbsUp className="w-3 h-3" />
            {approved ? 'Aprobado' : 'Aprobar'}
          </button>
          <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', expanded && 'rotate-180')} />
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hook</span>
              <CopyButton text={variant.hook} />
            </div>
            <p className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2">{variant.hook}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Copy completo</span>
              <CopyButton text={variant.copy} />
            </div>
            <p className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap">{variant.copy}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">CTA</span>
              <CopyButton text={variant.cta} />
            </div>
            <p className="text-sm text-violet-700 font-medium bg-violet-50 rounded-lg px-3 py-2">{variant.cta}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hashtags</span>
              <CopyButton text={variant.hashtags.map((h) => `#${h}`).join(' ')} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {variant.hashtags.map((tag) => (
                <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">#{tag}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function ContentGenerator({ brandName, brandTone, industry, objective, networks }: Props) {
  const [network, setNetwork] = useState<SocialNetwork>(networks[0] ?? 'instagram')
  const [format, setFormat] = useState<ContentFormat>('image')
  const [topic, setTopic] = useState('')
  const [keywords, setKeywords] = useState('')
  const [loading, setLoading] = useState(false)
  const [variants, setVariants] = useState<GeneratedVariant[]>([])
  const [approved, setApproved] = useState<number | null>(null)

  const generate = async () => {
    if (!topic.trim()) { toast.error('Describe el tema o producto de la publicación'); return }
    setLoading(true)
    setVariants([])
    setApproved(null)
    try {
      const res = await fetch('/api/ai/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName, brandTone, industry,
          campaignObjective: objective,
          network, format, topic,
          keywords: keywords ? keywords.split(',').map((k) => k.trim()) : [],
          variants: 3,
        }),
      })
      if (!res.ok) throw new Error('Error del servidor')
      const data = await res.json()
      setVariants(data.variants)
      toast.success('3 variantes generadas con IA')
    } catch {
      toast.error('Error al generar contenido. Verifica tu API key de Anthropic.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left panel — config */}
      <div className="lg:col-span-2 space-y-5">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Configuración</h3>

          <div className="space-y-4">
            {/* Network */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Red social</label>
              <div className="flex flex-wrap gap-2">
                {networks.map((n) => {
                  const cfg = networkConfig[n]
                  const Icon = cfg.icon
                  return (
                    <button
                      key={n}
                      onClick={() => setNetwork(n)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                        network === n ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                    >
                      <Icon className={cn('w-3.5 h-3.5', network === n ? 'text-violet-600' : cfg.color)} />
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Format */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Formato</label>
              <div className="flex flex-wrap gap-2">
                {formats.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setFormat(value)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                      format === value ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Tema / Producto *</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
                placeholder="Ej: Lanzamiento de nueva línea de zapatillas deportivas para runners..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Palabras clave <span className="text-gray-400">(separadas por coma)</span>
              </label>
              <input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="running, zapatillas, deporte, Lima"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <button
              onClick={generate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white py-3 rounded-xl text-sm font-semibold transition-all"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generando con IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generar 3 variantes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Brand context */}
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Contexto de marca</p>
          <div className="space-y-1 text-xs text-gray-600">
            <p><span className="text-gray-400">Marca:</span> {brandName}</p>
            {brandTone && <p><span className="text-gray-400">Tono:</span> {brandTone}</p>}
            {industry && <p><span className="text-gray-400">Industria:</span> {industry}</p>}
            <p><span className="text-gray-400">Objetivo:</span> {objective}</p>
          </div>
        </div>
      </div>

      {/* Right panel — results */}
      <div className="lg:col-span-3">
        {loading && (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-100">
            <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center mb-3 animate-pulse">
              <Sparkles className="w-6 h-6 text-violet-600" />
            </div>
            <p className="text-sm font-medium text-gray-700">Generando contenido con IA...</p>
            <p className="text-xs text-gray-400 mt-1">Analizando tu marca y objetivos</p>
          </div>
        )}

        {!loading && variants.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-dashed border-gray-200">
            <Sparkles className="w-8 h-8 text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">Configura el tema y genera tus variantes</p>
          </div>
        )}

        {!loading && variants.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-800">
                {variants.length} variantes generadas para {networkConfig[network].label}
              </p>
              <button
                onClick={generate}
                className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerar
              </button>
            </div>
            {variants.map((v, i) => (
              <VariantCard
                key={i}
                variant={v}
                index={i}
                approved={approved === i}
                onApprove={() => setApproved(approved === i ? null : i)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
