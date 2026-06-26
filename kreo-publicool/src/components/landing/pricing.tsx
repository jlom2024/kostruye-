'use client'

import { motion } from 'framer-motion'
import { Check, Zap } from 'lucide-react'
import Link from 'next/link'

const plans = [
  {
    name: 'Starter',
    price: '$29',
    period: '/mes',
    desc: 'Para marcas que recién empiezan a sistematizar su presencia en redes.',
    color: 'border-white/10',
    cta: 'Empezar gratis',
    ctaStyle: 'border border-white/20 text-white hover:border-white/40',
    features: [
      '1 marca / organización',
      '2 redes sociales conectadas',
      '30 publicaciones/mes',
      'Generador de copies con IA',
      'Calendario básico',
      'Analítica esencial',
      'Captura de leads (100/mes)',
    ],
  },
  {
    name: 'Pro',
    price: '$79',
    period: '/mes',
    desc: 'Para empresas y marcas con estrategia activa en múltiples canales.',
    popular: true,
    color: 'border-violet-500/50',
    glow: true,
    cta: 'Comenzar ahora',
    ctaStyle: 'bg-violet-600 hover:bg-violet-500 text-white',
    features: [
      '5 marcas',
      'Todas las redes sociales',
      'Publicaciones ilimitadas',
      'Generador IA avanzado (variantes)',
      'Creación de imagen y flyer',
      'Analítica completa + benchmark',
      'Leads ilimitados + landing pages',
      'Reportes PDF automáticos',
      'Cola de aprobaciones',
    ],
  },
  {
    name: 'Agency',
    price: '$199',
    period: '/mes',
    desc: 'Para agencias que gestionan múltiples clientes con equipo y reportes.',
    color: 'border-white/10',
    cta: 'Hablar con ventas',
    ctaStyle: 'border border-white/20 text-white hover:border-white/40',
    features: [
      'Marcas ilimitadas',
      'Todas las redes sociales',
      'Usuarios del equipo ilimitados',
      'Todo lo de Pro',
      'White-label de reportes',
      'Roles y permisos por cliente',
      'API de integración',
      'Soporte prioritario',
    ],
  },
]

export default function Pricing() {
  return (
    <section id="precios" className="bg-[#050510] py-28 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm mb-4">
            Planes y precios
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Elige tu plan.{' '}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Sin sorpresas.
            </span>
          </h2>
          <p className="text-white/50">7 días gratis en todos los planes. Sin tarjeta de crédito.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative rounded-2xl border ${plan.color} p-6 flex flex-col ${
                plan.popular ? 'bg-gradient-to-b from-violet-950/60 to-[#050510]' : 'bg-white/[0.02]'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1.5 bg-violet-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg shadow-violet-900/50">
                    <Zap className="w-3 h-3" />
                    Más popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-white font-bold text-lg mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-white/40 text-sm">{plan.period}</span>
                </div>
                <p className="text-sm text-white/40">{plan.desc}</p>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-sm text-white/70">
                    <Check className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                    {feat}
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`w-full text-center py-3 rounded-xl font-semibold text-sm transition-all ${plan.ctaStyle}`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
