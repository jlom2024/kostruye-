'use client'

import { motion, type Variants, type Easing } from 'framer-motion'
import { Sparkles, Calendar, BarChart3, Users, Zap, Target, ArrowUpRight } from 'lucide-react'

const easeOut: Easing = 'easeOut'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: easeOut },
  }),
}

type Feature = {
  href: string
  span?: boolean
  border: string
  gradient: string
  iconBg: string
  icon: typeof Sparkles
  tag: string
  title: string
  desc: string
  chips?: string[]
}

const features: Feature[] = [
  {
    href: '/register',
    span: true,
    border: 'border-violet-500/20',
    gradient: 'from-violet-600/20 to-fuchsia-600/20',
    iconBg: 'bg-violet-500/20 text-violet-400',
    icon: Sparkles,
    tag: 'Generador IA',
    title: 'IA que genera todo el contenido',
    desc: 'Copies, hooks, CTAs y hashtags optimizados por red social. La IA aprende qué funciona mejor para tu marca.',
    chips: ['🔥 Hook viral para TikTok generado', '📸 Copy Instagram con 28 hashtags', '💼 Post LinkedIn profesional'],
  },
  {
    href: '/register',
    border: 'border-blue-500/20',
    gradient: 'from-blue-600/20 to-cyan-600/20',
    iconBg: 'bg-blue-500/20 text-blue-400',
    icon: Calendar,
    tag: 'Scheduling',
    title: 'Calendario visual',
    desc: 'Programa publicaciones con drag & drop. Ve tu estrategia completa de un vistazo.',
  },
  {
    href: '/register',
    border: 'border-green-500/20',
    gradient: 'from-green-600/20 to-emerald-600/20',
    iconBg: 'bg-green-500/20 text-green-400',
    icon: BarChart3,
    tag: 'Analytics',
    title: 'Analítica en tiempo real',
    desc: 'Alcance, impresiones, CTR, conversiones y engagement por red, formato y fecha.',
  },
  {
    href: '/register',
    border: 'border-orange-500/20',
    gradient: 'from-orange-600/20 to-amber-600/20',
    iconBg: 'bg-orange-500/20 text-orange-400',
    icon: Users,
    tag: 'Leads',
    title: 'Captura de leads',
    desc: 'Formularios, landing pages y links trackeables. Cada campaña conectada a resultados.',
  },
  {
    href: '/register',
    border: 'border-pink-500/20',
    gradient: 'from-pink-600/20 to-rose-600/20',
    iconBg: 'bg-pink-500/20 text-pink-400',
    icon: Target,
    tag: 'Competencia',
    title: 'Benchmark competitivo',
    desc: 'Compara tu performance contra competidores y detecta qué formatos ganan.',
  },
  {
    href: '/register',
    border: 'border-yellow-500/20',
    gradient: 'from-yellow-600/20 to-amber-600/20',
    iconBg: 'bg-yellow-500/20 text-yellow-400',
    icon: Zap,
    tag: 'Autopilot',
    title: 'Auto-publicación inteligente',
    desc: 'Cola de tareas, reintentos automáticos y aprobaciones opcionales. Siempre a tiempo.',
  },
]

export default function FeaturesBento() {
  return (
    <section id="features" className="bg-[#050510] py-28 px-6 scroll-mt-20">
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
          {features.map((f, i) => {
            const Icon = f.icon
            const isLarge = f.span
            return (
              <motion.a
                key={f.title}
                href={f.href}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className={`group relative block rounded-2xl border ${f.border} bg-gradient-to-br ${f.gradient} backdrop-blur-sm transition-all hover:scale-[1.02] hover:brightness-110 ${
                  isLarge ? 'md:col-span-2 p-6' : 'p-5'
                }`}
              >
                <ArrowUpRight className="absolute top-5 right-5 w-4 h-4 text-white/0 group-hover:text-white/40 transition-colors" />
                <div className={`rounded-xl flex items-center justify-center ${f.iconBg} ${isLarge ? 'w-10 h-10 mb-4' : 'w-9 h-9 mb-3'}`}>
                  <Icon className={isLarge ? 'w-5 h-5' : 'w-4 h-4'} />
                </div>
                <span className="text-xs text-white/30 uppercase tracking-widest font-medium">{f.tag}</span>
                <h3 className={`font-bold text-white mt-1 ${isLarge ? 'text-xl mb-2' : 'text-base mb-1'}`}>{f.title}</h3>
                <p className={`text-white/50 ${isLarge ? 'text-sm mb-4' : 'text-xs'}`}>{f.desc}</p>
                {f.chips && (
                  <div className="space-y-2">
                    {f.chips.map((t) => (
                      <div key={t} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 text-xs text-white/60">{t}</div>
                    ))}
                  </div>
                )}
              </motion.a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
