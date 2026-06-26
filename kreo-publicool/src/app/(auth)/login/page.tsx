import { Megaphone } from 'lucide-react'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-indigo-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">KREO-PubliCool</h1>
              <p className="text-xs text-gray-500">by KREO IA Studio</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-center text-gray-800 mb-1">
            Bienvenido de vuelta
          </h2>
          <p className="text-sm text-gray-500 text-center mb-8">
            Ingresa a tu cuenta para gestionar tus campañas
          </p>

          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                placeholder="tu@empresa.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-violet-600 text-white py-2.5 rounded-lg font-medium hover:bg-violet-700 transition-colors"
            >
              Ingresar
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿No tienes cuenta?{' '}
            <a href="/register" className="text-violet-600 font-medium hover:underline">
              Regístrate gratis
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
