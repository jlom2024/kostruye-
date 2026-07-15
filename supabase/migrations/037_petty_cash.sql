-- ── Tablas para Control de Caja Chica ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.petty_cash_boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    responsible_user_id UUID NOT NULL, -- Responsable de la rendición
    balance NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'PEN',
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.petty_cash_boxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members access to petty_cash_boxes" ON public.petty_cash_boxes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = petty_cash_boxes.project_id
            AND pm.user_id = auth.uid()
        )
    );

CREATE TABLE IF NOT EXISTS public.petty_cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    box_id UUID NOT NULL REFERENCES public.petty_cash_boxes(id) ON DELETE CASCADE,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('income', 'expense')),
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    concept TEXT NOT NULL,
    document_type VARCHAR(50), -- Factura, Boleta, Recibo, Ninguno
    document_number VARCHAR(50),
    supplier_name VARCHAR(150),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    image_url TEXT, -- Foto del recibo/boleta en Supabase Storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.petty_cash_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members access to petty_cash_transactions" ON public.petty_cash_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.petty_cash_boxes pcb
            JOIN public.project_members pm ON pm.project_id = pcb.project_id
            WHERE pcb.id = petty_cash_transactions.box_id
            AND pm.user_id = auth.uid()
        )
    );

-- Trigger o función para actualizar el saldo de la caja chica automáticamente al insertar una transacción
CREATE OR REPLACE FUNCTION public.fn_update_petty_cash_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.transaction_type = 'income') THEN
            UPDATE public.petty_cash_boxes
            SET balance = balance + NEW.amount
            WHERE id = NEW.box_id;
        ELSIF (NEW.transaction_type = 'expense') THEN
            UPDATE public.petty_cash_boxes
            SET balance = balance - NEW.amount
            WHERE id = NEW.box_id;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.transaction_type = 'income') THEN
            UPDATE public.petty_cash_boxes
            SET balance = balance - OLD.amount
            WHERE id = OLD.box_id;
        ELSIF (OLD.transaction_type = 'expense') THEN
            UPDATE public.petty_cash_boxes
            SET balance = balance + OLD.amount
            WHERE id = OLD.box_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_update_petty_cash_balance
AFTER INSERT OR DELETE ON public.petty_cash_transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_update_petty_cash_balance();
