'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Zap } from 'lucide-react'

export default function CtaFinal() {
  return (
    <section className="bg-[#050510] py-28 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-950/50 to-indigo-950/50 p-12 overflow-hidden"
        >
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-fuchsia-600/10 pointer-events-none" />
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-violet-600/20 border border-violet-500/30 rounded-2xl mb-6">
              <Zap className="w-7 h-7 text-violet-400" />
            </div>

            <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
              Tu marca no solo publica.{' '}
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                Ejecuta estrategia.
              </span>
            </h2>

            <p className="text-white/50 text-lg mb-8 max-w-xl mx-auto">
              Automatización real, medición real y contenido generado por IA. Empieza hoy gratis — sin tarjeta.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-8 py-4 rounded-xl font-bold text-base transition-all shadow-lg shadow-violet-900/50 hover:scale-105"
              >
                <Zap className="w-4 h-4" />
                Empieza gratis — 7 días
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <p className="text-white/25 text-sm mt-5">
              Sin tarjeta · Sin contratos · Cancela cuando quieras
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
