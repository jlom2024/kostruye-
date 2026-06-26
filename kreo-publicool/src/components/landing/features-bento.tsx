'use client'

import { motion, type Variants, type Easing } from 'framer-motion'
import { Sparkles, Calendar, BarChart3, Users, Zap, Target } from 'lucide-react'

const easeOut: Easing = 'easeOut'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: easeOut },
  }),
}

export default function FeaturesBento() {
  return (
    <section id="features" className="bg-[#050510] py-28 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm mb-4">
            Todo en un lugar
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Una plataforma.{' '}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Resultados reales.
            </span>
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Todo lo que necesitas para ejecutar campañas profesionales sin depender de 10 herramientas distintas.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Large — IA Generador */}
          <motion.div
            custom={0} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="md:col-span-2 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 p-6 backdrop-blur-sm"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-500/20 text-violet-400 mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs text-white/30 uppercase tracking-widest font-medium">Generador IA</span>
            <h3 className="text-xl font-bold text-white mt-1 mb-2">IA que genera todo el contenido</h3>
            <p className="text-sm text-white/50 mb-4">
              Copies, hooks, CTAs y hashtags optimizados por red social. La IA aprende qué funciona mejor para tu marca.
            </p>
            <div className="space-y-2">
              {['🔥 Hook viral para TikTok generado', '📸 Copy Instagram con 28 hashtags', '💼 Post LinkedIn profesional'].map((t) => (
                <div key={t} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 text-xs text-white/60">{t}</div>
              ))}
            </div>
          </motion.div>

          {/* Calendario */}
          <motion.div
            custom={1} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 p-5 backdrop-blur-sm"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-500/20 text-blue-400 mb-3">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-xs text-white/30 uppercase tracking-widest font-medium">Scheduling</span>
            <h3 className="text-base font-bold text-white mt-1 mb-1">Calendario visual</h3>
            <p className="text-xs text-white/50">Programa publicaciones con drag & drop. Ve tu estrategia completa de un vistazo.</p>
          </motion.div>

          {/* Analytics */}
          <motion.div
            custom={2} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-600/20 to-emerald-600/20 p-5 backdrop-blur-sm"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-green-500/20 text-green-400 mb-3">
              <BarChart3 className="w-4 h-4" />
            </div>
            <span className="text-xs text-white/30 uppercase tracking-widest font-medium">Analytics</span>
            <h3 className="text-base font-bold text-white mt-1 mb-1">Analítica en tiempo real</h3>
            <p className="text-xs text-white/50">Alcance, impresiones, CTR, conversiones y engagement por red, formato y fecha.</p>
          </motion.div>

          {/* Leads */}
          <motion.div
            custom={3} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-600/20 to-amber-600/20 p-5 backdrop-blur-sm"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-500/20 text-orange-400 mb-3">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-xs text-white/30 uppercase tracking-widest font-medium">Leads</span>
            <h3 className="text-base font-bold text-white mt-1 mb-1">Captura de leads</h3>
            <p className="text-xs text-white/50">Formularios, landing pages y links trackeables. Cada campaña conectada a resultados.</p>
          </motion.div>

          {/* Benchmark */}
          <motion.div
            custom={4} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-600/20 to-rose-600/20 p-5 backdrop-blur-sm"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-pink-500/20 text-pink-400 mb-3">
              <Target className="w-4 h-4" />
            </div>
            <span className="text-xs text-white/30 uppercase tracking-widest font-medium">Competencia</span>
            <h3 className="text-base font-bold text-white mt-1 mb-1">Benchmark competitivo</h3>
            <p className="text-xs text-white/50">Compara tu performance contra competidores y detecta qué formatos ganan.</p>
          </motion.div>

          {/* Autopilot */}
          <motion.div
            custom={5} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-600/20 to-amber-600/20 p-5 backdrop-blur-sm"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-yellow-500/20 text-yellow-400 mb-3">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-xs text-white/30 uppercase tracking-widest font-medium">Autopilot</span>
            <h3 className="text-base font-bold text-white mt-1 mb-1">Auto-publicación inteligente</h3>
            <p className="text-xs text-white/50">Cola de tareas, reintentos automáticos y aprobaciones opcionales. Siempre a tiempo.</p>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
