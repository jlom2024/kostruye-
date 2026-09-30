'use client'

import { motion } from 'framer-motion'

const items = [
  '📸 Copy para Instagram generado en 3s',
  '🎵 Hook viral para TikTok',
  '📊 +340% de engagement reportado',
  '💼 Post LinkedIn con 12K impresiones',
  '🚀 Campaña publicada automáticamente',
  '📈 CTR 4.8% — benchmark superado',
  '👥 128 leads capturados este mes',
  '🏆 Publicación top detectada por IA',
  '🤖 Variante de copy aprobada',
  '📅 7 posts programados para la semana',
]

const doubled = [...items, ...items]

export default function Ticker() {
  return (
    <div className="bg-[#07071a] border-y border-white/5 py-4 overflow-hidden">
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      >
        {doubled.map((item, i) => (
          <span key={i} className="text-sm text-white/40 flex-shrink-0">
            {item}
            <span className="mx-8 text-violet-600/40">•</span>
          </span>
        ))}
      </motion.div>
    </div>
  )
}
