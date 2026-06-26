import { Zap, Check } from 'lucide-react'
import Link from 'next/link'

const perks = [
  '7 días gratis sin tarjeta',
  'Generador de copies con IA incluido',
  'Conecta 5 redes sociales',
  'Cancela cuando quieras',
]

export default function RegisterPage() {
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

          <form className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Nombre</label>
                <input
                  type="text"
                  placeholder="Antu"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Apellido</label>
                <input
                  type="text"
                  placeholder="Apellido"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Empresa / Agencia</label>
              <input
                type="text"
                placeholder="KREO IA Studio"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Correo electrónico</label>
              <input
                type="email"
                placeholder="tu@empresa.com"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Contraseña</label>
              <input
                type="password"
                placeholder="Mínimo 8 caracteres"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] shadow-lg shadow-violet-900/40 mt-2"
            >
              Crear cuenta gratis
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
