import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad — Kostruye+",
  description: "Política de privacidad y protección de datos de Kostruye+.",
  robots: "noindex, follow",
};

export default function PrivacidadPage() {
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
          <h1>Política de Privacidad</h1>
          <div className="last-update">Última actualización: 10 de julio de 2026</div>

          <div className="legal-content">
            <p>
              En Kostruye+ (operado por KREO IA Studio), valoramos y protegemos la privacidad de su empresa y de la información de sus proyectos de construcción. Esta Política de Privacidad detalla cómo recopilamos, almacenamos y procesamos los datos.
            </p>

            <h2>1. Información Recopilada</h2>
            <p>
              Recopilamos información corporativa provista directamente durante la creación del tenant (nombre de la empresa, RUC, correos de contacto) y los datos operativos ingresados en la plataforma (presupuestos S10, registros de almacén, planilla de personal civil, tareo de obra).
            </p>

            <h2>2. Seguridad y Aislamiento de Datos</h2>
            <p>
              Toda la base de datos corre de forma segura sobre los servidores de Supabase. Cada tenant posee un aislamiento estricto de esquemas a nivel de base de datos, garantizando que ninguna otra empresa pueda leer o modificar su información operativa o financiera de obra.
            </p>

            <h2>3. Uso de la Información</h2>
            <p>
              Utilizamos sus datos exclusivamente para proveer el servicio del ERP: procesar comparativas de costos, consolidar reportes de valorización, calcular planillas del personal de construcción y permitir consultas al asistente inteligente "KIA" sobre el estado específico de sus obras.
            </p>

            <h2>4. Compartición de Datos</h2>
            <p>
              KREO IA Studio no vende, alquila ni comparte la base de datos de su constructora con terceros bajo ningún concepto, salvo requerimiento judicial explícito de acuerdo a las leyes del Perú.
            </p>

            <h2>5. Derechos de Acceso y Rectificación</h2>
            <p>
              Los administradores de cada tenant tienen control total para ingresar, modificar, exportar o depurar sus bases de datos en cualquier momento desde el panel del sistema.
            </p>
          </div>
        </article>
      </div>
    </>
  );
}
