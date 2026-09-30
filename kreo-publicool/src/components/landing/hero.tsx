'use client'

import { motion, type Variants, type Easing } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Sparkles, Zap } from 'lucide-react'

const easeInOut: Easing = 'easeInOut'

const float: Variants = {
  initial: { y: 0 },
  animate: { y: [-8, 8, -8], transition: { duration: 4, repeat: Infinity, ease: easeInOut } },
}

const orbs = [
  { w: 500, h: 500, top: '-10%', left: '-10%', color: '#7c3aed' },
  { w: 400, h: 400, top: '40%', right: '-8%', color: '#4f46e5' },
  { w: 300, h: 300, bottom: '5%', left: '30%', color: '#6d28d9' },
]

const socialBadges = [
  { label: 'Instagram', emoji: '📸', delay: 0 },
  { label: 'Facebook', emoji: '👥', delay: 0.3 },
  { label: 'TikTok', emoji: '🎵', delay: 0.6 },
  { label: 'LinkedIn', emoji: '💼', delay: 0.9 },
  { label: 'Twitter/X', emoji: '✖️', delay: 1.2 },
]

const stats = [
  { value: '10x', label: 'más rápido que manual' },
  { value: '5 redes', label: 'en un solo lugar' },
  { value: '∞', label: 'contenido con IA' },
]

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#050510]">
      {/* Background orbs */}
      {orbs.map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-20 blur-[120px] pointer-events-none"
          style={{
            width: orb.w,
            height: orb.h,
            top: orb.top,
            left: orb.left,
            right: (orb as any).right,
            bottom: (orb as any).bottom,
            background: orb.color,
          }}
        />
      ))}

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 w-full">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-8"
        >
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Impulsado por IA · KREO IA Studio</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-center mb-6"
        >
          <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.05] tracking-tight">
            Campañas que se{' '}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
                crean solas.
              </span>
              <motion.span
                className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.9 }}
              />
            </span>
            <br />
            <span className="text-white/90">Resultados que se miden solos.</span>
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center text-lg text-white/50 max-w-2xl mx-auto mb-10"
        >
          KREO-PubliCool genera tu contenido, programa tus publicaciones y mide cada resultado —
          en Instagram, Facebook, TikTok, LinkedIn y X desde un solo panel.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <Link
            href="/register"
            className="group flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-7 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-violet-900/40 hover:shadow-violet-700/50 hover:scale-105"
          >
            <Zap className="w-4 h-4" />
            Empieza gratis
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="#como-funciona"
            className="flex items-center gap-2 border border-white/10 text-white/70 hover:text-white hover:border-white/25 px-7 py-3.5 rounded-xl font-medium text-sm transition-all"
          >
            Ver demo en vivo
          </Link>
        </motion.div>

        {/* Floating social badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex flex-wrap justify-center gap-3 mb-16"
        >
          {socialBadges.map(({ label, emoji, delay }) => (
            <motion.div
              key={label}
              variants={float}
              initial="initial"
              animate="animate"
              style={{ animationDelay: `${delay}s` }}
              transition={{ delay }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/70 text-sm backdrop-blur-sm"
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="grid grid-cols-3 gap-8 max-w-lg mx-auto"
        >
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                {value}
              </p>
              <p className="text-xs text-white/40 mt-1">{label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050510] to-transparent pointer-events-none" />
    </section>
  )
}
