import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Software ERP para Constructoras Peruanas | Kostruye+",
  description:
    "Gestiona presupuestos S10, valorizaciones, almacén, planilla y compras de todas tus obras desde una sola plataforma. ERP de construcción hecho en Perú.",
  alternates: { canonical: "https://kreo-crm.site" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Kostruye+",
  url: "https://kreo-crm.site",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "ERP de gestión de obras para constructoras peruanas. Presupuesto S10, valorizaciones, almacén, planilla, compras y Last Planner System en una sola plataforma.",
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
      price: "599",
      priceCurrency: "PEN",
      description: "Proyectos ilimitados, usuarios ilimitados, todos los módulos, KIA IA incluido",
    },
    {
      "@type": "Offer",
      name: "Plan Enterprise",
      price: "1999",
      priceCurrency: "PEN",
      description: "Multi-empresa, gerente de cuenta dedicado, onboarding, integraciones a medida, SLA 99.9%",
    },
  ],
  creator: {
    "@type": "Organization",
    name: "KREO IA Studio",
    url: "https://kreo-crm.site",
  },
  inLanguage: "es-PE",
  keywords:
    "software constructoras peru, ERP construccion, gestion obras peru, presupuesto S10, valorizaciones, planilla obreros",
};

export default function Landing() {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #030712 !important; color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif; overflow-x: hidden; }
        html { scroll-behavior: smooth; }

        /* ── Scroll animations ── */
        .reveal { opacity: 0; transform: translateY(48px); transition: opacity 0.75s cubic-bezier(.22,1,.36,1), transform 0.75s cubic-bezier(.22,1,.36,1); }
        .reveal.up { opacity: 1; transform: translateY(0); }
        .reveal-left { opacity: 0; transform: translateX(-48px); transition: opacity 0.75s cubic-bezier(.22,1,.36,1), transform 0.75s cubic-bezier(.22,1,.36,1); }
        .reveal-left.up { opacity: 1; transform: translateX(0); }
        .reveal-scale { opacity: 0; transform: scale(0.88); transition: opacity 0.7s cubic-bezier(.22,1,.36,1), transform 0.7s cubic-bezier(.22,1,.36,1); }
        .reveal-scale.up { opacity: 1; transform: scale(1); }
        .d1 { transition-delay: 0.08s; }
        .d2 { transition-delay: 0.16s; }
        .d3 { transition-delay: 0.24s; }
        .d4 { transition-delay: 0.32s; }
        .d5 { transition-delay: 0.40s; }
        .d6 { transition-delay: 0.48s; }
        .d7 { transition-delay: 0.56s; }
        .d8 { transition-delay: 0.64s; }

        /* ── Keyframes ── */
        @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes floatRev { 0%,100%{transform:translateY(0)} 50%{transform:translateY(10px)} }
        @keyframes growBar  { from{transform:scaleY(0)} to{transform:scaleY(1)} }
        @keyframes fillW    { from{width:0} }
        @keyframes shimmer  { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes glow     { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:.8;transform:scale(1.06)} }

        /* ── Gradient text ── */
        .g-amber { background:linear-gradient(135deg,#f59e0b,#fbbf24); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .g-blue  { background:linear-gradient(135deg,#3b82f6,#60a5fa); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

        /* ── NAV ── */
        .nav { position:fixed; top:0; left:0; right:0; z-index:200; height:64px; display:flex; align-items:center; justify-content:space-between; padding:0 60px; background:rgba(3,7,18,.8); backdrop-filter:blur(16px); border-bottom:1px solid rgba(255,255,255,.06); }
        .nav-logo { display:flex; align-items:center; gap:10px; text-decoration:none; }
        .nav-logo-text { font-weight:900; font-size:16px; letter-spacing:-.5px; color:#fff; }
        .nav-logo-text span { color:#f59e0b; }
        .nav-links { display:flex; gap:32px; list-style:none; }
        .nav-links a { color:#9ca3af; font-size:14px; font-weight:500; text-decoration:none; transition:color .2s; }
        .nav-links a:hover { color:#fff; }
        .nav-cta { display:inline-flex; align-items:center; gap:6px; background:#f59e0b; color:#000; border:none; padding:8px 20px; border-radius:8px; font-weight:700; font-size:14px; text-decoration:none; transition:background .2s,transform .2s; }
        .nav-cta:hover { background:#fbbf24; transform:translateY(-1px); }
        .nav-cta-alt { display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,.05); color:#fff; border:1px solid rgba(255,255,255,.1); padding:8px 20px; border-radius:8px; font-weight:600; font-size:14px; text-decoration:none; transition:background .2s,transform .2s; }
        .nav-cta-alt:hover { background:rgba(255,255,255,.1); transform:translateY(-1px); }

        /* ── HERO ── */
        .hero { min-height:100svh; position:relative; display:flex; align-items:center; justify-content:center; overflow:hidden; background:#030712; }

        /* Orbs de luz animados — z:3 encima del overlay, debajo del contenido */
        .hero-orb { position:absolute; border-radius:50%; filter:blur(70px); pointer-events:none; z-index:3; mix-blend-mode:screen; }
        .hero-orb1 { width:650px; height:650px; background:radial-gradient(circle, rgba(245,158,11,.55) 0%, transparent 60%); top:-100px; left:-80px; animation:orbMove1 20s ease-in-out infinite; }
        .hero-orb2 { width:550px; height:550px; background:radial-gradient(circle, rgba(139,92,246,.45) 0%, transparent 60%); bottom:-80px; right:-60px; animation:orbMove2 25s ease-in-out infinite; }
        .hero-orb3 { width:420px; height:420px; background:radial-gradient(circle, rgba(59,130,246,.38) 0%, transparent 60%); top:30%; left:50%; transform:translateX(-50%); animation:orbMove3 17s ease-in-out infinite; }
        @keyframes orbMove1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(80px,60px) scale(1.1)} 66%{transform:translate(-40px,80px) scale(.95)} }
        @keyframes orbMove2 { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(-70px,-80px) scale(1.08)} 70%{transform:translate(40px,-40px) scale(1.12)} }
        @keyframes orbMove3 { 0%,100%{transform:translateX(-50%) scale(1)} 50%{transform:translateX(-45%) scale(1.15)} }

        /* Grid sutil — z:1 debajo del dashboard */
        .hero-grid { position:absolute; inset:0; z-index:1; pointer-events:none;
          background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);
          background-size:64px 64px;
          mask-image:radial-gradient(ellipse 90% 80% at 50% 50%,black 20%,transparent 80%);
          animation:gridPulse 10s ease-in-out infinite;
        }
        @keyframes gridPulse { 0%,100%{opacity:.4} 50%{opacity:.9} }

        /* Sweep de luz diagonal — z:4 encima de los orbs */
        .hero-sweep { position:absolute; inset:0; z-index:4; pointer-events:none; overflow:hidden; }
        .hero-sweep::before { content:''; position:absolute; top:0; left:-120%; width:50%; height:100%;
          background:linear-gradient(105deg,transparent 30%,rgba(245,158,11,.09) 50%,transparent 70%);
          animation:sweep 11s linear infinite;
        }
        @keyframes sweep { to{left:150%} }

        /* Dashboard que llena todo el fondo — z:2 */
        .hero-db { position:absolute; inset:0; padding:72px 28px 28px; display:flex; flex-direction:column; gap:9px; pointer-events:none; z-index:2; opacity:.38; filter:blur(.5px); will-change:transform; animation:floatBg 9s ease-in-out infinite; }
        @keyframes floatBg { 0%,100%{transform:translateY(0) scale(1.02)} 50%{transform:translateY(-12px) scale(1.02)} }
        .hero-db-row { display:grid; gap:9px; }
        .hero-db-row1 { grid-template-columns:repeat(4,1fr); }
        .hero-db-row2 { grid-template-columns:2.2fr 1fr 1.2fr; flex:1; }
        .hero-db-row3 { grid-template-columns:repeat(4,1fr); }
        .db-card { background:rgba(15,22,45,.75); border:1px solid rgba(255,255,255,.1); border-radius:12px; padding:14px; overflow:hidden; }
        .db-kpi-l { font-size:10px; color:#6b7280; font-weight:700; text-transform:uppercase; letter-spacing:.8px; display:block; margin-bottom:5px; }
        .db-kpi-v { font-size:22px; font-weight:900; color:#fff; display:block; }
        .db-kpi-d { font-size:11px; display:block; margin-top:3px; }
        .db-green { color:#22c55e; }
        .db-amber { color:#f59e0b; }
        .db-blue  { color:#60a5fa; }
        .db-red   { color:#f87171; }
        .db-bar-h { height:4px; background:rgba(255,255,255,.08); border-radius:2px; margin-top:8px; }
        .db-bar-f { height:100%; border-radius:2px; }
        /* chart bars */
        .db-chart-label { font-size:9px; color:#6b7280; font-weight:700; text-transform:uppercase; letter-spacing:.8px; margin-bottom:10px; }
        .db-bars { display:flex; align-items:flex-end; gap:5px; height:72px; }
        .db-bar { flex:1; border-radius:3px 3px 0 0; animation:growBar 1.4s cubic-bezier(.22,1,.36,1) forwards; transform-origin:bottom; }
        /* table */
        .db-table-row { display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid rgba(255,255,255,.05); }
        .db-table-row:last-child { border-bottom:none; }
        .db-t-name { font-size:11px; color:#e5e7eb; font-weight:600; }
        .db-t-sub  { font-size:9px; color:#4b5563; }
        .db-badge  { font-size:9px; font-weight:700; padding:2px 7px; border-radius:20px; white-space:nowrap; }
        /* donut */
        .db-donut { display:flex; align-items:center; gap:10px; margin-top:4px; }
        .db-legend { display:flex; flex-direction:column; gap:4px; }
        .db-legend-item { display:flex; align-items:center; gap:5px; font-size:9px; color:#9ca3af; }
        .db-legend-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
        /* sparkline mini */
        .db-spark { display:flex; align-items:flex-end; gap:2px; height:28px; margin-top:8px; }
        .db-spark-bar { flex:1; border-radius:2px 2px 0 0; min-height:4px; }

        /* Overlay oscuro sobre el dashboard — menos agresivo para que se vea más */
        .hero-overlay { position:absolute; inset:0; z-index:2; pointer-events:none;
          background:
            radial-gradient(ellipse 70% 55% at 50% 50%, rgba(3,7,18,.68) 0%, rgba(3,7,18,.3) 55%, transparent 100%),
            linear-gradient(to bottom, rgba(3,7,18,.45) 0%, rgba(3,7,18,.15) 50%, rgba(3,7,18,.55) 100%);
        }
        .hero-overlay::after { content:''; position:absolute; inset:0;
          background: linear-gradient(90deg, rgba(3,7,18,.5) 0%, transparent 25%, transparent 75%, rgba(3,7,18,.5) 100%);
        }

        /* Texto encima */
        .hero-content { position:relative; z-index:3; text-align:center; max-width:760px; padding:80px 40px 80px; }
        .hero-badge { display:inline-flex; align-items:center; gap:8px; background:rgba(245,158,11,.12); border:1px solid rgba(245,158,11,.35); border-radius:100px; padding:6px 18px; margin-bottom:28px; color:#f59e0b; font-size:13px; font-weight:600; }
        .hero-badge::before { content:''; width:6px; height:6px; background:#f59e0b; border-radius:50%; animation:blink 2s infinite; }
        .hero-h1 { font-size:clamp(44px,6.5vw,88px); font-weight:900; letter-spacing:-3px; line-height:1.0; color:#fff; margin-bottom:20px; text-shadow:0 2px 40px rgba(0,0,0,.8); }
        .hero-sub { color:#9ca3af; font-size:clamp(15px,1.8vw,19px); line-height:1.6; max-width:520px; margin:0 auto 36px; text-shadow:0 1px 20px rgba(0,0,0,.6); }
        .hero-cta { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:52px; justify-content:center; }
        .btn-primary { display:inline-flex; align-items:center; gap:8px; background:linear-gradient(135deg,#f59e0b,#d97706); color:#000; padding:15px 32px; border-radius:12px; font-weight:700; font-size:16px; text-decoration:none; transition:transform .2s,box-shadow .2s; }
        .btn-primary:hover { transform:translateY(-2px); box-shadow:0 10px 40px rgba(245,158,11,.5); }
        .btn-ghost { display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,.08); color:#fff; padding:15px 32px; border-radius:12px; font-weight:600; font-size:16px; text-decoration:none; border:1px solid rgba(255,255,255,.15); transition:background .2s; backdrop-filter:blur(8px); }
        .btn-ghost:hover { background:rgba(255,255,255,.14); }
        .hero-stats { display:flex; gap:48px; justify-content:center; }
        .stat-n { font-size:30px; font-weight:900; color:#f59e0b; }
        .stat-l { font-size:12px; color:#4b5563; margin-top:4px; }

        /* ── APP PREVIEW shared ── */
        .app-window { background:rgba(11,17,34,.95); border:1px solid rgba(255,255,255,.1); border-radius:16px; overflow:hidden; box-shadow:0 32px 80px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.04),inset 0 1px 0 rgba(255,255,255,.07); }
        .app-bar { background:rgba(255,255,255,.04); border-bottom:1px solid rgba(255,255,255,.06); padding:11px 16px; display:flex; align-items:center; gap:12px; }
        .dots { display:flex; gap:6px; }
        .dot { width:10px; height:10px; border-radius:50%; }
        .dot-r { background:#ef4444; }
        .dot-y { background:#f59e0b; }
        .dot-g { background:#22c55e; }
        .bar-title { font-size:11px; color:#4b5563; font-family:monospace; margin-left:4px; }
        .app-body { padding:16px; display:flex; flex-direction:column; gap:12px; }

        /* KPI row */
        .kpi-row { display:grid; grid-template-columns:repeat(3,1fr); gap:9px; }
        .kpi { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07); border-radius:9px; padding:11px; }
        .kpi-l { font-size:9px; color:#6b7280; font-weight:700; text-transform:uppercase; letter-spacing:.8px; display:block; margin-bottom:4px; }
        .kpi-v { font-size:18px; font-weight:900; color:#fff; display:block; }
        .kpi-d { font-size:10px; font-weight:600; display:block; margin-top:3px; }
        .kpi-g { color:#22c55e; }
        .mini-bar { height:4px; background:rgba(255,255,255,.08); border-radius:2px; margin-top:7px; overflow:hidden; }
        .mini-bar-fill { height:100%; border-radius:2px; animation:fillW 2.5s ease-out forwards; }

        /* Chart */
        .chart-box { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06); border-radius:9px; padding:12px; }
        .chart-label { font-size:9px; color:#6b7280; font-weight:700; text-transform:uppercase; letter-spacing:.8px; margin-bottom:12px; }
        .bars { display:flex; align-items:flex-end; gap:5px; height:52px; }
        .bar-item { flex:1; border-radius:3px 3px 0 0; animation:growBar 1.5s cubic-bezier(.22,1,.36,1) forwards; transform-origin:bottom; }
        .bar-months { display:flex; gap:5px; margin-top:5px; }
        .bar-month { flex:1; text-align:center; font-size:8px; color:#374151; }

        /* Project rows */
        .proj-list { display:flex; flex-direction:column; gap:6px; }
        .proj-row { display:flex; align-items:center; justify-content:space-between; padding:8px 11px; background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.05); border-radius:8px; }
        .proj-name { font-size:11px; color:#e5e7eb; font-weight:600; }
        .proj-sub  { font-size:10px; color:#4b5563; margin-top:1px; }
        .badge { font-size:9px; font-weight:700; padding:3px 8px; border-radius:20px; }
        .badge-g { background:rgba(34,197,94,.1); color:#22c55e; border:1px solid rgba(34,197,94,.2); }
        .badge-b { background:rgba(59,130,246,.1); color:#60a5fa; border:1px solid rgba(59,130,246,.2); }
        .badge-a { background:rgba(245,158,11,.1); color:#f59e0b; border:1px solid rgba(245,158,11,.2); }

        /* Notifs (solo desktop bg) */
        .notif-icon { font-size:16px; }
        .notif-text { font-size:10px; color:#f9fafb; font-weight:700; margin-top:2px; }
        .notif-sub  { font-size:9px; color:#6b7280; }

        /* ── SECTION commons ── */
        .section { padding:100px 60px; }
        .container { max-width:1200px; margin:0 auto; }
        .section-label { display:inline-block; font-size:11px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase; color:#f59e0b; margin-bottom:14px; }
        .section-h { font-size:clamp(26px,3.5vw,48px); font-weight:800; letter-spacing:-1px; line-height:1.1; color:#fff; }
        .section-sub { color:#6b7280; font-size:15px; margin-top:12px; }
        .divider { height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent); }

        /* ── FEATURES ── */
        .feat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-top:48px; }
        .feat-card { background:rgba(11,17,34,.7); border:1px solid rgba(255,255,255,.07); border-radius:16px; padding:24px; transition:border-color .3s,transform .3s; cursor:default; }
        .feat-card:hover { border-color:rgba(245,158,11,.35); transform:translateY(-4px); }
        .feat-icon { font-size:28px; margin-bottom:14px; }
        .feat-title { font-size:14px; font-weight:700; margin-bottom:7px; }
        .feat-desc  { font-size:12px; color:#6b7280; line-height:1.65; margin-bottom:14px; }
        .feat-items { list-style:none; display:flex; flex-direction:column; gap:5px; }
        .feat-items li { font-size:11px; color:#9ca3af; display:flex; align-items:center; gap:6px; }
        .feat-items li::before { content:'→'; color:#f59e0b; font-size:9px; flex-shrink:0; }

        /* ── STEPS ── */
        .steps-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:24px; margin-top:48px; position:relative; }
        .steps-grid::before { content:''; position:absolute; top:24px; left:12.5%; right:12.5%; height:1px; background:linear-gradient(90deg,transparent,rgba(245,158,11,.25) 20%,rgba(245,158,11,.25) 80%,transparent); }
        .step { text-align:center; }
        .step-num { width:48px; height:48px; border-radius:50%; background:rgba(245,158,11,.08); border:2px solid rgba(245,158,11,.35); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; font-size:20px; position:relative; z-index:1; }
        .step-t { font-size:14px; font-weight:700; color:#f9fafb; margin-bottom:7px; }
        .step-d { font-size:12px; color:#6b7280; line-height:1.6; }

        /* ── PRICING ── */
        .price-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:20px; margin-top:48px; align-items:start; max-width:760px; margin-left:auto; margin-right:auto; }
        .price-card { background:rgba(11,17,34,.7); border:1px solid rgba(255,255,255,.08); border-radius:20px; padding:28px; position:relative; transition:transform .3s,border-color .3s; }
        .price-card:hover { transform:translateY(-5px); }
        .price-card.popular { border-color:rgba(245,158,11,.45); background:rgba(245,158,11,.04); }
        .popular-tag { position:absolute; top:-13px; left:50%; transform:translateX(-50%); background:linear-gradient(135deg,#f59e0b,#d97706); border-radius:20px; padding:4px 18px; font-size:10px; font-weight:800; color:#000; white-space:nowrap; letter-spacing:.5px; }
        .plan-name { font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:8px; }
        .plan-price-row { display:flex; align-items:baseline; gap:4px; margin-bottom:8px; }
        .plan-price { font-size:40px; font-weight:900; color:#fff; }
        .plan-period { font-size:13px; color:#6b7280; }
        .plan-desc { font-size:12px; color:#6b7280; line-height:1.55; margin-bottom:24px; }
        .plan-features { list-style:none; display:flex; flex-direction:column; gap:9px; margin-bottom:28px; }
        .plan-features li { display:flex; align-items:center; gap:8px; font-size:13px; color:#d1d5db; }
        .check { font-weight:700; }
        .plan-btn { display:block; text-align:center; padding:13px; border-radius:10px; font-weight:700; font-size:14px; text-decoration:none; transition:opacity .2s,transform .2s; }
        .plan-btn:hover { opacity:.9; transform:translateY(-1px); }

        /* ── TESTIMONIAL ── */
        .testi { background:rgba(245,158,11,.04); border:1px solid rgba(245,158,11,.12); border-radius:24px; padding:48px; text-align:center; max-width:680px; margin:56px auto 0; }
        .testi blockquote { font-size:clamp(15px,2.2vw,21px); font-weight:600; color:#f9fafb; line-height:1.6; font-style:italic; margin-bottom:24px; }

        /* ── CTA SECTION ── */
        .cta-box { background:linear-gradient(135deg,rgba(245,158,11,.07),rgba(59,130,246,.04)); border:1px solid rgba(245,158,11,.15); border-radius:24px; padding:72px 48px; text-align:center; position:relative; overflow:hidden; }
        .cta-box::before { content:''; position:absolute; top:-80px; left:50%; transform:translateX(-50%); width:500px; height:400px; background:radial-gradient(circle,rgba(245,158,11,.1) 0%,transparent 70%); pointer-events:none; }
        .cta-btns { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-top:36px; margin-bottom:28px; }

        /* ── FOOTER ── */
        .footer { padding:36px 60px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,.06); }
        .footer-links { display:flex; gap:24px; list-style:none; }
        .footer-links a { color:#374151; font-size:13px; text-decoration:none; transition:color .2s; }
        .footer-links a:hover { color:#9ca3af; }

        /* ── KIA SECTION ── */
        .kai-wrap { display:grid; grid-template-columns:1fr 1fr; gap:72px; align-items:center; margin-top:56px; }
        .kai-badge { display:inline-flex; align-items:center; gap:8px; background:rgba(139,92,246,.1); border:1px solid rgba(139,92,246,.3); border-radius:100px; padding:5px 16px; font-size:11px; font-weight:700; color:#a78bfa; letter-spacing:.5px; text-transform:uppercase; margin-bottom:20px; }
        .kai-h { font-size:clamp(24px,3vw,40px); font-weight:800; letter-spacing:-1px; color:#fff; line-height:1.15; margin-bottom:14px; }
        .kai-sub { color:#6b7280; font-size:15px; line-height:1.65; margin-bottom:28px; }
        .kai-caps { list-style:none; display:flex; flex-direction:column; gap:12px; margin-bottom:32px; }
        .kai-cap { display:flex; align-items:flex-start; gap:12px; }
        .kai-cap-icon { flex-shrink:0; width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:15px; background:rgba(139,92,246,.12); border:1px solid rgba(139,92,246,.2); margin-top:1px; }
        .kai-cap-text { font-size:13px; color:#d1d5db; line-height:1.55; }
        .kai-cap-text strong { color:#fff; display:block; font-size:14px; margin-bottom:2px; }
        .kai-plan-note { font-size:12px; color:#6b7280; display:flex; align-items:center; gap:6px; margin-top:8px; }
        .kai-plan-note span { background:rgba(245,158,11,.12); border:1px solid rgba(245,158,11,.3); color:#f59e0b; font-size:10px; font-weight:700; padding:2px 8px; border-radius:20px; }
        /* Mockup chat */
        .kai-chat-mock { background:rgba(10,14,28,.95); border:1px solid rgba(139,92,246,.2); border-radius:20px; overflow:hidden; box-shadow:0 24px 80px rgba(0,0,0,.6),0 0 0 1px rgba(139,92,246,.08),inset 0 1px 0 rgba(255,255,255,.04); }
        .kai-chat-header { background:linear-gradient(135deg,rgba(59,130,246,.9),rgba(139,92,246,.9)); padding:14px 18px; display:flex; align-items:center; gap:10px; }
        .kai-chat-avatar { width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,.2); display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; }
        .kai-chat-name { font-size:13px; font-weight:700; color:#fff; }
        .kai-chat-status { font-size:10px; color:rgba(255,255,255,.65); }
        .kai-chat-body { padding:16px; display:flex; flex-direction:column; gap:10px; }
        .kai-msg { max-width:85%; border-radius:14px; padding:10px 14px; font-size:12px; line-height:1.55; }
        .kai-msg-ai { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08); color:#d1d5db; border-radius:14px 14px 14px 3px; }
        .kai-msg-user { background:linear-gradient(135deg,#3b82f6,#6d28d9); color:#fff; margin-left:auto; border-radius:14px 14px 3px 14px; }
        .kai-msg-label { font-size:10px; font-weight:700; color:#6b7280; margin-bottom:3px; }
        .kai-chip { display:inline-block; background:rgba(34,197,94,.1); border:1px solid rgba(34,197,94,.2); color:#22c55e; font-size:10px; font-weight:700; padding:2px 7px; border-radius:6px; margin:3px 2px 0 0; }
        .kai-chip-amber { background:rgba(245,158,11,.1); border-color:rgba(245,158,11,.2); color:#f59e0b; }
        .kai-chip-red { background:rgba(248,113,113,.1); border-color:rgba(248,113,113,.2); color:#f87171; }
        .kai-typing { display:flex; align-items:center; gap:4px; padding:10px 14px; }
        .kai-typing-dot { width:6px; height:6px; border-radius:50%; background:#6b7280; animation:blink 1.2s infinite; }
        .kai-typing-dot:nth-child(2) { animation-delay:.2s; }
        .kai-typing-dot:nth-child(3) { animation-delay:.4s; }
        .kai-input-row { border-top:1px solid rgba(255,255,255,.05); padding:12px 16px; display:flex; align-items:center; gap:8px; }
        .kai-input-fake { flex:1; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:10px; padding:9px 12px; font-size:11px; color:#4b5563; }
        .kai-send-btn { width:30px; height:30px; background:linear-gradient(135deg,#3b82f6,#6d28d9); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; }

        /* ── RESPONSIVE ── */
        @media(max-width:1100px){
          .hero { grid-template-columns:1fr; padding:100px 40px 60px; gap:48px; }
          .hero-right { display:none; }
          .feat-grid { grid-template-columns:repeat(2,1fr); }
          .steps-grid { grid-template-columns:repeat(2,1fr); }
          .steps-grid::before { display:none; }
          .price-grid { grid-template-columns:1fr; max-width:420px; }
          .section { padding:70px 40px; }
          .nav { padding:0 32px; }
          .footer { flex-direction:column; gap:16px; text-align:center; padding:30px 40px; }
          .kai-wrap { grid-template-columns:1fr; gap:40px; }
        }
        @media(max-width:1100px){
          .hero-db-row1 { grid-template-columns:repeat(2,1fr); }
          .hero-db-row2 { grid-template-columns:1fr; }
          .hero-db-row3 { grid-template-columns:1fr 1fr; }
          .hero-content { padding:100px 32px 80px; max-width:640px; }
        }
        @media(max-width:640px){
          .hero-h1 { letter-spacing:-2px; }
          .hero-cta { flex-direction:column; align-items:center; }
          .hero-stats { gap:28px; }
          .hero-db-row1 { grid-template-columns:repeat(2,1fr); }
          .hero-db-row2 { grid-template-columns:1fr; }
          .hero-db-row3 { display:none; }
          .hero-content { padding:80px 20px 64px; }
          .feat-grid { grid-template-columns:1fr; }
          .steps-grid { grid-template-columns:1fr; }
          .section { padding:52px 24px; }
          .nav { padding:0 20px; }
          .nav-links { display:none; }
          .footer { padding:24px; }
          .cta-box { padding:48px 24px; }
          .cta-btns { flex-direction:column; align-items:center; }
        }
      `}</style>

      {/* ── Scripts: scroll reveal + parallax ── */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          // IntersectionObserver para reveal
          var io = new IntersectionObserver(function(entries){
            entries.forEach(function(e){
              if(e.isIntersecting){ e.target.classList.add('up'); io.unobserve(e.target); }
            });
          },{ threshold: 0.10, rootMargin:'0px 0px -40px 0px' });
          function init(){
            document.querySelectorAll('.reveal,.reveal-left,.reveal-scale').forEach(function(el){ io.observe(el); });
            // Parallax en el mockup de fondo
            var bg = document.getElementById('hero-bg-mockup');
            if(bg){
              window.addEventListener('scroll',function(){
                var y = window.scrollY;
                bg.style.transform = 'translateY(calc(-50% + '+Math.round(y*0.35)+'px))';
                bg.style.opacity = Math.max(0, 0.18 - y*0.0004);
              },{ passive:true });
            }
          }
          document.readyState==='loading' ? document.addEventListener('DOMContentLoaded',init) : init();
        })();
      ` }} />

      {/* ═══════════════ NAV ═══════════════ */}
      <nav className="nav">
        <a href="/" className="nav-logo">
          <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="white" fillOpacity="0.08"/>
            <rect x="5" y="5" width="5" height="22" rx="1" fill="white"/>
            <polygon points="10,5 10,15 21,5" fill="white"/>
            <polygon points="10,17 10,27 21,27 16,17" fill="white"/>
            <rect x="16.5" y="8" width="3" height="9" rx="0.75" fill="#60A5FA"/>
            <rect x="14" y="10.5" width="8" height="3" rx="0.75" fill="#60A5FA"/>
          </svg>
          <div className="nav-logo-text">KOSTRUYE<span>+</span></div>
        </a>
        <ul className="nav-links">
          {([["#features","Módulos"],["#pricing","Precios"],["#contact","Contacto"]] as [string,string][]).map(([h,l])=>(
            <li key={h}><a href={h}>{l}</a></li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/Manual-Kostruye-Plus.pdf" target="_blank" rel="noopener noreferrer" className="nav-cta-alt">Descargar Manual</a>
          <a href="https://wa.me/51907130225?text=Hola%2C%20me%20interesa%20una%20demo%20de%20Kostruye%2B" className="nav-cta">Solicitar demo</a>
        </div>
      </nav>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="hero">

        {/* ── Orbs de luz animados ── */}
        <div className="hero-orb hero-orb1" />
        <div className="hero-orb hero-orb2" />
        <div className="hero-orb hero-orb3" />

        {/* ── Grid sutil ── */}
        <div className="hero-grid" />

        {/* ── Sweep de luz diagonal ── */}
        <div className="hero-sweep" />

        {/* ── Dashboard de fondo — llena todo el hero ── */}
        <div className="hero-db" id="hero-bg-mockup">

          {/* Fila 1: KPI cards con sparklines */}
          <div className="hero-db-row hero-db-row1">
            {[
              { l:"Presupuesto total", v:"S/ 2.4M",  d:"▲ En control",         dc:"db-green", spark:[40,55,48,60,52,67,72], sc:"rgba(34,197,94,.5)" },
              { l:"Avance promedio",   v:"67%",       d:"semana 24 de 36",      dc:"db-amber", prog:67 },
              { l:"PPC semanal",       v:"84%",       d:"▲ +6 pts esta semana", dc:"db-green", prog:84 },
              { l:"Stock crítico",     v:"3 alertas", d:"reposición urgente",   dc:"db-red",   spark:[2,4,3,5,3,4,3], sc:"rgba(248,113,113,.5)" },
            ].map((k,i)=>(
              <div key={i} className="db-card">
                <span className="db-kpi-l">{k.l}</span>
                <span className="db-kpi-v">{k.v}</span>
                <span className={`db-kpi-d ${k.dc}`}>{k.d}</span>
                {k.prog && <div className="db-bar-h" style={{ marginTop:10 }}><div className="db-bar-f" style={{ width:`${k.prog}%`, background:k.prog>80?"linear-gradient(90deg,#22c55e,#4ade80)":"linear-gradient(90deg,#f59e0b,#fbbf24)" }}/></div>}
                {k.spark && <div className="db-spark">{k.spark.map((h,j)=><div key={j} className="db-spark-bar" style={{ height:`${(h/Math.max(...k.spark))*100}%`, background:k.sc, animationDelay:`${j*0.05}s` }}/>)}</div>}
              </div>
            ))}
          </div>

          {/* Fila 2: gráfico barras + donut pie + tabla proyectos */}
          <div className="hero-db-row hero-db-row2">

            {/* Barras duales presupuesto vs real */}
            <div className="db-card">
              <div className="db-chart-label">Presupuesto vs Gasto real — últimos 6 meses (S/)</div>
              <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:80 }}>
                {[
                  { p:60, r:45 },{ p:75, r:68 },{ p:55, r:52 },{ p:90, r:83 },{ p:70, r:65 },{ p:85, r:91 },
                ].map((b,i)=>(
                  <div key={i} style={{ flex:1, display:"flex", gap:2, alignItems:"flex-end", height:"100%" }}>
                    <div style={{ flex:1, height:`${b.p}%`, background:"rgba(59,130,246,.45)", borderRadius:"3px 3px 0 0", animation:`growBar 1.3s ${i*0.08}s both` }}/>
                    <div style={{ flex:1, height:`${b.r}%`, background:b.r>b.p?"rgba(248,113,113,.6)":"rgba(245,158,11,.7)", borderRadius:"3px 3px 0 0", animation:`growBar 1.3s ${i*0.08+0.04}s both` }}/>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:14, marginTop:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, color:"#6b7280" }}><div style={{ width:8, height:8, background:"rgba(59,130,246,.7)", borderRadius:2 }}/>Presupuesto</div>
                <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, color:"#6b7280" }}><div style={{ width:8, height:8, background:"rgba(245,158,11,.8)", borderRadius:2 }}/>Gasto real</div>
              </div>
            </div>

            {/* Donut — distribución de proyectos */}
            <div className="db-card" style={{ display:"flex", flexDirection:"column" }}>
              <div className="db-chart-label">Estado de proyectos</div>
              <div className="db-donut">
                <svg width="72" height="72" viewBox="0 0 36 36" style={{ transform:"rotate(-90deg)", flexShrink:0 }}>
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="4"/>
                  {/* En ejecución 55% */}
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#22c55e" strokeWidth="4" strokeDasharray="48.4 39.6" strokeDashoffset="0" style={{ transition:"stroke-dasharray 1s ease" }}/>
                  {/* Planificando 30% */}
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#60a5fa" strokeWidth="4" strokeDasharray="26.4 61.6" strokeDashoffset="-48.4"/>
                  {/* En pausa 15% */}
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="13.2 74.8" strokeDashoffset="-74.8"/>
                </svg>
                <div className="db-legend">
                  {[["#22c55e","En ejecución","55%"],["#60a5fa","Planificando","30%"],["#f59e0b","En pausa","15%"]].map(([c,l,p])=>(
                    <div key={l} className="db-legend-item"><div className="db-legend-dot" style={{ background:c }}/>{l} <span style={{ color:c, fontWeight:700 }}>{p}</span></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tabla proyectos */}
            <div className="db-card">
              <div className="db-chart-label">Proyectos activos</div>
              {[
                { n:"Torre Miraflores",      s:"Lima · 24 part.",    b:"Activo", c:"#22c55e", bg:"rgba(34,197,94,.12)"  },
                { n:"Resid. Los Olivos",     s:"Lima Norte · 18p",   b:"Plan.",  c:"#60a5fa", bg:"rgba(59,130,246,.12)" },
                { n:"Obra Vial Huacho",      s:"Huacho · 31 part.",  b:"Pausa",  c:"#f59e0b", bg:"rgba(245,158,11,.12)" },
                { n:"Edificio San Borja",    s:"Lima · 40 part.",    b:"Activo", c:"#22c55e", bg:"rgba(34,197,94,.12)"  },
                { n:"Condominio Sur",        s:"Surco · 28 part.",   b:"Plan.",  c:"#60a5fa", bg:"rgba(59,130,246,.12)" },
              ].map(p=>(
                <div key={p.n} className="db-table-row">
                  <div><div className="db-t-name">{p.n}</div><div className="db-t-sub">{p.s}</div></div>
                  <span className="db-badge" style={{ background:p.bg, color:p.c, border:`1px solid ${p.c}44` }}>{p.b}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fila 3: 4 métricas rápidas */}
          <div className="hero-db-row hero-db-row3">
            <div className="db-card">
              <span className="db-kpi-l">Nómina — semana</span>
              <span className="db-kpi-v" style={{ fontSize:18 }}>S/ 48,200</span>
              <span className="db-kpi-d db-amber">↓ -3% vs sem. anterior</span>
              <div className="db-spark">{[55,62,58,70,65,68,72].map((h,i)=><div key={i} className="db-spark-bar" style={{ height:`${(h/72)*100}%`, background:"rgba(245,158,11,.45)" }}/>)}</div>
            </div>
            <div className="db-card">
              <span className="db-kpi-l">OC emitidas — mes</span>
              <span className="db-kpi-v" style={{ fontSize:18 }}>24</span>
              <span className="db-kpi-d db-blue">S/ 187,400 comprometido</span>
              <div className="db-spark">{[3,5,4,6,5,7,6].map((h,i)=><div key={i} className="db-spark-bar" style={{ height:`${(h/7)*100}%`, background:"rgba(59,130,246,.45)" }}/>)}</div>
            </div>
            <div className="db-card">
              <span className="db-kpi-l">Valorizaciones pendientes</span>
              <span className="db-kpi-v" style={{ fontSize:18 }}>S/ 320K</span>
              <span className="db-kpi-d db-green">2 obras · pendiente firma</span>
              <div className="db-bar-h" style={{ marginTop:10 }}><div className="db-bar-f" style={{ width:"72%", background:"linear-gradient(90deg,#22c55e,#4ade80)" }}/></div>
            </div>
            <div className="db-card">
              <span className="db-kpi-l">Incidentes LPS</span>
              <span className="db-kpi-v" style={{ fontSize:18 }}>7</span>
              <span className="db-kpi-d db-red">▲ restricciones abiertas</span>
              <div className="db-spark">{[4,6,5,8,6,7,7].map((h,i)=><div key={i} className="db-spark-bar" style={{ height:`${(h/8)*100}%`, background:"rgba(248,113,113,.4)" }}/>)}</div>
            </div>
          </div>
        </div>

        {/* Overlay oscuro sobre el dashboard */}
        <div className="hero-overlay" />

        {/* ── Texto en primer plano ── */}
        <div className="hero-content">
          <div className="hero-badge">Software de gestión para constructoras en Perú · <span style={{color:"#a78bfa"}}>✦ Asistente IA incluido</span></div>
          <h1 className="hero-h1">
            Gestiona tus obras<br />
            <span className="g-amber">con precisión total</span>
          </h1>
          <p className="hero-sub">
            Presupuestos, stock, planificación LPS y gastos — todo en una sola plataforma
            con inteligencia artificial integrada para la industria de la construcción peruana.
          </p>
          <div className="hero-cta">
            <a href="https://wa.me/51907130225?text=Hola%2C%20me%20interesa%20una%20demo%20de%20Kostruye%2B" className="btn-primary">
              Solicitar demo gratuita →
            </a>
            <a href="#features" className="btn-ghost">Ver módulos</a>
          </div>
          <div className="hero-stats">
            {([["10+","Obras activas"],["S/ 50M+","Gestionados"],["99.9%","Uptime"]] as [string,string][]).map(([n,l])=>(
              <div key={l}><div className="stat-n">{n}</div><div className="stat-l">{l}</div></div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider"/>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <section className="section" id="features">
        <div className="container">
          <div style={{ textAlign:"center" }}>
            <span className="section-label reveal">Módulos</span>
            <h2 className="section-h reveal d1">
              Todo lo que necesita<br/><span className="g-amber">tu constructora</span>
            </h2>
            <p className="section-sub reveal d2">Ocho módulos integrados, un solo login, cero planillas de Excel.</p>
          </div>
          <div className="feat-grid">
            {[
              { icon:"💰",color:"#f59e0b",title:"Presupuesto de obra",   desc:"Estructura por capítulos e ítems. Controla montos, avances y variaciones en tiempo real.",           items:["Capítulos y partidas","Real vs presupuestado","Multi-moneda PEN / USD"],       d:"d1" },
              { icon:"📦",color:"#f59e0b",title:"Control de stock",     desc:"Gestiona entradas y salidas de materiales con trazabilidad completa y alertas de reposición.",       items:["Entradas con proveedor y guía","Salidas por partida","Alertas de stock mínimo"], d:"d2" },
              { icon:"🛒",color:"#f59e0b",title:"Compras y OC",         desc:"Órdenes de compra con aprobación, seguimiento de entrega y comparación de precios.",                 items:["Solicitud y aprobación","Comparativo de precios","Estado de entrega"],           d:"d3" },
              { icon:"👷",color:"#f59e0b",title:"Nóminas de obra",      desc:"Control de personal diario, planilla semanal y liquidaciones con cálculo automático.",               items:["Asistencia diaria","Planilla semanal","Cálculo automático"],                      d:"d4" },
              { icon:"📅",color:"#f59e0b",title:"Planificación LPS",   desc:"Last Planner System digitalizado: lookahead semanal, restricciones y PPC automático.",               items:["Lookahead a 4 semanas","Registro de restricciones","PPC semanal automático"],   d:"d1" },
              { icon:"🤝",color:"#f59e0b",title:"Clientes y proveedores",desc:"Directorio completo con historial de órdenes de compra y valorizaciones por cliente.",              items:["Directorio centralizado","Órdenes de compra","Historial de transacciones"],     d:"d2" },
              { icon:"📊",color:"#f59e0b",title:"Valorizaciones",       desc:"Genera valorizaciones mensuales para el cliente con avance por partida e impresión PDF.",           items:["Valorización por partida","Exportación PDF","Historial de valorizaciones"],     d:"d3" },
              { icon:"📈",color:"#f59e0b",title:"Dashboard ejecutivo",  desc:"Vista gerencial con KPIs de todas las obras activas en tiempo real.",                               items:["Presupuesto vs real","Indicadores de avance","Reportes exportables"],            d:"d4" },
            ].map(f=>(
              <div key={f.title} className={`feat-card reveal ${f.d}`}>
                <div className="feat-icon">{f.icon}</div>
                <div className="feat-title" style={{ color:f.color }}>{f.title}</div>
                <div className="feat-desc">{f.desc}</div>
                <ul className="feat-items">{f.items.map(i=><li key={i}>{i}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider"/>

      {/* ═══════════════ STEPS ═══════════════ */}
      <section className="section" style={{ background:"rgba(245,158,11,.02)" }}>
        <div className="container">
          <div style={{ textAlign:"center" }}>
            <span className="section-label reveal">¿Cómo funciona?</span>
            <h2 className="section-h reveal d1">Empieza en <span className="g-amber">menos de 24 horas</span></h2>
          </div>
          <div className="steps-grid">
            {[
              { icon:"💬", t:"Solicita tu demo",       d:"Te configuramos tu espacio en menos de 24 horas.",         delay:"d1" },
              { icon:"🔐", t:"Accede a tu portal",     d:"URL personalizada con login seguro para tu equipo.",        delay:"d2" },
              { icon:"📥", t:"Carga tu obra",          d:"Importa presupuesto, proveedores y stock inicial.",         delay:"d3" },
              { icon:"🚀", t:"Gestiona en tiempo real",d:"Decisiones basadas en datos actualizados al instante.",     delay:"d4" },
            ].map(s=>(
              <div key={s.t} className={`step reveal ${s.delay}`}>
                <div className="step-num">{s.icon}</div>
                <div className="step-t">{s.t}</div>
                <div className="step-d">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider"/>

      {/* ═══════════════ KIA — ASISTENTE IA ═══════════════ */}
      <section className="section" id="kai" style={{ background:"rgba(139,92,246,.02)", paddingBottom:"60px" }}>
        <div className="container">
          <div className="kai-wrap">
            {/* Texto izquierda */}
            <div className="reveal-left">
              <div className="kai-badge">✦ KIA — Kostruye AI</div>
              <h2 className="kai-h">
                Tu obra tiene un<br/>
                <span style={{ background:"linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
                  gerente de datos
                </span><br/>disponible 24/7
              </h2>
              <p className="kai-sub">
                KIA consulta en tiempo real tus proyectos, presupuestos, compras y nóminas.
                Pregunta en lenguaje natural y recibe análisis inmediatos, sin exportar ni abrir reportes.
              </p>
              <ul className="kai-caps">
                {[
                  { icon:"📊", title:"Análisis de presupuesto", desc:"\"¿En qué partidas estamos sobre-gastando?\" — KIA cruza el presupuesto vs gastos reales al instante." },
                  { icon:"🛒", title:"Control de compras", desc:"Consulta OC pendientes, montos comprometidos y proveedores con mayor gasto sin salir del chat." },
                  { icon:"⚠️", title:"Alertas proactivas", desc:"KIA detecta anomalías — sobre-gasto, stock bajo, valorizaciones vencidas — y te las menciona sin que preguntes." },
                  { icon:"📋", title:"Resumen ejecutivo", desc:"\"Resume el estado de mis 5 proyectos activos\" — un informe gerencial en segundos." },
                ].map(c=>(
                  <li key={c.title} className="kai-cap">
                    <div className="kai-cap-icon">{c.icon}</div>
                    <div className="kai-cap-text"><strong>{c.title}</strong>{c.desc}</div>
                  </li>
                ))}
              </ul>
              <div className="kai-plan-note">
                <span>PRO</span>
                Incluido en Plan Pro y Enterprise · Powered by Claude
              </div>
            </div>

            {/* Mockup chat derecha — solo HTML/CSS, sin API calls */}
            <div className="reveal-scale d1">
              <div className="kai-chat-mock">
                <div className="kai-chat-header">
                  <div className="kai-chat-avatar">✦</div>
                  <div>
                    <div className="kai-chat-name">KIA — Kostruye AI</div>
                    <div className="kai-chat-status">● En línea · Claude</div>
                  </div>
                </div>
                <div className="kai-chat-body">
                  {/* Mensaje bienvenida */}
                  <div>
                    <div className="kai-msg-label">KIA</div>
                    <div className="kai-msg kai-msg-ai">
                      Hola 👋 Soy KIA. Tengo acceso a todos tus proyectos en tiempo real. ¿Qué necesitas saber?
                    </div>
                  </div>
                  {/* Pregunta usuario */}
                  <div>
                    <div className="kai-msg kai-msg-user">
                      ¿Cómo vamos en el proyecto Torres Lima Norte?
                    </div>
                  </div>
                  {/* Respuesta KIA */}
                  <div>
                    <div className="kai-msg-label">KIA</div>
                    <div className="kai-msg kai-msg-ai">
                      <strong style={{ color:"#fff", display:"block", marginBottom:6 }}>Torres Lima Norte — Resumen</strong>
                      Avance físico <span className="kai-chip">67%</span> · Sem. 24 de 36<br/>
                      Presupuesto <span className="kai-chip">S/ 2.4M</span> · Gasto real <span className="kai-chip kai-chip-amber">S/ 1.63M</span><br/><br/>
                      <span style={{ color:"#f87171" }}>⚠️ Alerta:</span> Partida <em>Concreto armado</em> con <span className="kai-chip kai-chip-red">+12% desvío</span>. Revisar OC pendiente de Proveedor Cemento Sur.
                    </div>
                  </div>
                  {/* Pregunta 2 */}
                  <div>
                    <div className="kai-msg kai-msg-user">
                      ¿Cuánto llevamos en compras este mes?
                    </div>
                  </div>
                  {/* Respuesta KIA */}
                  <div>
                    <div className="kai-msg-label">KIA</div>
                    <div className="kai-msg kai-msg-ai">
                      <strong style={{ color:"#fff", display:"block", marginBottom:6 }}>Compras — Mes actual</strong>
                      OC emitidas: <span className="kai-chip">24 órdenes</span> · <span className="kai-chip kai-chip-amber">S/ 187,400</span> comprometido<br/><br/>
                      Mayor proveedor: <em>Cemento Sur S.A.</em> <span className="kai-chip kai-chip-red">S/ 68,200</span><br/>
                      <span style={{ color:"#9ca3af", fontSize:11, marginTop:4, display:"block" }}>3 OC pendientes de entrega · revisar stock antes de emitir nuevas.</span>
                    </div>
                  </div>
                </div>
                <div className="kai-input-row">
                  <div className="kai-input-fake">Pregunta sobre tus proyectos...</div>
                  <div className="kai-send-btn">➤</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="divider"/>

      {/* ═══════════════ PRICING ═══════════════ */}
      <section className="section" id="pricing">
        <div className="container">
          <div style={{ textAlign:"center" }}>
            <span className="section-label reveal">Precios</span>
            <h2 className="section-h reveal d1">Planes simples y transparentes</h2>
            <p className="section-sub reveal d2">Sin contratos anuales. Cancela cuando quieras.</p>
          </div>
          <div className="price-grid">
            {/* Pro */}
            <div className="price-card popular reveal-scale d1">
              <div className="popular-tag">MÁS POPULAR</div>
              <div className="plan-name" style={{ color:"#f59e0b" }}>Pro</div>
              <div className="plan-price-row">
                <span className="plan-price">S/ 599</span>
                <span className="plan-period">/mes</span>
              </div>
              <p className="plan-desc">La solución completa para constructoras en crecimiento.</p>
              <ul className="plan-features">
                {[
                  "Proyectos ilimitados",
                  "Todos los módulos — compras, nóminas, valorizaciones, LPS, contabilidad",
                  "✦ KIA asistente IA con acceso a todos tus datos",
                  "Exportación PDF y CSV",
                  "Usuarios ilimitados",
                  "Soporte prioritario 24/7",
                  "Alertas automáticas de sobre-gasto y stock",
                ].map(f=>(
                  <li key={f}>
                    <span className="check" style={{ color: f.startsWith("✦") ? "#a78bfa" : "#f59e0b" }}>
                      {f.startsWith("✦") ? "✦" : "✓"}
                    </span>
                    {f.startsWith("✦") ? f.slice(2) : f}
                  </li>
                ))}
              </ul>
              <a href="/pagar?plan=pro" className="plan-btn" style={{ background:"linear-gradient(135deg,#f59e0b,#d97706)", color:"#000" }}>
                Empezar ahora →
              </a>
            </div>

            {/* Enterprise */}
            <div className="price-card reveal-scale d2">
              <div className="plan-name" style={{ color:"#8b5cf6" }}>Enterprise</div>
              <div className="plan-price-row">
                <span className="plan-price">S/ 1,999</span>
                <span className="plan-period">/mes</span>
              </div>
              <p className="plan-desc">Para grupos constructores con múltiples empresas.</p>
              <ul className="plan-features">
                {[
                  "Todo en Pro +",
                  "Multi-empresa en un solo panel",
                  "Gerente de cuenta dedicado",
                  "Onboarding y migración de datos",
                  "Integraciones a medida",
                  "SLA 99.9% garantizado",
                ].map(f=>(
                  <li key={f}><span className="check" style={{ color:"#8b5cf6" }}>✓</span>{f}</li>
                ))}
              </ul>
              <a href="https://wa.me/51907130225?text=Hola%2C%20me%20interesa%20el%20Plan%20Enterprise%20de%20Kostruye%2B" className="plan-btn" style={{ background:"rgba(255,255,255,.06)", color:"#fff", border:"1px solid rgba(139,92,246,.44)" }}>
                Contactar ventas
              </a>
            </div>
          </div>

          {/* Testimonial */}
          <div className="testi reveal">
            <div style={{ fontSize:32, marginBottom:16 }}>💬</div>
            <blockquote>
              "Pasamos de hojas de Excel con errores a tener control total de nuestra obra en tiempo real. La diferencia es brutal."
            </blockquote>
            <div style={{ color:"#6b7280", fontSize:14 }}>
              <strong style={{ color:"#f59e0b" }}>Jorge Olivera</strong> — Gerente de Proyecto, SEATEK Construcciones
            </div>
          </div>
        </div>
      </section>

      <div className="divider"/>

      {/* ═══════════════ CTA / CONTACT ═══════════════ */}
      <section className="section" id="contact">
        <div className="container">
          <div className="cta-box reveal">
            <span className="section-label">Empieza hoy</span>
            <h2 className="section-h" style={{ margin:"16px 0 12px" }}>
              ¿Listo para gestionar tus obras <span className="g-amber">con datos reales?</span>
            </h2>
            <p style={{ color:"#6b7280", fontSize:15, maxWidth:500, margin:"0 auto" }}>
              Sin contratos, sin letra pequeña. Tu primera obra activa en menos de 24 horas.
            </p>
            <div className="cta-btns">
              <a href="https://wa.me/51907130225?text=Hola%2C%20me%20interesa%20conocer%20Kostruye%2B" className="btn-primary" style={{ fontSize:16 }}>
                💬 Escribir por WhatsApp
              </a>
              <a href="mailto:kreoiastudioperu@gmail.com" className="btn-ghost" style={{ fontSize:16 }}>
                ✉️ kreoiastudioperu@gmail.com
              </a>
            </div>
            <div style={{ color:"#374151", fontSize:13 }}>
              O escríbenos a{" "}
              <a href="mailto:kreoiastudioperu@gmail.com" style={{ color:"#f59e0b", textDecoration:"none" }}>kreoiastudioperu@gmail.com</a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="footer">
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="white" fillOpacity="0.08"/>
            <rect x="5" y="5" width="5" height="22" rx="1" fill="white"/>
            <polygon points="10,5 10,15 21,5" fill="white"/>
            <polygon points="10,17 10,27 21,27 16,17" fill="white"/>
            <rect x="16.5" y="8" width="3" height="9" rx="0.75" fill="#60A5FA"/>
            <rect x="14" y="10.5" width="8" height="3" rx="0.75" fill="#60A5FA"/>
          </svg>
          <span style={{ fontWeight:700, fontSize:13, color:"#374151" }}>© 2026 KREO IA Studio</span>
        </div>
        <ul className="footer-links">
          {([["#features","Módulos"],["#pricing","Precios"],["#contact","Contacto"]] as [string,string][]).map(([h,l])=>(
            <li key={h}><a href={h}>{l}</a></li>
          ))}
        </ul>
      </footer>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
