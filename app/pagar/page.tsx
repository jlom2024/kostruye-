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
    color: "#6b7280",
    features: ["1 proyecto activo", "Presupuesto básico", "Dashboard ejecutivo", "Soporte por email"],
  },
  pro: {
    name: "Pro",
    price: "S/ 599/mes",
    color: "#f59e0b",
    features: ["Proyectos ilimitados", "Todos los módulos", "KIA asistente IA", "Soporte 24/7"],
  },
  enterprise: {
    name: "Enterprise",
    price: "S/ 1,999/mes",
    color: "#8b5cf6",
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
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #030712; color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif; min-height: 100vh; }

        .page-wrap { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; gap: 0; }

        /* Back link */
        .back { display: inline-flex; align-items: center; gap: 6px; color: #6b7280; font-size: 13px; text-decoration: none; margin-bottom: 32px; transition: color .2s; align-self: flex-start; max-width: 700px; width: 100%; }
        .back:hover { color: #f59e0b; }

        /* Layout principal */
        .main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; width: 100%; max-width: 820px; }

        /* Plan resumen */
        .plan-box { background: rgba(11,17,34,.9); border: 1px solid rgba(255,255,255,.1); border-radius: 20px; padding: 28px; }
        .plan-label { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #6b7280; margin-bottom: 10px; }
        .plan-name { font-size: 28px; font-weight: 900; margin-bottom: 4px; }
        .plan-price { font-size: 15px; color: #9ca3af; margin-bottom: 24px; }
        .plan-feats { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
        .plan-feats li { display: flex; align-items: center; gap: 9px; font-size: 13px; color: #d1d5db; }
        .feat-check { font-weight: 700; font-size: 13px; }

        .plan-note { background: rgba(245,158,11,.06); border: 1px solid rgba(245,158,11,.15); border-radius: 12px; padding: 16px; }
        .plan-note p { font-size: 12px; color: #9ca3af; line-height: 1.6; }
        .plan-note strong { color: #f59e0b; }

        /* Métodos de pago */
        .pay-box { background: rgba(11,17,34,.9); border: 1px solid rgba(255,255,255,.1); border-radius: 20px; padding: 28px; display: flex; flex-direction: column; gap: 20px; }
        .pay-title { font-size: 14px; font-weight: 700; color: #f9fafb; }
        .pay-subtitle { font-size: 12px; color: #6b7280; margin-top: 2px; }

        /* QR cards */
        .qr-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .qr-card { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .qr-brand { font-size: 12px; font-weight: 800; letter-spacing: .5px; }
        .qr-img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; background: #fff; display: block; }

        /* Transferencia */
        .transfer-card { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 16px; }
        .transfer-title { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
        .transfer-row { display: flex; justify-content: space-between; align-items: baseline; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,.04); }
        .transfer-row:last-child { border-bottom: none; }
        .transfer-key { font-size: 11px; color: #6b7280; }
        .transfer-val { font-size: 12px; font-weight: 700; color: #e5e7eb; font-family: monospace; }

        /* CTA Voucher */
        .voucher-cta { background: linear-gradient(135deg, rgba(37,211,102,.08), rgba(37,211,102,.04)); border: 1px solid rgba(37,211,102,.2); border-radius: 14px; padding: 18px; text-align: center; }
        .voucher-cta p { font-size: 12px; color: #9ca3af; line-height: 1.65; margin-bottom: 14px; }
        .voucher-cta p strong { color: #f9fafb; }
        .wa-btn { display: inline-flex; align-items: center; gap: 8px; background: #25d366; color: #fff; font-weight: 700; font-size: 13px; padding: 11px 22px; border-radius: 10px; text-decoration: none; transition: opacity .2s, transform .2s; }
        .wa-btn:hover { opacity: .88; transform: translateY(-1px); }
        .wa-icon { font-size: 16px; }

        /* Responsive */
        @media (max-width: 640px) {
          .main-grid { grid-template-columns: 1fr; }
          .qr-row { grid-template-columns: 1fr 1fr; }
          .back { margin-bottom: 20px; }
        }
      `}</style>

      <div className="page-wrap">
        {/* Back */}
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
                <div className="qr-brand" style={{ color: "#7c3aed" }}>YAPE</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/qr-yape.jpg" alt="QR Yape" className="qr-img" />
              </div>
              <div className="qr-card">
                <div className="qr-brand" style={{ color: "#0066ff" }}>PLIN</div>
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
