'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Camera, Globe, Music2, Briefcase, X, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  objective: z.enum(['awareness', 'engagement', 'traffic', 'leads', 'sales', 'conversions']),
  networks: z.array(z.enum(['instagram', 'facebook', 'tiktok', 'linkedin', 'twitter'])).min(1, 'Selecciona al menos una red'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  frequency_per_week: z.coerce.number().min(1).max(14).default(3),
  budget: z.coerce.number().min(0).optional(),
  target_audience: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const objectives = [
  { value: 'awareness', label: 'Reconocimiento', desc: 'Dar a conocer tu marca', icon: '📢' },
  { value: 'engagement', label: 'Interacción', desc: 'Likes, comentarios, shares', icon: '❤️' },
  { value: 'traffic', label: 'Tráfico', desc: 'Llevar usuarios a tu sitio', icon: '🔗' },
  { value: 'leads', label: 'Leads', desc: 'Capturar contactos', icon: '📋' },
  { value: 'sales', label: 'Ventas', desc: 'Generar ventas directas', icon: '💰' },
  { value: 'conversions', label: 'Conversiones', desc: 'Acciones específicas', icon: '🎯' },
] as const

const networks = [
  { value: 'instagram', label: 'Instagram', icon: Camera, color: 'text-pink-500 border-pink-200 bg-pink-50' },
  { value: 'facebook', label: 'Facebook', icon: Globe, color: 'text-blue-600 border-blue-200 bg-blue-50' },
  { value: 'tiktok', label: 'TikTok', icon: Music2, color: 'text-gray-900 border-gray-200 bg-gray-50' },
  { value: 'linkedin', label: 'LinkedIn', icon: Briefcase, color: 'text-blue-700 border-blue-200 bg-blue-50' },
  { value: 'twitter', label: 'X / Twitter', icon: X, color: 'text-gray-900 border-gray-200 bg-gray-50' },
] as const

const steps = ['Campaña', 'Redes', 'Calendario', 'Resumen']

export function CreateCampaignWizard() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { networks: [], frequency_per_week: 3, objective: 'awareness' },
  })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form
  const watchedNetworks = watch('networks')
  const watchedObjective = watch('objective')

  const toggleNetwork = (n: FormData['networks'][number]) => {
    const cur = watchedNetworks
    setValue('networks', cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n])
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      // TODO: connect to Supabase
      await new Promise((r) => setTimeout(r, 1000))
      toast.success('Campaña creada correctamente')
      router.push('/campaigns')
    } catch {
      toast.error('Error al crear la campaña')
    } finally {
      setLoading(false)
    }
  }

  const nextStep = async () => {
    const fields: Record<number, (keyof FormData)[]> = {
      0: ['name', 'objective'],
      1: ['networks'],
      2: [],
    }
    const ok = await form.trigger(fields[step])
    if (ok) setStep((s) => s + 1)
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
              i < step ? 'bg-violet-600 text-white' : i === step ? 'bg-violet-600 text-white ring-4 ring-violet-100' : 'bg-gray-100 text-gray-400'
            )}>
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={cn('text-sm', i === step ? 'text-gray-900 font-medium' : 'text-gray-400')}>{s}</span>
            {i < steps.length - 1 && <div className={cn('flex-1 h-px', i < step ? 'bg-violet-300' : 'bg-gray-200')} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 0 — Nombre y objetivo */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de la campaña</label>
              <input
                {...register('name')}
                placeholder="Ej: Lanzamiento producto verano 2026"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Objetivo de la campaña</label>
              <div className="grid grid-cols-2 gap-3">
                {objectives.map((obj) => (
                  <button
                    key={obj.value}
                    type="button"
                    onClick={() => setValue('objective', obj.value)}
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-xl border text-left transition-all',
                      watchedObjective === obj.value
                        ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    )}
                  >
                    <span className="text-xl">{obj.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{obj.label}</p>
                      <p className="text-xs text-gray-500">{obj.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Audiencia objetivo <span className="text-gray-400">(opcional)</span></label>
              <textarea
                {...register('target_audience')}
                rows={2}
                placeholder="Ej: Hombres 25-40 años, interesados en tecnología, Lima Perú"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 1 — Redes sociales */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Redes sociales</label>
              {errors.networks && <p className="text-red-500 text-xs mb-3">{errors.networks.message}</p>}
              <div className="space-y-2">
                {networks.map(({ value, label, icon: Icon, color }) => {
                  const selected = watchedNetworks.includes(value)
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleNetwork(value)}
                      className={cn(
                        'w-full flex items-center gap-4 p-4 rounded-xl border transition-all',
                        selected ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200' : 'border-gray-200 bg-white hover:border-gray-300'
                      )}
                    >
                      <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0', color)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-gray-800">{label}</span>
                      {selected && <Check className="w-4 h-4 text-violet-600 ml-auto" />}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Calendario */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de inicio</label>
                <input
                  type="date"
                  {...register('start_date')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de fin</label>
                <input
                  type="date"
                  {...register('end_date')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Publicaciones por semana: <span className="text-violet-600 font-bold">{watch('frequency_per_week')}</span>
              </label>
              <input
                type="range"
                {...register('frequency_per_week')}
                min={1} max={14}
                className="w-full accent-violet-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1/semana</span>
                <span>14/semana</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Presupuesto mensual (USD) <span className="text-gray-400">(opcional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  {...register('budget')}
                  placeholder="500"
                  className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Notas adicionales <span className="text-gray-400">(opcional)</span>
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                placeholder="Contexto, referencias, restricciones..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 3 — Resumen */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{watch('name')}</h3>
                  <p className="text-sm text-violet-600">{objectives.find(o => o.value === watchedObjective)?.label}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Redes</p>
                  <p className="font-medium text-gray-800 capitalize">{watchedNetworks.join(', ') || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Frecuencia</p>
                  <p className="font-medium text-gray-800">{watch('frequency_per_week')}×/semana</p>
                </div>
                {watch('start_date') && (
                  <div>
                    <p className="text-gray-500">Inicio</p>
                    <p className="font-medium text-gray-800">{watch('start_date')}</p>
                  </div>
                )}
                {watch('budget') ? (
                  <div>
                    <p className="text-gray-500">Presupuesto</p>
                    <p className="font-medium text-gray-800">${watch('budget')}/mes</p>
                  </div>
                ) : null}
              </div>
            </div>
            <p className="text-sm text-gray-500 text-center">
              Una vez creada, podrás generar contenido con IA y programar publicaciones.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={() => step === 0 ? router.push('/campaigns') : setStep((s) => s - 1)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 0 ? 'Cancelar' : 'Anterior'}
          </button>

          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              Siguiente
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {loading ? 'Creando...' : 'Crear campaña'}
              {!loading && <Check className="w-4 h-4" />}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
