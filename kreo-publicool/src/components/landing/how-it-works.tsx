'use client'

import { motion } from 'framer-motion'
import { LogIn, Megaphone, Sparkles, Rocket, BarChart3 } from 'lucide-react'

const steps = [
  { icon: LogIn, n: '01', title: 'Conecta tus redes', desc: 'Vincula Instagram, Facebook, TikTok, LinkedIn y X con un clic mediante OAuth seguro.' },
  { icon: Megaphone, n: '02', title: 'Crea tu campaña', desc: 'Define objetivo, audiencia, fechas, presupuesto y frecuencia de publicación.' },
  { icon: Sparkles, n: '03', title: 'La IA genera el contenido', desc: 'Copies, hooks, hashtags y creatividades adaptadas a cada red social automáticamente.' },
  { icon: Rocket, n: '04', title: 'Programa y publica', desc: 'Aprueba el contenido, configura el calendario y el sistema publica solo con reintentos automáticos.' },
  { icon: BarChart3, n: '05', title: 'Mide y optimiza', desc: 'Reportes automáticos con métricas clave, benchmark competitivo y detección de contenido top.' },
]

export default function HowItWorks() {
  return (
    <section className="bg-[#07071a] py-28 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="inline-block px-4 py-1.5 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300 text-sm mb-4">
            Flujo de trabajo
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white">
            De idea a campaña en{' '}
            <span className="bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
              5 pasos.
            </span>
          </h2>
        </motion.div>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[27px] top-8 bottom-8 w-px bg-gradient-to-b from-violet-600/50 via-fuchsia-600/50 to-transparent hidden md:block" />

          <div className="space-y-12">
            {steps.map(({ icon: Icon, n, title, desc }, i) => (
              <motion.div
                key={n}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex gap-6 items-start"
              >
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600/30 to-fuchsia-600/30 border border-violet-500/30 flex items-center justify-center relative z-10">
                  <Icon className="w-6 h-6 text-violet-300" />
                </div>
                <div className="pt-1">
                  <span className="text-xs text-white/30 font-mono">{n}</span>
                  <h3 className="text-lg font-bold text-white mt-0.5 mb-1">{title}</h3>
                  <p className="text-sm text-white/50 max-w-xl">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
