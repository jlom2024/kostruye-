import type { Metadata } from "next";
import Script from "next/script";
import { JoshyWidget } from "@/components/joshy-widget";

export const metadata: Metadata = {
  title: "KOSTRUYE+ v2.5",
  description:
    "ERP definitivo para constructoras peruanas v2.5. Presupuestos S10, valorizaciones automáticas, almacén, planillas, fideicomiso CORFID, caja chica móvil y analíticas EVM.",
  alternates: { canonical: "https://konstruye.site" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Kostruye+",
  url: "https://konstruye.site",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "ERP de gestión de obras para constructoras peruanas v2.5. Presupuesto S10, valorizaciones automáticas, almacén, fideicomisos CORFID, analíticas EVM y caja chica móvil.",
  offers: [
    {
      "@type": "Offer",
      name: "Plan Piloto",
      price: "0",
      priceCurrency: "PEN",
      description: "Gratis para un proyecto activo",
    },
    {
      "@type": "Offer",
      name: "Plan Pro",
      price: "1099",
      priceCurrency: "PEN",
      description: "Proyectos ilimitados, usuarios ilimitados, todos los módulos, KIA IA incluido",
    },
    {
      "@type": "Offer",
      name: "Plan Enterprise",
      price: "3699",
      priceCurrency: "PEN",
      description: "Multi-empresa, gerente de cuenta dedicado, onboarding, integraciones a medida, SLA 99.9%",
    },
  ],
  creator: {
    "@type": "Organization",
    name: "KREO IA Studio",
    url: "https://konstruye.site",
  },
  inLanguage: "es-PE",
  keywords:
    "software constructoras peru, ERP construccion, gestion obras peru, presupuesto S10, valorizaciones, planilla obreros",
};

export default function Landing() {
  return (
    <>
      <style>{`
        /* ── RESET & BASE ESTILO TRES MARES ── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          background: #FFFFFF !important; 
          color: #1A1A1A; 
          font-family: var(--font-sans), -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; 
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }
        html { scroll-behavior: smooth; }

        /* ── VARIABLES DE DISEÑO (TRES MARES PALETTE) ── */
        :root {
          --color-navy: #0A3D5C;
          --color-navy-dark: #072B41;
          --color-copper: #B8733D;
          --color-copper-light: #C9844E;
          --color-bg-light: #FFFFFF;
          --color-bg-sand: #F5F3EF;
          --color-text-dark: #1A1A1A;
          --color-text-muted: #6B7280;
          --color-border: #E5E1DB;
          --font-serif: var(--font-serif), 'Playfair Display', Georgia, serif;
        }

        h1, h2, h3 {
          font-family: var(--font-serif);
          font-weight: 400;
          letter-spacing: -0.02em;
          line-height: 1.15;
          color: var(--color-navy);
        }

        /* ── PREMIUM ANIMATIONS (SCROLL-TRIGGERED REVEALS) ── */
        .reveal { 
          opacity: 0; 
          transform: translateY(48px); 
          transition: opacity 1.4s cubic-bezier(0.16, 1, 0.3, 1), 
                      transform 1.4s cubic-bezier(0.16, 1, 0.3, 1); 
        }
        .reveal.visible { opacity: 1; transform: translateY(0); }

        .reveal-left { 
          opacity: 0; 
          transform: translateX(-48px); 
          transition: opacity 1.4s cubic-bezier(0.16, 1, 0.3, 1), 
                      transform 1.4s cubic-bezier(0.16, 1, 0.3, 1); 
        }
        .reveal-left.visible { opacity: 1; transform: translateX(0); }

        .reveal-right { 
          opacity: 0; 
          transform: translateX(48px); 
          transition: opacity 1.4s cubic-bezier(0.16, 1, 0.3, 1), 
                      transform 1.4s cubic-bezier(0.16, 1, 0.3, 1); 
        }
        .reveal-right.visible { opacity: 1; transform: translateX(0); }

        .reveal-scale { 
          opacity: 0; 
          transform: scale(0.95); 
          transition: opacity 1.6s cubic-bezier(0.16, 1, 0.3, 1), 
                      transform 1.6s cubic-bezier(0.16, 1, 0.3, 1); 
        }
        .reveal-scale.visible { opacity: 1; transform: scale(1); }

        /* Delay utilities para cascades */
        .d1 { transition-delay: 0.1s; }
        .d2 { transition-delay: 0.2s; }
        .d3 { transition-delay: 0.3s; }
        .d4 { transition-delay: 0.4s; }
        .d5 { transition-delay: 0.5s; }
        .d6 { transition-delay: 0.6s; }

        /* ── MÁSCARA DE IMAGEN REVEAL ── */
        .img-mask-reveal {
          position: relative;
          overflow: hidden;
          width: 100%;
          height: 100%;
        }
        .img-mask-reveal::after {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--color-bg-sand);
          transform: scaleX(1);
          transform-origin: right;
          transition: transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .img-mask-reveal.visible::after {
          transform: scaleX(0);
        }
        .img-mask-reveal img {
          transform: scale(1.15);
          transition: transform 2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .img-mask-reveal.visible img {
          transform: scale(1);
        }

        /* ── SMART FIXED HEADER ── */
        .header-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 90px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 80px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--color-border);
          z-index: 1000;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), background 0.4s ease;
        }
        .header-nav.nav-hidden {
          transform: translateY(-100%);
        }
        .header-nav.scrolled {
          height: 75px;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.02);
          background: rgba(255, 255, 255, 0.95);
        }

        .nav-logo-link {
          display: flex;
          align-items: center;
          text-decoration: none;
        }
        .logo-image {
          height: 42px;
          width: auto;
          object-fit: contain;
          filter: brightness(0) opacity(0.85);
          transition: all 0.3s ease;
        }
        .logo-image:hover {
          filter: brightness(0) opacity(1);
        }

        .nav-menu {
          display: flex;
          list-style: none;
          gap: 40px;
        }
        .nav-menu a {
          color: var(--color-text-dark);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          position: relative;
          padding: 6px 0;
          transition: color 0.3s ease;
        }
        .nav-menu a::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 1px;
          background: var(--color-copper);
          transform: scaleX(0);
          transform-origin: right;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .nav-menu a:hover {
          color: var(--color-copper);
        }
        .nav-menu a:hover::after {
          transform: scaleX(1);
          transform-origin: left;
        }

        /* Botones de acción */
        .btn-action-outline {
          display: inline-flex;
          align-items: center;
          padding: 10px 24px;
          border: 1px solid var(--color-navy);
          background: transparent;
          color: var(--color-navy);
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-action-outline:hover {
          background: var(--color-navy);
          color: #FFFFFF;
        }

        .btn-action-solid {
          display: inline-flex;
          align-items: center;
          padding: 10px 24px;
          border: 1px solid var(--color-copper);
          background: var(--color-copper);
          color: #FFFFFF;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-action-solid:hover {
          background: var(--color-copper-light);
          border-color: var(--color-copper-light);
          transform: translateY(-1px);
        }

        /* ── HERO CON PARALLAX & CURSOR FOLLOW ── */
        .hero-section {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          padding: 120px 80px 80px;
          background: var(--color-bg-sand);
          overflow: hidden;
        }
        .hero-bg-wrapper {
          position: absolute;
          inset: 0;
          z-index: 1;
          overflow: hidden;
          opacity: 0.15;
          filter: grayscale(1);
        }
        .hero-bg-image {
          width: 100%;
          height: 100%;
          background: url('/hero-construction-bw.png') center center / cover no-repeat;
          transform: scale(1.1);
          transition: transform 0.1s ease-out; /* Para cursor follow */
        }
        .hero-grid-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          background-image: linear-gradient(var(--color-border) 1px, transparent 1px),
                            linear-gradient(90deg, var(--color-border) 1px, transparent 1px);
          background-size: 80px 80px;
          opacity: 0.15;
          mask-image: radial-gradient(ellipse at 50% 50%, black 40%, transparent 80%);
        }
        .hero-container {
          position: relative;
          z-index: 3;
          max-width: 1280px;
          width: 100%;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 60px;
          align-items: center;
        }
        .hero-badge-minimal {
          display: inline-flex;
          align-items: center;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--color-copper);
          margin-bottom: 24px;
        }
        .hero-badge-minimal::before {
          content: '';
          width: 24px;
          height: 1px;
          background: var(--color-copper);
          margin-right: 12px;
        }
        .hero-h1-editorial {
          font-size: clamp(48px, 5.5vw, 80px);
          line-height: 1.05;
          margin-bottom: 28px;
        }
        .hero-h1-editorial span {
          color: var(--color-copper);
        }
        .hero-desc-editorial {
          font-size: clamp(16px, 1.3vw, 20px);
          line-height: 1.6;
          color: var(--color-text-dark);
          max-width: 580px;
          margin-bottom: 40px;
          font-weight: 300;
        }
        .hero-ctas-editorial {
          display: flex;
          gap: 16px;
        }
        .hero-right-visual {
          position: relative;
          height: 520px;
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.08);
          border: 1px solid var(--color-border);
        }

        /* ── SECCIÓN DE MÉTRICAS CON COUNTUP ── */
        .metrics-section {
          background: #FFFFFF;
          padding: 100px 80px;
          border-bottom: 1px solid var(--color-border);
        }
        .metrics-container {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 40px;
        }
        .metric-card {
          text-align: left;
          position: relative;
          padding-left: 24px;
          border-left: 1px solid var(--color-border);
        }
        .metric-card:first-child {
          border-left: none;
          padding-left: 0;
        }
        .metric-number {
          font-family: var(--font-serif);
          font-size: clamp(48px, 4.5vw, 68px);
          line-height: 1;
          color: var(--color-navy);
          margin-bottom: 12px;
          font-weight: 300;
        }
        .metric-label {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--color-text-muted);
        }
        .metric-desc {
          font-size: 13px;
          color: var(--color-text-muted);
          margin-top: 8px;
          line-height: 1.4;
        }

        /* ── GENERAL SECTIONS STYLE ── */
        .editorial-section {
          padding: 160px 80px;
          background: #FFFFFF;
        }
        .editorial-section.alt-bg {
          background: var(--color-bg-sand);
        }
        .editorial-container {
          max-width: 1280px;
          margin: 0 auto;
        }
        .section-header-editorial {
          margin-bottom: 80px;
          max-width: 700px;
        }
        .section-tag-editorial {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--color-copper);
          display: block;
          margin-bottom: 16px;
        }
        .section-title-editorial {
          font-size: clamp(32px, 3.5vw, 54px);
          line-height: 1.15;
          margin-bottom: 24px;
        }
        .section-sub-editorial {
          font-size: 16px;
          line-height: 1.6;
          color: var(--color-text-muted);
          font-weight: 300;
        }

        /* ── MÓDULOS EN GRID MINIMALISTA ── */
        .modules-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }
        .module-card-editorial {
          background: #FFFFFF;
          border: 1px solid var(--color-border);
          padding: 40px 32px;
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          min-height: 320px;
        }
        .module-card-editorial:hover {
          transform: translateY(-8px);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.05);
          border-color: var(--color-copper);
        }
        .module-svg-icon {
          width: 36px;
          height: 36px;
          stroke: var(--color-navy);
          stroke-width: 1.5;
          fill: none;
          margin-bottom: 32px;
          transition: stroke 0.3s ease;
        }
        .module-card-editorial:hover .module-svg-icon {
          stroke: var(--color-copper);
        }
        .module-card-title {
          font-family: var(--font-serif);
          font-size: 20px;
          color: var(--color-navy);
          margin-bottom: 12px;
        }
        .module-card-desc {
          font-size: 13px;
          line-height: 1.6;
          color: var(--color-text-muted);
          margin-bottom: 24px;
          flex-grow: 1;
        }
        .module-card-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .module-card-list li {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text-dark);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .module-card-list li::before {
          content: '';
          width: 4px;
          height: 4px;
          background: var(--color-copper);
          border-radius: 50%;
        }

        /* ── PREVIEW DE DASHBOARD CON MÁSCARA ── */
        .dashboard-preview-wrapper {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
          margin-top: 60px;
        }
        .dashboard-img-container {
          position: relative;
          box-shadow: 0 50px 100px rgba(0, 0, 0, 0.06);
          border: 1px solid var(--color-border);
          aspect-ratio: 16/10;
        }
        .dashboard-content-editorial {
          padding-right: 40px;
        }
        .bullet-point-editorial {
          display: flex;
          gap: 20px;
          margin-bottom: 32px;
        }
        .bullet-number {
          font-family: var(--font-serif);
          font-size: 24px;
          color: var(--color-copper);
          line-height: 1;
          margin-top: 2px;
        }
        .bullet-text strong {
          display: block;
          font-family: var(--font-serif);
          font-size: 18px;
          color: var(--color-navy);
          margin-bottom: 6px;
          font-weight: 400;
        }
        .bullet-text p {
          font-size: 13px;
          line-height: 1.6;
          color: var(--color-text-muted);
        }

        /* ── CÓMO FUNCIONA CON LÍNEA CONECTORA ── */
        .steps-editorial-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 40px;
          position: relative;
          margin-top: 80px;
        }
        .steps-editorial-row::before {
          content: '';
          position: absolute;
          top: 30px;
          left: 0;
          width: 100%;
          height: 1px;
          background: var(--color-border);
          z-index: 1;
        }
        .step-progress-line {
          position: absolute;
          top: 30px;
          left: 0;
          width: 0%;
          height: 1px;
          background: var(--color-copper);
          z-index: 2;
          transition: width 2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .step-progress-line.visible {
          width: 100%;
        }
        .step-editorial {
          position: relative;
          z-index: 3;
          text-align: center;
        }
        .step-circle {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #FFFFFF;
          border: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 28px;
          font-family: var(--font-serif);
          font-size: 18px;
          color: var(--color-navy);
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .step-editorial:hover .step-circle {
          border-color: var(--color-copper);
          background: var(--color-bg-sand);
          color: var(--color-copper);
          transform: scale(1.05);
        }
        .step-title-ed {
          font-family: var(--font-serif);
          font-size: 18px;
          color: var(--color-navy);
          margin-bottom: 12px;
        }
        .step-desc-ed {
          font-size: 13px;
          line-height: 1.6;
          color: var(--color-text-muted);
          max-width: 240px;
          margin: 0 auto;
        }

        /* ── KIA SECCIÓN IA CLARA ── */
        .kia-editorial-grid {
          display: grid;
          grid-template-columns: 1fr 1.1fr;
          gap: 80px;
          align-items: center;
        }
        .kia-chat-wrapper-ed {
          background: #FFFFFF;
          border: 1px solid var(--color-border);
          border-radius: 4px;
          box-shadow: 0 40px 90px rgba(0, 0, 0, 0.03);
          overflow: hidden;
        }
        .kia-chat-head-ed {
          background: var(--color-bg-sand);
          border-bottom: 1px solid var(--color-border);
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .kia-avatar-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--color-navy);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: bold;
        }
        .kia-title-status {
          margin-left: 12px;
          flex-grow: 1;
        }
        .kia-title-text {
          font-family: var(--font-serif);
          font-size: 15px;
          color: var(--color-navy);
        }
        .kia-status-text {
          font-size: 10px;
          color: var(--color-text-muted);
        }
        .kia-chat-content-ed {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 380px;
          overflow-y: auto;
        }
        .kia-bubble {
          max-width: 80%;
          padding: 12px 16px;
          font-size: 13px;
          line-height: 1.55;
          border-radius: 4px;
        }
        .kia-bubble-ai {
          background: var(--color-bg-sand);
          color: var(--color-text-dark);
          border: 1px solid var(--color-border);
          align-self: flex-start;
        }
        .kia-bubble-user {
          background: var(--color-navy);
          color: #FFFFFF;
          align-self: flex-end;
        }
        .kia-bubble-title {
          font-family: var(--font-serif);
          font-weight: bold;
          font-size: 13px;
          display: block;
          margin-bottom: 4px;
          color: var(--color-copper);
        }
        .kia-chat-input-ed {
          border-top: 1px solid var(--color-border);
          padding: 16px 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: #FFFFFF;
        }
        .kia-input-fake-ed {
          flex-grow: 1;
          color: var(--color-text-muted);
          font-size: 12px;
        }

        /* ── TARJETAS DE PLANES EDITORIALES ── */
        .plans-grid-ed {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 32px;
          max-width: 900px;
          margin: 60px auto 0;
        }
        .plan-card-ed {
          background: #FFFFFF;
          border: 1px solid var(--color-border);
          padding: 56px 48px;
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
        }
        .plan-card-ed:hover {
          border-color: var(--color-copper);
          transform: translateY(-4px);
          box-shadow: 0 40px 90px rgba(0, 0, 0, 0.04);
        }
        .plan-card-ed.popular-plan-ed {
          background: var(--color-bg-sand);
          border-color: var(--color-navy);
        }
        .plan-tag-ed {
          position: absolute;
          top: 24px;
          right: 32px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--color-copper);
        }
        .plan-title-ed {
          font-family: var(--font-serif);
          font-size: 28px;
          color: var(--color-navy);
          margin-bottom: 8px;
        }
        .plan-price-ed {
          font-family: var(--font-serif);
          font-size: 48px;
          color: var(--color-text-dark);
          margin-bottom: 20px;
          font-weight: 300;
        }
        .plan-price-ed span {
          font-size: 14px;
          font-family: var(--font-sans);
          color: var(--color-text-muted);
        }
        .plan-desc-ed {
          font-size: 13px;
          color: var(--color-text-muted);
          line-height: 1.6;
          margin-bottom: 40px;
        }
        .plan-features-ed {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 48px;
        }
        .plan-features-ed li {
          font-size: 13px;
          color: var(--color-text-dark);
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .plan-features-ed li svg {
          width: 16px;
          height: 16px;
          stroke: var(--color-copper);
          stroke-width: 2;
          fill: none;
          flex-shrink: 0;
        }

        /* ── TESTIMONIAL ── */
        .testimonial-block-ed {
          margin-top: 100px;
          border-top: 1px solid var(--color-border);
          padding-top: 80px;
          display: grid;
          grid-template-columns: 0.8fr 1.2fr;
          gap: 60px;
          align-items: center;
        }
        .testimonial-quote-ed {
          font-family: var(--font-serif);
          font-size: 26px;
          line-height: 1.45;
          color: var(--color-navy);
          font-style: italic;
        }
        .testimonial-author-ed {
          margin-top: 24px;
        }
        .testimonial-author-ed strong {
          display: block;
          font-size: 14px;
          color: var(--color-text-dark);
        }
        .testimonial-author-ed span {
          font-size: 12px;
          color: var(--color-text-muted);
        }

        /* ── CTA FINAL ── */
        .final-cta-box-ed {
          background: var(--color-navy);
          color: #FFFFFF;
          padding: 100px 80px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .final-cta-box-ed h2 {
          color: #FFFFFF;
          font-size: clamp(32px, 4vw, 56px);
          margin-bottom: 20px;
        }
        .final-cta-box-ed p {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.7);
          max-width: 600px;
          margin: 0 auto 40px;
          font-weight: 300;
        }

        /* ── FOOTER INSTITUCIONAL ── */
        .footer-editorial {
          background: #FFFFFF;
          padding: 80px;
          border-top: 1px solid var(--color-border);
        }
        .footer-columns-ed {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr;
          gap: 60px;
          border-bottom: 1px solid var(--color-border);
          padding-bottom: 60px;
        }
        .footer-info-brand {
          max-width: 320px;
        }
        .footer-brand-logo {
          height: 38px;
          width: auto;
          filter: brightness(0) opacity(0.85);
          margin-bottom: 24px;
        }
        .footer-brand-desc {
          font-size: 13px;
          line-height: 1.6;
          color: var(--color-text-muted);
        }
        .footer-col-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--color-text-dark);
          margin-bottom: 24px;
        }
        .footer-links-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .footer-links-list a {
          color: var(--color-text-muted);
          text-decoration: none;
          font-size: 13px;
          transition: color 0.3s ease;
        }
        .footer-links-list a:hover {
          color: var(--color-copper);
        }
        .footer-bottom-ed {
          max-width: 1280px;
          margin: 0 auto;
          padding-top: 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: var(--color-text-muted);
        }
        .footer-bottom-ed a {
          color: inherit;
          text-decoration: none;
          transition: color 0.3s ease;
        }
        .footer-bottom-ed a:hover {
          color: var(--color-copper);
        }

        /* ── RESPONSIVE COMPACT ── */
        @media (max-width: 1100px) {
          .header-nav { padding: 0 40px; }
          .hero-section { padding: 140px 40px 80px; }
          .hero-container { grid-template-columns: 1fr; gap: 40px; }
          .hero-right-visual { display: none; }
          .metrics-container { grid-template-columns: repeat(2, 1fr); gap: 30px; }
          .metrics-section { padding: 80px 40px; }
          .editorial-section { padding: 100px 40px; }
          .modules-grid { grid-template-columns: repeat(2, 1fr); }
          .dashboard-preview-wrapper { grid-template-columns: 1fr; gap: 40px; }
          .steps-editorial-row { grid-template-columns: repeat(2, 1fr); gap: 30px; }
          .steps-editorial-row::before { display: none; }
          .kia-editorial-grid { grid-template-columns: 1fr; gap: 40px; }
          .plans-grid-ed { grid-template-columns: 1fr; max-width: 450px; }
          .testimonial-block-ed { grid-template-columns: 1fr; gap: 30px; }
          .footer-columns-ed { grid-template-columns: 1fr; gap: 40px; }
          .footer-editorial { padding: 60px 40px; }
        }

        @media (max-width: 640px) {
          .header-nav { padding: 0 20px; }
          .nav-menu { display: none; }
          .hero-section { padding: 120px 20px 60px; }
          .metrics-container { grid-template-columns: 1fr; }
          .metric-card { border-left: none; padding-left: 0; border-bottom: 1px solid var(--color-border); padding-bottom: 20px; }
          .metric-card:last-child { border-bottom: none; padding-bottom: 0; }
          .editorial-section { padding: 80px 20px; }
          .modules-grid { grid-template-columns: 1fr; }
          .steps-editorial-row { grid-template-columns: 1fr; }
          .final-cta-box-ed { padding: 80px 20px; }
          .footer-bottom-ed { flex-direction: column; gap: 16px; text-align: center; }
        }
      `}</style>

      {/* ── SCRIPTS: ANIMACIONES E INTERACCIONES ── */}
      <Script id="landing-animations" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
        (function(){
          // 1. SMART HEADER (OCULTAR AL BAJAR, MOSTRAR AL SUBIR)
          var lastScroll = 0;
          window.addEventListener('scroll', function() {
            var header = document.querySelector('.header-nav');
            if (!header) return;
            var currentScroll = window.pageYOffset || document.documentElement.scrollTop;
            if (currentScroll > 50) {
              header.classList.add('scrolled');
            } else {
              header.classList.remove('scrolled');
            }
            if (currentScroll > lastScroll && currentScroll > 150) {
              header.classList.add('nav-hidden');
            } else {
              header.classList.remove('nav-hidden');
            }
            lastScroll = currentScroll <= 0 ? 0 : currentScroll;
          }, { passive: true });

          // 2. PARALLAX Y MOVIMIENTO DEL MOUSE EN HERO (DESKTOP)
          var isMobile = window.innerWidth < 1024;
          if (!isMobile) {
            var heroBg = document.querySelector('.hero-bg-image');
            var heroSection = document.querySelector('.hero-section');
            if (heroSection && heroBg) {
              heroSection.addEventListener('mousemove', function(e) {
                var xVal = (e.clientX / window.innerWidth - 0.5) * 15;
                var yVal = (e.clientY / window.innerHeight - 0.5) * 15;
                heroBg.style.transform = 'scale(1.1) translate3d(' + xVal + 'px, ' + yVal + 'px, 0)';
              }, { passive: true });
            }
          }

          // 3. INTERSECTION OBSERVER PARA REVEALS
          var options = {
            threshold: isMobile ? 0.02 : 0.08,
            rootMargin: '0px 0px -60px 0px'
          };
          var observer = new IntersectionObserver(function(entries, self) {
            entries.forEach(function(entry) {
              if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Si es la sección de "Cómo funciona", animar la línea
                if (entry.target.classList.contains('steps-editorial-row')) {
                  var line = entry.target.querySelector('.step-progress-line');
                  if (line) line.classList.add('visible');
                }
                // Si contiene contadores, animarlos
                var counters = entry.target.querySelectorAll('.metric-number');
                if (counters.length > 0) {
                  counters.forEach(function(counter) {
                    if (!counter.dataset.animated) {
                      animateCounter(counter);
                    }
                  });
                }
                self.unobserve(entry.target);
              }
            });
          }, options);

          // Registrar elementos
          document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .img-mask-reveal, .steps-editorial-row, .metrics-container').forEach(function(el) {
            observer.observe(el);
          });

          // Función CountUp suave
          function animateCounter(el) {
            el.dataset.animated = "true";
            var target = parseFloat(el.getAttribute('data-target'));
            var isFloat = el.getAttribute('data-float') === "true";
            var isMonetary = el.getAttribute('data-money') === "true";
            var duration = 2500;
            var start = 0;
            var startTime = null;

            function step(currentTime) {
              if (!startTime) startTime = currentTime;
              var progress = Math.min((currentTime - startTime) / duration, 1);
              // Easing cubic out
              var ease = 1 - Math.pow(1 - progress, 3);
              var currentVal = start + ease * (target - start);

              if (isFloat) {
                el.textContent = currentVal.toFixed(1) + "%";
              } else if (isMonetary) {
                el.textContent = "S/ " + Math.floor(currentVal) + "M+";
              } else {
                el.textContent = Math.floor(currentVal) + "+";
              }

              if (progress < 1) {
                requestAnimationFrame(step);
              } else {
                if (isFloat) el.textContent = target + "%";
                else if (isMonetary) el.textContent = "S/ " + target + "M+";
                else el.textContent = target + "+";
              }
            }
            requestAnimationFrame(step);
          }

          // Fallback por si acaso el observer no gatilla rápido
          setTimeout(function() {
            document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .img-mask-reveal').forEach(function(el) {
              el.classList.add('visible');
            });
            var line = document.querySelector('.step-progress-line');
            if (line) line.classList.add('visible');
          }, 3000);
        })();
      ` }} />


      {/* ═══════════════ NAV BAR (TRES MARES STYLE) ═══════════════ */}
      <nav className="header-nav">
        <a href="/" className="nav-logo-link">
          <img src="/logo-brand.png" alt="Kostruye+" className="logo-image" />
        </a>
        <ul className="nav-menu">
          <li><a href="#features">Módulos</a></li>
          <li><a href="#dashboard">Dashboard</a></li>
          <li><a href="#pricing">Precios</a></li>
          <li><a href="#contact">Contacto</a></li>
        </ul>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <a href="/Manual-Kostruye-Plus.pdf" download="Manual-Kostruye-Plus.pdf" className="btn-action-outline">Manual PDF</a>
          <a href="https://wa.me/51907130225?text=Hola%2C%20me%20interesa%20una%20demo%20de%20Kostruye%2B" className="btn-action-solid">Solicitar demo</a>
        </div>
      </nav>

      {/* ═══════════════ HERO SECTION (PARALLAX + EDITORIAL) ═══════════════ */}
      <section className="hero-section">
        <div className="hero-bg-wrapper">
          <div className="hero-bg-image"></div>
        </div>
        <div className="hero-grid-overlay"></div>
        
        <div className="hero-container">
          <div className="reveal-left">
            <span className="hero-badge-minimal">Tecnología y Datos para Obras</span>
            <h1 className="hero-h1-editorial">
              Gestiona tus proyectos con <span>precisión editorial v2.5.</span>
            </h1>
            <p className="hero-desc-editorial">
              Presupuestos S10, control de stock físico, planificación LPS, fideicomiso CORFID, caja chica de campo y analíticas EVM en tiempo real. Un ERP diseñado institucionalmente para constructoras líderes del Perú.
            </p>
            <div className="hero-ctas-editorial">
              <a href="https://wa.me/51907130225?text=Hola%2C%20me%20interesa%20una%20demo%20de%20Kostruye%2B" className="btn-action-solid">Solicitar Demo Gratuita</a>
              <a href="#features" className="btn-action-outline">Ver Módulos</a>
            </div>
          </div>
          
          <div className="hero-right-visual reveal-scale d2">
            <div className="img-mask-reveal" style={{ width: '100%', height: '100%' }}>
              <img src="/construction-detail.png" alt="Estructura e Ingeniería" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ SECCIÓN DE MÉTRICAS (ANIMADAS) ═══════════════ */}
      <section className="metrics-section">
        <div className="metrics-container">
          <div className="metric-card">
            <div className="metric-number" data-target="10" data-money="false" data-float="false">0</div>
            <div className="metric-label">Obras Activas</div>
            <div className="metric-desc">Controladas y monitoreadas simultáneamente.</div>
          </div>
          <div className="metric-card">
            <div className="metric-number" data-target="50" data-money="true" data-float="false">S/ 0M+</div>
            <div className="metric-label">Capital Gestionado</div>
            <div className="metric-desc">Presupuesto y valorizaciones validadas al mes.</div>
          </div>
          <div className="metric-card">
            <div className="metric-number" data-target="99.9" data-money="false" data-float="true">0%</div>
            <div className="metric-label">Uptime del Sistema</div>
            <div className="metric-desc">Estabilidad y acceso constante a la plataforma.</div>
          </div>
          <div className="metric-card">
            <div className="metric-number" data-target="1000" data-money="false" data-float="false">0</div>
            <div className="metric-label">Usuarios Activos</div>
            <div className="metric-desc">Ingenieros, administradores y personal de obra.</div>
          </div>
        </div>
      </section>

      {/* ═══════════════ MÓDULOS DE GESTIÓN (GRID MINIMALISTA) ═══════════════ */}
      <section className="editorial-section" id="features">
        <div className="editorial-container">
          <div className="section-header-editorial reveal">
            <span className="section-tag-editorial">Plataforma</span>
            <h2 className="section-title-editorial">Módulos integrados creados para la industria constructora.</h2>
            <p className="section-sub-editorial">
              Elimina las hojas de cálculo fragmentadas. Conecta cada fase operativa de tu obra en un entorno de datos corporativo y de alta gama.
            </p>
          </div>

          <div className="modules-grid">
            {[
              {
                title: "Presupuesto de Obra",
                desc: "Estructuración completa por capítulos y partidas. Visualiza variaciones financieras en tiempo real.",
                items: ["Capítulos y partidas", "Presupuestado vs Real", "Multi-moneda PEN/USD"],
                icon: (
                  <svg className="module-svg-icon" viewBox="0 0 24 24">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <line x1="12" y1="4" x2="12" y2="20" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                  </svg>
                ),
                delay: "d1"
              },
              {
                title: "Control de Almacén",
                desc: "Gestión completa de stock, entradas por guías de remisión y salidas asociadas a partidas específicas.",
                items: ["Trazabilidad de guías", "Consumos por partida", "Alertas de stock mínimo"],
                icon: (
                  <svg className="module-svg-icon" viewBox="0 0 24 24">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                ),
                delay: "d2"
              },
              {
                title: "Compras y Subcontratos",
                desc: "Ciclo de compras automatizado con flujos de aprobación y comparativa de cotizaciones.",
                items: ["Cuadros comparativos", "Órdenes de Compra", "Validación de entrega"],
                icon: (
                  <svg className="module-svg-icon" viewBox="0 0 24 24">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                ),
                delay: "d3"
              },
              {
                title: "Tareo y Planilla (Personal y Equipos)",
                desc: "Control de asistencia diaria, horas hombre y horas máquina desde la app móvil. Sincronización automática para el procesamiento semanal de planilla civil.",
                items: ["Tareo móvil de personal y GPS", "Horas de equipos (Trabajo / Standby)", "Planilla semanal automatizada"],
                icon: (
                  <svg className="module-svg-icon" viewBox="0 0 24 24">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                ),
                delay: "d4"
              },
              {
                title: "Planificación LPS",
                desc: "Metodología Last Planner System integrada. Lookahead de restricciones y cálculo automático de PPC.",
                items: ["Lookahead a 4 semanas", "Gestión de restricciones", "PPC automático semanal"],
                icon: (
                  <svg className="module-svg-icon" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                ),
                delay: "d1"
              },
              {
                title: "Clientes & Proveedores",
                desc: "Directorio institucional centralizado con histórico completo de transacciones y estados de cuenta.",
                items: ["Historial de pagos", "Calificación de entrega", "Directorio unificado"],
                icon: (
                  <svg className="module-svg-icon" viewBox="0 0 24 24">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                ),
                delay: "d2"
              },
              {
                title: "Valorizaciones",
                desc: "Elaboración de valorizaciones de obra mensuales. Estructurado por avance real de partida.",
                items: ["Cruce presupuestal", "Fórmulas polinómicas", "Reporte de avance físico"],
                icon: (
                  <svg className="module-svg-icon" viewBox="0 0 24 24">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                ),
                delay: "d3"
              },
              {
                title: "Dashboard Gerencial (EVM)",
                desc: "Consola de control de KPIs ejecutivos de múltiples proyectos activos. Análisis CPI, SPI, Curvas S acumuladas y flujo de caja.",
                items: ["Indicadores CPI / SPI", "Curva S acumulada", "Flujo de caja en vivo"],
                icon: (
                  <svg className="module-svg-icon" viewBox="0 0 24 24">
                    <path d="M3 3v18h18" />
                    <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
                  </svg>
                ),
                delay: "d4"
              },
              {
                title: "Fideicomisos CORFID",
                desc: "Gestión digital y automatizada de liberación de fondos vinculada a valorizaciones aprobadas, nóminas y compras.",
                items: ["Conciliación bancaria", "Sustentos estructurados", "Trazabilidad de fondos"],
                icon: (
                  <svg className="module-svg-icon" viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 11 11 13 15 9" />
                  </svg>
                ),
                delay: "d1"
              },
              {
                title: "Caja Chica de Campo",
                desc: "Rendición de gastos transaccionales en caliente por los ingenieros residentes usando la app móvil con foto y comprobante.",
                items: ["Carga de facturas/boletas", "Flujos de aprobación 1-clic", "Asignación por partida"],
                icon: (
                  <svg className="module-svg-icon" viewBox="0 0 24 24">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <line x1="12" y1="4" x2="12" y2="20" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ),
                delay: "d2"
              },
              {
                title: "Calidad y Seguridad HSE",
                desc: "Control de frente diario, checklists de trabajo de alto riesgo (altura, excavación) e incidentes de obra con evidencias fotográficas.",
                items: ["Checklists dinámicos", "Reporte de incidentes en vivo", "Auditoría fotográfica con GPS"],
                icon: (
                  <svg className="module-svg-icon" viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <circle cx="12" cy="11" r="3" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                ),
                delay: "d3"
              }
            ].map((mod, index) => (
              <div key={index} className={`module-card-editorial reveal ${mod.delay}`}>
                {mod.icon}
                <h3 className="module-card-title">{mod.title}</h3>
                <p className="module-card-desc">{mod.desc}</p>
                <ul className="module-card-list">
                  {mod.items.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ═══════════════ COMPARATIVA DE MERCADO (TRES MARES EDITORIAL) ═══════════════ ── */}
      <section className="editorial-section alt-bg" id="comparison">
        <div className="editorial-container">
          <div style={{ textAlign: "center", marginBottom: 60 }} className="reveal">
            <span className="section-tag-editorial">Diferenciador v2.5</span>
            <h2 className="section-title-editorial">¿Por qué Kostruye+ es el ERP definitivo?</h2>
            <p className="section-sub-editorial" style={{ maxWidth: 800, margin: "0 auto" }}>
              Reunimos las mejores capacidades operativas y financieras del mercado en una sola plataforma integrada, superando las limitaciones de los sistemas aislados de la competencia.
            </p>
          </div>

          <div style={{ overflowX: "auto" }} className="reveal d2">
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800, background: "#FFFFFF", border: "1px solid var(--color-border)" }}>
              <thead>
                <tr style={{ background: "var(--color-bg-sand)", borderBottom: "2px solid var(--color-border)" }}>
                  <th style={{ padding: "18px 24px", textAlign: "left", fontFamily: "var(--font-serif)", color: "var(--color-navy)", fontSize: 15, fontWeight: "normal" }}>Característica</th>
                  <th style={{ padding: "18px 24px", textAlign: "center", fontFamily: "var(--font-serif)", color: "var(--color-navy)", fontSize: 15, fontWeight: "normal" }}>S10 Integral</th>
                  <th style={{ padding: "18px 24px", textAlign: "center", fontFamily: "var(--font-serif)", color: "var(--color-navy)", fontSize: 15, fontWeight: "normal" }}>Konstru360</th>
                  <th style={{ padding: "18px 24px", textAlign: "center", fontFamily: "var(--font-serif)", color: "var(--color-navy)", fontSize: 15, fontWeight: "normal" }}>Bildin</th>
                  <th style={{ padding: "18px 24px", textAlign: "center", fontFamily: "var(--font-serif)", color: "var(--color-copper)", fontSize: 16, fontWeight: "bold", background: "rgba(184, 115, 61, 0.05)" }}>Kostruye+ v2.5</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    feat: "Importación Presupuestos S10 (APU)",
                    s10: "✓ Local (Desktop)", k360: "✗", bildin: "✗", kplus: "✓ Cloud en Vivo (Excel/OCR)"
                  },
                  {
                    feat: "App Móvil de Campo Offline-First",
                    s10: "✗", k360: "✓ Solo checklists", bildin: "✗", kplus: "✓ Completo (Tareo, Almacén, Caja Chica)"
                  },
                  {
                    feat: "Fideicomisos & Fiduciarias (CORFID)",
                    s10: "✗", k360: "✗", bildin: "✗", kplus: "✓ Integrado 100%"
                  },
                  {
                    feat: "Rendición de Caja Chica con Fotos",
                    s10: "✗", k360: "✗", bildin: "✓ Parcial", kplus: "✓ Móvil con GPS y Foto"
                  },
                  {
                    feat: "Facturación SUNAT e Índices INEI",
                    s10: "✓ Parcial (INEI)", k360: "✗", bildin: "✗", kplus: "✓ 1-Clic Automático"
                  },
                  {
                    feat: "Asistente AI de Analíticas (KIA)",
                    s10: "✗", k360: "✗", bildin: "✗", kplus: "✓ Copiloto Natural Integrado"
                  }
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "16px 24px", fontSize: 13, fontWeight: 600, color: "var(--color-text-dark)" }}>{row.feat}</td>
                    <td style={{ padding: "16px 24px", fontSize: 13, textAlign: "center", color: "var(--color-text-muted)" }}>{row.s10}</td>
                    <td style={{ padding: "16px 24px", fontSize: 13, textAlign: "center", color: "var(--color-text-muted)" }}>{row.k360}</td>
                    <td style={{ padding: "16px 24px", fontSize: 13, textAlign: "center", color: "var(--color-text-muted)" }}>{row.bildin}</td>
                    <td style={{ padding: "16px 24px", fontSize: 13, textAlign: "center", fontWeight: 700, color: "var(--color-copper)", background: "rgba(184, 115, 61, 0.03)" }}>{row.kplus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── ═══════════════ PREVIEW DE DASHBOARD (CON IMAGEN IA) ═══════════════ ── */}
      <section className="editorial-section alt-bg" id="dashboard">
        <div className="editorial-container">
          <div className="dashboard-preview-wrapper">
            <div className="reveal-left">
              <span className="section-tag-editorial">Control Visivo</span>
              <h2 className="section-title-editorial">Decisiones en obra respaldadas por datos instantáneos.</h2>
              <p className="section-sub-editorial" style={{ marginBottom: 48 }}>
                La interfaz clara y depurada de Kostruye+ te permite rastrear los desvíos financieros y operacionales antes de que comprometan el margen de la obra.
              </p>

              <div className="bullet-point-editorial">
                <div className="bullet-number">01</div>
                <div className="bullet-text">
                  <strong>Consumo Real vs Presupuestado</strong>
                  <p>Monitoreo diario del costo incurrido contra el presupuesto contractual S10 de la obra.</p>
                </div>
              </div>

              <div className="bullet-point-editorial">
                <div className="bullet-number">02</div>
                <div className="bullet-text">
                  <strong>Estado de Almacenes en Vivo</strong>
                  <p>Evita paralizaciones por falta de stock. Visualiza insumos críticos, pedidos en tránsito y alertas en rojo.</p>
                </div>
              </div>
            </div>

            <div className="dashboard-img-container reveal-scale d2">
              <div className="img-mask-reveal" style={{ width: '100%', height: '100%' }}>
                <img src="/dashboard-preview.png" alt="Dashboard Gerencial Kostruye+" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ═══════════════ APP MÓVIL (COMPLEMENTO DE CAMPO) ═══════════════ ── */}
      <section className="editorial-section" id="mobile-app">
        <div className="editorial-container">
          <div className="dashboard-preview-wrapper" style={{ gridTemplateColumns: "0.9fr 1.1fr" }}>
            <div className="dashboard-img-container reveal-scale">
              <div className="img-mask-reveal" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/app-mockup.png" alt="App Móvil Kostruye+" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '20px' }} />
              </div>
            </div>

            <div className="reveal-right">
              <span className="section-tag-editorial">Control en Campo v2.5 vs Estándar Tradicional</span>
              <h2 className="section-title-editorial">La potencia del ERP móvil: Tareo, Pedidos, Aprobaciones y Tableros.</h2>
              <p className="section-sub-editorial" style={{ marginBottom: 48 }}>
                Olvídate de contratar múltiples aplicaciones móviles fragmentadas. Kostruye+ consolida en una sola app todo-en-uno con sincronización 100% Offline-First para trabajar en cualquier punto del territorio peruano sin cobertura de red.
              </p>

              <div className="bullet-point-editorial">
                <div className="bullet-number">01</div>
                <div className="bullet-text">
                  <strong>Tareo de Personal y Equipos (Asistencia con GPS)</strong>
                  <p>Control de horas hombre y horas máquina (operativas/stand-by) directamente por frente y actividad. Validación fotográfica y geolocalización satelital para mitigar planillas infladas y horas fantasma.</p>
                </div>
              </div>

              <div className="bullet-point-editorial">
                <div className="bullet-number">02</div>
                <div className="bullet-text">
                  <strong>Pedidos en Obra e Inventarios (Kardex Móvil)</strong>
                  <p>Solicitudes de compras e ingresos rápidos de materiales escaneando guías. Salidas vinculadas automáticamente a partidas del presupuesto APU para auditar consumos en caliente.</p>
                </div>
              </div>

              <div className="bullet-point-editorial">
                <div className="bullet-number">03</div>
                <div className="bullet-text">
                  <strong>Aprobaciones en 1-Clic y Tablero Gerencial</strong>
                  <p>Los jefes y gerentes autorizan órdenes de compra, contratos de servicios y liberaciones de fideicomiso al instante. Visualización de curvas S y KPIs financieros (CPI/SPI) consolidados.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ═══════════════ CÓMO FUNCIONA (CON CONECTORES) ═══════════════ ── */}
      <section className="editorial-section">
        <div className="editorial-container">
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <span className="section-tag-editorial">Despliegue</span>
            <h2 className="section-title-editorial">Implementación e integración institucional</h2>
          </div>

          <div className="steps-editorial-row reveal">
            <div className="step-progress-line"></div>
            
            {[
              {
                num: "01",
                title: "Solicitud de Demo",
                desc: "Evaluamos el volumen de tus proyectos y estructuramos tu tenant en la plataforma."
              },
              {
                num: "02",
                title: "Migración de Datos",
                desc: "Cargamos tus catálogos de insumos, base de datos de proveedores y subcontratistas."
              },
              {
                num: "03",
                title: "Carga de Presupuestos",
                desc: "Importamos tus presupuestos S10 directamente desde Excel u OCR inteligente."
              },
              {
                num: "04",
                title: "Gestión Operativa",
                desc: "Acceso seguro para ingenieros residentes, administradores y gerencia."
              }
            ].map((step, idx) => (
              <div key={idx} className="step-editorial">
                <div className="step-circle">{step.num}</div>
                <h4 className="step-title-ed">{step.title}</h4>
                <p className="step-desc-ed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ═══════════════ KIA ASISTENTE IA (CHAT MOCKUP CLARO) ═══════════════ ── */}
      <section className="editorial-section alt-bg">
        <div className="editorial-container">
          <div className="kia-editorial-grid">
            <div className="dashboard-img-container reveal-scale">
              <div className="img-mask-reveal" style={{ width: '100%', height: '100%' }}>
                <img src="/construction-team.png" alt="Ingenieros usando Inteligencia Artificial" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>

            <div className="reveal-right">
              <span className="section-tag-editorial">Inteligencia Artificial</span>
              <h2 className="section-title-editorial">KIA: El asistente experto en los datos de tu obra.</h2>
              <p className="section-sub-editorial" style={{ marginBottom: 40 }}>
                Pregunta en lenguaje natural directamente sobre tus costos, compras pendientes, stock o PPC semanal. KIA consulta la base de datos en tiempo real de manera aislada y segura.
              </p>

              <div className="kia-chat-wrapper-ed">
                <div className="kia-chat-head-ed">
                  <div className="kia-avatar-circle">✦</div>
                  <div className="kia-title-status">
                    <div className="kia-title-text">KIA — Kostruye AI</div>
                    <div className="kia-status-text">Analista de datos activo</div>
                  </div>
                  <div style={{ fontSize: 18 }}>●</div>
                </div>
                <div className="kia-chat-content-ed">
                  <div className="kia-bubble kia-bubble-ai">
                    Hola. Tengo acceso al consolidado de tus obras. ¿Qué indicador financiero deseas evaluar hoy?
                  </div>
                  <div className="kia-bubble kia-bubble-user">
                    ¿Cuál es el estado de gastos en la partida de concreto del proyecto Torres Lima Norte?
                  </div>
                  <div className="kia-bubble kia-bubble-ai">
                    <span className="kia-bubble-title">Torres Lima Norte — Insumo Concreto</span>
                    El presupuesto contractual asignado es de S/ 450,000. El valorizado a la fecha es de S/ 380,000, con un costo real facturado de S/ 425,000. Registramos un desvío desfavorable de S/ 45,000 debido a un incremento de precio del proveedor Cemento Sur.
                  </div>
                </div>
                <div className="kia-chat-input-ed">
                  <div className="kia-input-fake-ed">Consultar sobre presupuestos, compras o trabajadores...</div>
                  <div style={{ color: "var(--color-copper)", fontSize: 16 }}>➤</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ═══════════════ TARIFAS Y PLANES EDITORIALES ═══════════════ ── */}
      <section className="editorial-section" id="pricing">
        <div className="editorial-container">
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <span className="section-tag-editorial">Tarifas</span>
            <h2 className="section-title-editorial">Estructura de inversión transparente.</h2>
            <p className="section-sub-editorial">Sin plazos forzosos. Escalabilidad de acuerdo al crecimiento de tu empresa.</p>
          </div>

          <div className="plans-grid-ed">
            {/* Plan Pro */}
            <div className="plan-card-ed popular-plan-ed reveal-scale d1">
              <span className="plan-tag-ed">Recomendado</span>
              <h3 className="plan-title-ed">Plan Pro</h3>
              <div className="plan-price-ed">S/ 1,099 <span>/ mes</span></div>
              <p className="plan-desc-ed">Diseñado para constructoras con múltiples obras simultáneas que requieren control absoluto.</p>
              
              <ul className="plan-features-ed">
                {[
                  "Proyectos y obras ilimitadas",
                  "Todos los módulos operativos integrados",
                  "Caja Chica & Rendición de Gastos de Campo",
                  "KIA Asistente de IA con acceso en vivo",
                  "Exportación de reportes PDF, Excel y CSV",
                  "Usuarios administradores ilimitados",
                  "Soporte corporativo prioritario 24/7"
                ].map((feat, i) => (
                  <li key={i}>
                    <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                    {feat}
                  </li>
                ))}
              </ul>
              
              <a href="/pagar?plan=pro" className="btn-action-solid" style={{ width: '100%', justifyContent: 'center' }}>Empezar suscripción</a>
            </div>

            {/* Plan Enterprise */}
            <div className="plan-card-ed reveal-scale d2">
              <h3 className="plan-title-ed">Enterprise</h3>
              <div className="plan-price-ed">S/ 3,699 <span>/ mes</span></div>
              <p className="plan-desc-ed">Para corporaciones constructoras con múltiples razones sociales y requerimientos a medida.</p>
              
              <ul className="plan-features-ed">
                {[
                  "Consolidado multi-empresa unificado",
                  "Integración con Fideicomisos CORFID",
                  "Gerente de cuenta y onboarding corporativo",
                  "Integración a medida con sistemas ERP externos",
                  "SLA garantizado por contrato (99.9%)",
                  "Copias de respaldo de base de datos personalizadas"
                ].map((feat, i) => (
                  <li key={i}>
                    <svg viewBox="0 0 24 24" style={{ stroke: "var(--color-navy)" }}><polyline points="20 6 9 17 4 12" /></svg>
                    {feat}
                  </li>
                ))}
              </ul>
              
              <a href="https://wa.me/51907130225?text=Hola%2C%20me%20interesa%20el%20Plan%20Enterprise%20de%20Kostruye%2B" className="btn-action-outline" style={{ width: '100%', justifyContent: 'center' }}>Contactar Ventas</a>
            </div>
          </div>

          {/* Testimonial */}
          <div className="testimonial-block-ed reveal">
            <div className="testimonial-quote-ed">
              "La plataforma eliminó el retraso en el reporte de costos semanales. Ahora la gerencia y el residente de obra miran la misma información en tiempo real."
            </div>
            <div className="testimonial-author-ed">
              <strong>Ing. Jorge Olivera</strong>
              <span>Gerente de Proyectos · SEATEK Construcciones</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── ═══════════════ CTA FINAL (GRIS MARES) ═══════════════ ── */}
      <section className="final-cta-box-ed reveal" id="contact">
        <h2>¿Listo para estructurar tu constructora?</h2>
        <p>Habilita tu tenant en 24 horas y comienza a registrar tus presupuestos de obra hoy mismo.</p>
        <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="https://wa.me/51907130225?text=Hola%2C%20me%20interesa%20conocer%20Kostruye%2B" className="btn-action-solid" style={{ background: "var(--color-copper)", border: "none" }}>💬 Escribir a WhatsApp</a>
          <a href="mailto:info@kreoia.site" className="btn-action-outline" style={{ borderColor: "#FFFFFF", color: "#FFFFFF" }}>✉️ Contactar por correo</a>
        </div>
      </section>

      {/* ── ═══════════════ FOOTER INSTITUCIONAL (TRES MARES STYLE) ═══════════════ ── */}
      <footer className="footer-editorial">
        <div className="footer-columns-ed">
          <div className="footer-info-brand">
            <img src="/logo-brand.png" alt="Kostruye+" className="footer-brand-logo" />
            <p className="footer-brand-desc">
              Plataforma y ERP de gestión operativa v2.5 para constructoras del Perú. Optimización de presupuestos, almacén, compras, fideicomisos CORFID, cajas chicas y nóminas de personal.
            </p>
          </div>
          <div>
            <h4 className="footer-col-title">Plataforma</h4>
            <ul className="footer-links-list">
              <li><a href="#features">Módulos</a></li>
              <li><a href="#dashboard">Dashboard</a></li>
              <li><a href="#pricing">Tarifas y Planes</a></li>
            </ul>
          </div>
          <div>
            <h4 className="footer-col-title">Compañía</h4>
            <ul className="footer-links-list">
              <li><a href="mailto:info@kreoia.site">Soporte</a></li>
              <li><a href="/Manual-Kostruye-Plus.pdf">Manual del Sistema</a></li>
              <li><a href="https://wa.me/51907130225">Contacto Ventas</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-ed">
          <div>© 2026 <a href="https://kreoia.site" target="_blank" rel="noopener noreferrer">KREO IA Studio</a>. Todos los derechos reservados.</div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
            <a href="/legal/terminos">Términos</a>
            <a href="/legal/privacidad">Privacidad</a>
            <span>Lima, Perú</span>
          </div>
        </div>
      </footer>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <JoshyWidget />
    </>
  );
}
