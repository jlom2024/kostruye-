-- Migration 014: SUNAT credentials per organization
-- Credenciales SOL las ingresa el usuario en /configuracion → SUNAT (no van en .env)

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS sunat_ruc        TEXT,
  ADD COLUMN IF NOT EXISTS sunat_api_key    TEXT,
  ADD COLUMN IF NOT EXISTS sunat_api_secret TEXT,
  ADD COLUMN IF NOT EXISTS sunat_configurado BOOLEAN DEFAULT false NOT NULL;

-- electronic_invoices: historial de comprobantes emitidos por proyecto
CREATE TABLE IF NOT EXISTS electronic_invoices (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id            UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Datos del comprobante
  comprobante_tipo      TEXT NOT NULL CHECK (comprobante_tipo IN ('01','03','07','08')),
  serie                 TEXT NOT NULL,
  numero                INTEGER NOT NULL,
  numero_formateado     TEXT GENERATED ALWAYS AS (serie || '-' || lpad(numero::text, 8, '0')) STORED,

  -- Cliente
  receptor_tipo_doc     TEXT NOT NULL DEFAULT '6', -- 6=RUC, 1=DNI
  receptor_num_doc      TEXT NOT NULL,
  receptor_razon_social TEXT NOT NULL,

  -- Montos
  subtotal              NUMERIC(12,2) NOT NULL DEFAULT 0,
  igv                   NUMERIC(12,2) NOT NULL DEFAULT 0,
  total                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  moneda                TEXT NOT NULL DEFAULT 'PEN',

  -- Estado SUNAT
  estado_sunat          TEXT NOT NULL DEFAULT 'pendiente'
                          CHECK (estado_sunat IN ('pendiente','enviado','aceptado','rechazado','anulado')),
  sunat_comprobante_id  INTEGER,
  sunat_cdr_codigo      TEXT,
  sunat_cdr_descripcion TEXT,

  -- Fechas
  fecha_emision         DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE electronic_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage invoices"
  ON electronic_invoices
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
