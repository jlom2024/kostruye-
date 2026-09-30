'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Check } from 'lucide-react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { slugify } from '@/lib/utils'

const perks = [
  '7 días gratis sin tarjeta',
  'Generador de copies con IA incluido',
  'Conecta 5 redes sociales',
  'Cancela cuando quieras',
]

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ firstName: '', lastName: '', company: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setLoading(true)
    const supabase = createBrowserClient()
    const fullName = `${form.firstName} ${form.lastName}`.trim()
    const orgSlug = slugify(form.company || form.email.split('@')[0])

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: fullName,
          company: form.company,
          org_slug: orgSlug,
        },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050510] px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-violet-600/20 border border-violet-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-violet-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">Revisa tu correo</h2>
          <p className="text-white/40 text-sm leading-relaxed mb-8">
            Enviamos un enlace de confirmación a <span className="text-white/70">{form.email}</span>.
            Haz clic en el enlace para activar tu cuenta.
          </p>
          <Link
            href="/login"
            className="inline-block bg-violet-600 hover:bg-violet-500 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all"
          >
            Volver al login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-[#050510]">
      {/* Left panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-white text-lg">KREO-PubliCool</span>
          </div>

          <h2 className="text-3xl font-black text-white mb-2">Empieza gratis hoy</h2>
          <p className="text-white/40 text-sm mb-8">
            Sin tarjeta de crédito · 7 días de prueba completa
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Nombre</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={set('firstName')}
                  placeholder="Antu"
                  required
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Apellido</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={set('lastName')}
                  placeholder="Apellido"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Empresa / Agencia</label>
              <input
                type="text"
                value={form.company}
                onChange={set('company')}
                placeholder="KREO IA Studio"
                required
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Correo electrónico</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="tu@empresa.com"
                required
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="Mínimo 8 caracteres"
                required
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] shadow-lg shadow-violet-900/40 mt-2"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
            </button>
          </form>

          <p className="text-center text-sm text-white/30 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-violet-400 font-medium hover:underline">
              Ingresar
            </Link>
          </p>

          <p className="text-center text-xs text-white/20 mt-4">
            Al registrarte aceptas los términos de servicio y la política de privacidad.
          </p>
        </div>
      </div>

      {/* Right panel — promo */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-violet-950 to-indigo-950 border-l border-white/5 px-12">
        <div>
          <div className="inline-block px-4 py-1.5 rounded-full bg-violet-600/20 border border-violet-500/30 text-violet-300 text-sm mb-8">
            7 días gratis — sin límites
          </div>
          <h3 className="text-4xl font-black text-white leading-tight mb-4">
            Tu marca no solo publica.
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Ejecuta estrategia.
            </span>
          </h3>
          <p className="text-white/40 text-sm mb-10 max-w-sm">
            Automatización real, IA generando tu contenido y métricas que importan.
          </p>

          <ul className="space-y-3">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-3 text-sm text-white/70">
                <div className="w-5 h-5 rounded-full bg-violet-600/30 border border-violet-500/50 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-violet-400" />
                </div>
                {perk}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
