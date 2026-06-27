import Navbar from '@/components/landing/navbar'
import Hero from '@/components/landing/hero'
import Ticker from '@/components/landing/ticker'
import FeaturesBento from '@/components/landing/features-bento'
import HowItWorks from '@/components/landing/how-it-works'
import Pricing from '@/components/landing/pricing'
import CtaFinal from '@/components/landing/cta-final'
import Footer from '@/components/landing/footer'

export default function LandingPage() {
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
