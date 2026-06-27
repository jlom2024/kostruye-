import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/landing/navbar'
import Hero from '@/components/landing/hero'
import Ticker from '@/components/landing/ticker'
import FeaturesBento from '@/components/landing/features-bento'
import HowItWorks from '@/components/landing/how-it-works'
import Pricing from '@/components/landing/pricing'
import CtaFinal from '@/components/landing/cta-final'
import Footer from '@/components/landing/footer'

export default async function LandingPage() {
  // Si el usuario ya inició sesión, mandarlo directo al dashboard
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <main className="bg-[#050510]">
      <Navbar />
      <Hero />
      <Ticker />
      <FeaturesBento />
      <section id="como-funciona" className="scroll-mt-20">
        <HowItWorks />
      </section>
      <Pricing />
      <CtaFinal />
      <Footer />
    </main>
  )
}
