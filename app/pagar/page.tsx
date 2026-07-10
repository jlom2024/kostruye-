import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pagar — Kostruye+",
  description: "Activa tu plan Kostruye+ con Yape, Plin o transferencia bancaria.",
  robots: "noindex",
};

const PLANS = {
  piloto: {
    name: "Piloto",
    price: "Gratis",
    color: "#6B7280", // Muted gray
    features: ["1 proyecto activo", "Presupuesto básico", "Dashboard ejecutivo", "Soporte por email"],
  },
  pro: {
    name: "Pro",
    price: "S/ 1,099/mes",
    color: "#B8733D", // Tres Mares Copper
    features: ["Proyectos ilimitados", "Todos los módulos", "KIA asistente IA", "Soporte 24/7"],
  },
  enterprise: {
    name: "Enterprise",
    price: "S/ 3,699/mes",
    color: "#0A3D5C", // Tres Mares Navy
    features: ["Todo en Pro", "Multi-empresa", "Gerente de cuenta dedicado", "SLA 99.9%"],
  },
} as const;

type PlanKey = keyof typeof PLANS;

export default async function PagarPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan: planParam } = await searchParams;
  const planKey: PlanKey = (planParam as PlanKey) in PLANS ? (planParam as PlanKey) : "pro";
  const plan = PLANS[planKey];

  const waMensaje = encodeURIComponent(
    `Hola, te envío mi voucher de pago para activar el Plan ${plan.name} de Kostruye+.`
  );
  const waLink = `https://wa.me/51907130225?text=${waMensaje}`;

  return (
    <>
      <style>{`
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
          --font-serif: 'Playfair Display', Georgia, serif;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          background: var(--color-bg-sand) !important; 
          color: var(--color-text-dark); 
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif; 
          min-height: 100vh; 
          -webkit-font-smoothing: antialiased;
        }

        .page-wrap { 
          min-height: 100vh; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          padding: 60px 20px; 
        }

        /* Header logo */
        .header-simple {
          width: 100%;
          max-width: 820px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          margin-bottom: 16px;
        }
        .logo-image {
          height: 38px;
          width: auto;
          object-fit: contain;
          filter: brightness(0) opacity(0.85);
          transition: all 0.3s ease;
        }
        .logo-image:hover {
          filter: brightness(0) opacity(1);
        }

        /* Enlace volver */
        .back { 
          display: inline-flex; 
          align-items: center; 
          gap: 6px; 
          color: var(--color-text-muted); 
          font-size: 13px; 
          text-decoration: none; 
          margin-bottom: 32px; 
          transition: color .2s; 
          align-self: flex-start; 
          max-width: 820px; 
          width: 100%; 
          font-weight: 500;
        }
        .back:hover { 
          color: var(--color-copper); 
        }

        /* Grid de contenido */
        .main-grid { 
          display: grid; 
          grid-template-columns: 1fr 1.1fr; 
          gap: 32px; 
          width: 100%; 
          max-width: 820px; 
        }

        /* Resumen del plan */
        .plan-box { 
          background: #FFFFFF; 
          border: 1px solid var(--color-border); 
          border-radius: 4px; 
          padding: 40px 32px; 
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
        }
        .plan-label { 
          font-size: 11px; 
          font-weight: 700; 
          letter-spacing: 0.15em; 
          text-transform: uppercase; 
          color: var(--color-text-muted); 
          margin-bottom: 16px; 
        }
        .plan-name { 
          font-family: var(--font-serif);
          font-weight: 400;
          font-size: 36px; 
          color: var(--color-navy);
          margin-bottom: 8px; 
        }
        .plan-price { 
          font-size: 18px; 
          color: var(--color-text-dark); 
          font-weight: 300;
          margin-bottom: 32px; 
        }
        .plan-feats { 
          list-style: none; 
          display: flex; 
          flex-direction: column; 
          gap: 12px; 
          margin-bottom: 40px; 
          flex-grow: 1;
        }
        .plan-feats li { 
          display: flex; 
          align-items: center; 
          gap: 12px; 
          font-size: 13px; 
          color: var(--color-text-dark); 
        }
        .feat-check { 
          font-weight: 700; 
          font-size: 14px; 
        }

        .plan-note { 
          background: var(--color-bg-sand); 
          border: 1px solid var(--color-border); 
          border-radius: 4px; 
          padding: 20px; 
        }
        .plan-note p { 
          font-size: 12px; 
          color: var(--color-text-muted); 
          line-height: 1.6; 
        }
        .plan-note strong { 
          color: var(--color-copper); 
          font-weight: 600;
        }

        /* Métodos de pago */
        .pay-box { 
          background: #FFFFFF; 
          border: 1px solid var(--color-border); 
          border-radius: 4px; 
          padding: 40px 32px; 
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.02);
          display: flex; 
          flex-direction: column; 
          gap: 28px; 
        }
        .pay-title { 
          font-family: var(--font-serif);
          font-size: 20px; 
          font-weight: 400;
          color: var(--color-navy); 
        }
        .pay-subtitle { 
          font-size: 13px; 
          color: var(--color-text-muted); 
          margin-top: 4px; 
          font-weight: 300;
        }

        /* QR yape/plin */
        .qr-row { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 20px; 
        }
        .qr-card { 
          background: #FFFFFF; 
          border: 1px solid var(--color-border); 
          border-radius: 4px; 
          padding: 16px; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          gap: 12px; 
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .qr-card:hover {
          border-color: var(--color-copper);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.02);
        }
        .qr-brand { 
          font-size: 11px; 
          font-weight: 700; 
          letter-spacing: 0.12em; 
          padding: 4px 12px;
          border-radius: 20px;
          text-align: center;
          width: 80%;
        }
        .qr-yape-brand {
          background: rgba(124, 58, 237, 0.08);
          color: #7c3aed;
        }
        .qr-plin-brand {
          background: rgba(0, 102, 255, 0.08);
          color: #0066ff;
        }
        .qr-img { 
          width: 100%; 
          aspect-ratio: 1; 
          object-fit: cover; 
          border-radius: 2px; 
          border: 1px solid var(--color-border);
          background: #fff; 
          display: block; 
        }

        /* Transferencia bancaria */
        .transfer-card { 
          background: var(--color-bg-sand); 
          border: 1px solid var(--color-border); 
          border-radius: 4px; 
          padding: 24px; 
        }
        .transfer-title { 
          font-size: 11px; 
          font-weight: 700; 
          color: var(--color-text-dark); 
          text-transform: uppercase; 
          letter-spacing: 0.15em; 
          margin-bottom: 16px; 
          border-bottom: 1px solid var(--color-border);
          padding-bottom: 8px;
        }
        .transfer-row { 
          display: flex; 
          justify-content: space-between; 
          align-items: baseline; 
          padding: 8px 0; 
          border-bottom: 1px solid var(--color-border); 
        }
        .transfer-row:last-child { 
          border-bottom: none; 
          padding-bottom: 0;
        }
        .transfer-key { 
          font-size: 12px; 
          color: var(--color-text-muted); 
        }
        .transfer-val { 
          font-size: 13px; 
          font-weight: 600; 
          color: var(--color-text-dark); 
          font-family: monospace; 
        }

        /* CTA Voucher */
        .voucher-cta { 
          background: #FFFFFF; 
          border: 1px solid var(--color-border); 
          border-radius: 4px; 
          padding: 24px; 
          text-align: center; 
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.01);
        }
        .voucher-cta p { 
          font-size: 13px; 
          color: var(--color-text-muted); 
          line-height: 1.6; 
          margin-bottom: 20px; 
        }
        .voucher-cta p strong { 
          color: var(--color-text-dark); 
          font-weight: 600;
        }
        .wa-btn { 
          display: inline-flex; 
          align-items: center; 
          justify-content: center;
          gap: 10px; 
          background: var(--color-copper); 
          color: #fff; 
          font-weight: 600; 
          font-size: 13px; 
          letter-spacing: 0.03em;
          padding: 12px 24px; 
          border-radius: 4px; 
          text-decoration: none; 
          width: 100%;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); 
        }
        .wa-btn:hover { 
          background: var(--color-copper-light);
          transform: translateY(-1px); 
          box-shadow: 0 10px 25px rgba(184, 115, 61, 0.25);
        }
        .wa-icon { 
          font-size: 16px; 
        }

        /* Responsive */
        @media (max-width: 768px) {
          .main-grid { grid-template-columns: 1fr; gap: 24px; }
          .qr-row { grid-template-columns: 1fr 1fr; }
          .back { margin-bottom: 20px; }
          .page-wrap { padding: 40px 16px; }
        }
      `}</style>

      <div className="page-wrap">
        {/* Header simple con logo */}
        <header className="header-simple">
          <a href="/" className="nav-logo-link">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-brand.png" alt="Kostruye+" className="logo-image" />
          </a>
        </header>

        {/* Back link */}
        <a href="/#pricing" className="back">← Volver a planes</a>

        <div className="main-grid">
          {/* Columna izquierda — resumen del plan */}
          <div className="plan-box">
            <div className="plan-label">Plan seleccionado</div>
            <div className="plan-name" style={{ color: plan.color }}>{plan.name}</div>
            <div className="plan-price">{plan.price}</div>

            <ul className="plan-feats">
              {plan.features.map((f) => (
                <li key={f}>
                  <span className="feat-check" style={{ color: plan.color }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <div className="plan-note">
              <p>
                <strong>¿Cómo funciona?</strong><br />
                Realiza el pago por cualquier método, envíanos el voucher por WhatsApp y
                <strong> activamos tu cuenta en menos de 24 horas.</strong>
              </p>
            </div>
          </div>

          {/* Columna derecha — métodos de pago */}
          <div className="pay-box">
            <div>
              <div className="pay-title">Métodos de pago</div>
              <div className="pay-subtitle">Elige el que más te convenga</div>
            </div>

            {/* QRs Yape y Plin */}
            <div className="qr-row">
              <div className="qr-card">
                <div className="qr-brand qr-yape-brand">YAPE</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/qr-yape.jpg" alt="QR Yape" className="qr-img" />
              </div>
              <div className="qr-card">
                <div className="qr-brand qr-plin-brand">PLIN</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/qr-plin.jpg" alt="QR Plin" className="qr-img" />
              </div>
            </div>

            {/* Transferencia bancaria */}
            <div className="transfer-card">
              <div className="transfer-title">Transferencia bancaria</div>
              {[
                ["Banco", "Interbank"],
                ["Titular", "Jorge Ordoñez"],
                ["Cuenta soles", "084 3161549763"],
                ["CCI", "00308401316154976316"],
              ].map(([k, v]) => (
                <div className="transfer-row" key={k}>
                  <span className="transfer-key">{k}</span>
                  <span className="transfer-val">{v}</span>
                </div>
              ))}
            </div>

            {/* CTA envío voucher */}
            <div className="voucher-cta">
              <p>
                Después de pagar, <strong>envía una foto de tu voucher</strong> al siguiente número
                y te damos de alta de inmediato.
              </p>
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="wa-btn">
                <span className="wa-icon">💬</span>
                Enviar voucher por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
