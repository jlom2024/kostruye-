import { NextRequest, NextResponse } from 'next/server'
import { generateContent } from '@/lib/ai/content-generator'
import { z } from 'zod'

const schema = z.object({
  brandName: z.string().min(1),
  brandTone: z.string().optional(),
  industry: z.string().optional(),
  campaignObjective: z.enum(['awareness', 'engagement', 'traffic', 'leads', 'sales', 'conversions']),
  network: z.enum(['instagram', 'facebook', 'tiktok', 'linkedin', 'twitter']),
  format: z.enum(['image', 'flyer', 'video', 'carousel', 'story', 'reel']),
  topic: z.string().optional(),
  targetAudience: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  variants: z.number().min(1).max(5).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = schema.parse(body)
    const variants = await generateContent(input)
    return NextResponse.json({ variants })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.issues }, { status: 400 })
    }
    console.error('Error generando copy:', error)
    return NextResponse.json({ error: 'Error al generar contenido' }, { status: 500 })
  }
}
