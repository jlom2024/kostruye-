import { Zap } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050510] px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-white text-lg">KREO-PubliCool</span>
        </div>

        <h2 className="text-2xl font-black text-white text-center mb-1">Bienvenido de vuelta</h2>
        <p className="text-sm text-white/40 text-center mb-8">Ingresa para gestionar tus campañas</p>

        <form className="space-y-4">
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
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] shadow-lg shadow-violet-900/40"
          >
            Ingresar
          </button>
        </form>

        <p className="text-center text-sm text-white/30 mt-6">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-violet-400 font-medium hover:underline">
            Regístrate gratis
          </Link>
        </p>
      </div>
    </div>
  )
}
