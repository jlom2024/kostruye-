import Anthropic from '@anthropic-ai/sdk'
import type { SocialNetwork, CampaignObjective, ContentFormat } from '@/types/database'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface GenerateContentInput {
  brandName: string
  brandTone?: string
  industry?: string
  campaignObjective: CampaignObjective
  network: SocialNetwork
  format: ContentFormat
  topic?: string
  targetAudience?: string
  keywords?: string[]
  variants?: number
}

interface GeneratedContent {
  hook: string
  copy: string
  cta: string
  hashtags: string[]
}

const networkSpecs: Record<SocialNetwork, string> = {
  instagram: 'Instagram (máx 2200 chars, usa emojis, 20-30 hashtags)',
  facebook: 'Facebook (máx 63206 chars, tono conversacional, 3-5 hashtags)',
  tiktok: 'TikTok (máx 2200 chars, muy energético, 3-5 hashtags trending)',
  linkedin: 'LinkedIn (máx 3000 chars, tono profesional, 3-5 hashtags de industria)',
  twitter: 'X/Twitter (máx 280 chars, conciso e impactante, 1-2 hashtags)',
}

const objectiveLabels: Record<CampaignObjective, string> = {
  awareness: 'reconocimiento de marca',
  engagement: 'generar interacción',
  traffic: 'llevar tráfico al sitio web',
  leads: 'capturar leads',
  sales: 'generar ventas',
  conversions: 'convertir usuarios',
}

export async function generateContent(input: GenerateContentInput): Promise<GeneratedContent[]> {
  const { brandName, brandTone, industry, campaignObjective, network, format, topic, targetAudience, keywords, variants = 3 } = input

  const systemPrompt = `Eres un experto en marketing digital y copywriting para redes sociales.
Generas contenido efectivo, auténtico y orientado a resultados.
Siempre respondes en JSON válido.`

  const userPrompt = `Genera ${variants} variaciones de contenido para:

Marca: ${brandName}
${industry ? `Industria: ${industry}` : ''}
${brandTone ? `Tono de voz: ${brandTone}` : ''}
Red social: ${networkSpecs[network]}
Formato: ${format}
Objetivo: ${objectiveLabels[campaignObjective]}
${topic ? `Tema/producto: ${topic}` : ''}
${targetAudience ? `Audiencia objetivo: ${targetAudience}` : ''}
${keywords?.length ? `Palabras clave: ${keywords.join(', ')}` : ''}

Para cada variación genera:
- hook: gancho inicial impactante (1-2 oraciones)
- copy: cuerpo del mensaje completo listo para publicar en ${network}
- cta: llamada a acción específica
- hashtags: array de hashtags relevantes (formato sin #)

Responde SOLO con JSON:
{
  "variants": [
    { "hook": "...", "copy": "...", "cta": "...", "hashtags": ["..."] }
  ]
}`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No se pudo parsear la respuesta de IA')

  const parsed = JSON.parse(jsonMatch[0])
  return parsed.variants as GeneratedContent[]
}

export async function analyzePostPerformance(
  posts: Array<{ copy: string; metrics: { engagement: number; reach: number; clicks: number } }>
): Promise<{ insights: string[]; recommendations: string[] }> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Analiza el rendimiento de estas publicaciones y da insights accionables:
${JSON.stringify(posts, null, 2)}

Responde en JSON: { "insights": ["..."], "recommendations": ["..."] }`
    }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  return jsonMatch ? JSON.parse(jsonMatch[0]) : { insights: [], recommendations: [] }
}
