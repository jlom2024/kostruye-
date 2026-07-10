import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos de Servicio — Kostruye+",
  description: "Términos y condiciones de uso de la plataforma Kostruye+.",
  robots: "noindex, follow",
};

export default function TerminosPage() {
  return (
    <>
      <style>{`
        :root {
          --color-navy: #0A3D5C;
          --color-copper: #B8733D;
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

        .legal-wrap {
          max-width: 800px;
          margin: 0 auto;
          padding: 80px 24px;
        }

        .header-simple {
          width: 100%;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          margin-bottom: 40px;
        }
        .logo-image {
          height: 38px;
          width: auto;
          filter: brightness(0) opacity(0.85);
          transition: all 0.3s ease;
        }
        .logo-image:hover {
          filter: brightness(0) opacity(1);
        }

        .back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--color-text-muted);
          font-size: 13px;
          text-decoration: none;
          margin-bottom: 40px;
          font-weight: 500;
          transition: color 0.2s;
        }
        .back:hover {
          color: var(--color-copper);
        }

        .legal-card {
          background: #FFFFFF;
          border: 1px solid var(--color-border);
          border-radius: 4px;
          padding: 60px 48px;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.02);
        }

        h1 {
          font-family: var(--font-serif);
          font-weight: 400;
          font-size: 38px;
          color: var(--color-navy);
          margin-bottom: 12px;
        }

        .last-update {
          font-size: 13px;
          color: var(--color-text-muted);
          margin-bottom: 40px;
          border-bottom: 1px solid var(--color-border);
          padding-bottom: 20px;
        }

        .legal-content h2 {
          font-family: var(--font-serif);
          font-weight: 400;
          font-size: 20px;
          color: var(--color-navy);
          margin-top: 32px;
          margin-bottom: 12px;
        }

        .legal-content p, .legal-content li {
          font-size: 14px;
          line-height: 1.7;
          color: #333333;
          margin-bottom: 16px;
        }

        .legal-content ul {
          margin-left: 20px;
          margin-bottom: 16px;
        }

        @media (max-width: 640px) {
          .legal-card {
            padding: 32px 24px;
          }
          h1 {
            font-size: 28px;
          }
          .legal-wrap {
            padding: 40px 16px;
          }
        }
      `}</style>

      <div className="legal-wrap">
        <header className="header-simple">
          <a href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-brand.png" alt="Kostruye+" className="logo-image" />
          </a>
        </header>

        <a href="/" className="back">← Volver al inicio</a>

        <article className="legal-card">
          <h1>Términos de Servicio</h1>
          <div className="last-update">Última actualización: 10 de julio de 2026</div>

          <div className="legal-content">
            <p>
              Bienvenido a Kostruye+. Al acceder o utilizar nuestra plataforma de software como servicio (SaaS) orientada a la gestión operativa de constructoras, usted acepta estar sujeto a estos Términos de Servicio. Por favor, léalos detenidamente.
            </p>

            <h2>1. Uso de la Plataforma</h2>
            <p>
              Kostruye+ otorga a su empresa una licencia de uso no exclusiva, intransferible y limitada para acceder y utilizar las herramientas de presupuesto, control de almacén, compras, nómina de construcción civil e inteligencia artificial de acuerdo con el plan seleccionado.
            </p>

            <h2>2. Registro y Cuentas de Tenant</h2>
            <p>
              Para utilizar el servicio, cada empresa contará con un tenant (entorno) aislado. Usted es responsable de mantener la confidencialidad de las credenciales de acceso de sus usuarios y del uso de su base de datos.
            </p>

            <h2>3. Propiedad Intelectual</h2>
            <p>
              Todos los derechos de propiedad intelectual sobre el software, código fuente, interfaz, diseños, logotipos y la inteligencia artificial "KIA" pertenecen exclusivamente a KREO IA Studio. Usted conserva los derechos sobre los datos de obras cargados en su tenant.
            </p>

            <h2>4. Limitación de Responsabilidad</h2>
            <p>
              Kostruye+ proporciona herramientas de estimación y control de costos para ayudar a optimizar la gestión de obras. Sin embargo, el análisis técnico final y la toma de decisiones contractuales en sus proyectos de construcción son responsabilidad exclusiva de su equipo de ingeniería.
            </p>

            <h2>5. Tarifas y Suscripción</h2>
            <p>
              El cobro del servicio se realiza de forma mensual de acuerdo al plan contratado (Pro o Enterprise). El incumplimiento en el pago resultará en la suspensión temporal del acceso a su tenant.
            </p>
          </div>
        </article>
      </div>
    </>
  );
}
