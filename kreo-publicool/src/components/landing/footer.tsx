import { Zap } from 'lucide-react'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-[#050510] border-t border-white/5 py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-black text-white">PubliCool</span>
          <a
            href="https://kreoia.site"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/20 text-sm hover:text-white/60 transition-colors"
          >
            by KREO IA Studio
          </a>
        </div>

        <div className="flex items-center gap-6 text-sm text-white/30">
          <Link href="/login" className="hover:text-white/60 transition-colors">Ingresar</Link>
          <Link href="/register" className="hover:text-white/60 transition-colors">Registro</Link>
          <a href="#precios" className="hover:text-white/60 transition-colors">Precios</a>
          <span>
            © {new Date().getFullYear()}{' '}
            <a
              href="https://kreoia.site"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/60 transition-colors"
            >
              KREO IA Studio
            </a>
          </span>
        </div>
      </div>
    </footer>
  )
}
