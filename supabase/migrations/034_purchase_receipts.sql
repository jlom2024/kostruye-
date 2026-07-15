-- ── Recepciones de Órdenes de Compra ─────────────────────────────
-- Permite registrar la recepción parcial o total de materiales de una OC
-- y automáticamente incrementa el stock en el almacén.

CREATE TABLE IF NOT EXISTS public.purchase_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    received_by UUID REFERENCES auth.users(id),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.purchase_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES public.purchase_receipts(id) ON DELETE CASCADE,
    purchase_order_item_id UUID NOT NULL REFERENCES public.purchase_order_items(id),
    received_quantity NUMERIC(15,4) NOT NULL CHECK (received_quantity > 0),
    unit_price NUMERIC(15,4),
    notes TEXT,
    UNIQUE(receipt_id, purchase_order_item_id)
);

-- RLS básico para purchase_receipts
ALTER TABLE public.purchase_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_receipt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view purchase_receipts of their projects"
ON public.purchase_receipts FOR SELECT
USING (
    purchase_order_id IN (
        SELECT po.id FROM public.purchase_orders po
        JOIN public.projects p ON p.id = po.project_id
        JOIN public.organization_members om ON om.organization_id = p.organization_id
        WHERE om.user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage purchase_receipts of their projects"
ON public.purchase_receipts FOR ALL
USING (
    purchase_order_id IN (
        SELECT po.id FROM public.purchase_orders po
        JOIN public.projects p ON p.id = po.project_id
        JOIN public.organization_members om ON om.organization_id = p.organization_id
        WHERE om.user_id = auth.uid()
    )
)
WITH CHECK (
    purchase_order_id IN (
        SELECT po.id FROM public.purchase_orders po
        JOIN public.projects p ON p.id = po.project_id
        JOIN public.organization_members om ON om.organization_id = p.organization_id
        WHERE om.user_id = auth.uid()
    )
);

CREATE POLICY "Users can view purchase_receipt_items of their projects"
ON public.purchase_receipt_items FOR SELECT
USING (
    receipt_id IN (
        SELECT pr.id FROM public.purchase_receipts pr
        JOIN public.purchase_orders po ON pr.purchase_order_id = po.id
        JOIN public.projects p ON p.id = po.project_id
        JOIN public.organization_members om ON om.organization_id = p.organization_id
        WHERE om.user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage purchase_receipt_items of their projects"
ON public.purchase_receipt_items FOR ALL
USING (
    receipt_id IN (
        SELECT pr.id FROM public.purchase_receipts pr
        JOIN public.purchase_orders po ON pr.purchase_order_id = po.id
        JOIN public.projects p ON p.id = po.project_id
        JOIN public.organization_members om ON om.organization_id = p.organization_id
        WHERE om.user_id = auth.uid()
    )
)
WITH CHECK (
    receipt_id IN (
        SELECT pr.id FROM public.purchase_receipts pr
        JOIN public.purchase_orders po ON pr.purchase_order_id = po.id
        JOIN public.projects p ON p.id = po.project_id
        JOIN public.organization_members om ON om.organization_id = p.organization_id
        WHERE om.user_id = auth.uid()
    )
);

-- Función que confirma una recepción e inserta los movimientos de stock
CREATE OR REPLACE FUNCTION public.fn_confirm_purchase_receipt(
    p_receipt_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_po_id UUID;
    v_project_id UUID;
    v_receipt_date DATE;
BEGIN
    -- Obtener datos de la recepción
    SELECT pr.purchase_order_id, po.project_id, pr.receipt_date
    INTO v_po_id, v_project_id, v_receipt_date
    FROM public.purchase_receipts pr
    JOIN public.purchase_orders po ON pr.purchase_order_id = po.id
    WHERE pr.id = p_receipt_id;

    -- Por cada ítem de la recepción, ingresar al stock usando las columnas reales de stock_entries
    -- Columnas reales: project_id, stock_item_id, quantity, unit_cost, entry_date, purchase_order_id, notes
    -- Primero aseguramos que exista el stock_item para el recurso
    INSERT INTO public.stock_items (project_id, resource_id, unit, notes)
    SELECT DISTINCT v_project_id, poi.resource_id, poi.unit, 'Auto-creado desde OC'
    FROM public.purchase_receipt_items pri
    JOIN public.purchase_order_items poi ON pri.purchase_order_item_id = poi.id
    WHERE pri.receipt_id = p_receipt_id AND poi.resource_id IS NOT NULL
    ON CONFLICT DO NOTHING;

    -- Luego insertamos las entradas de stock
    INSERT INTO public.stock_entries (
        project_id, stock_item_id, quantity, unit_cost,
        entry_date, purchase_order_id, notes
    )
    SELECT 
        v_project_id,
        si.id,
        pri.received_quantity,
        COALESCE(pri.unit_price, poi.unit_price),
        v_receipt_date,
        v_po_id,
        'Recepción automática desde OC - ' || p_receipt_id
    FROM public.purchase_receipt_items pri
    JOIN public.purchase_order_items poi ON pri.purchase_order_item_id = poi.id
    JOIN public.stock_items si ON si.resource_id = poi.resource_id AND si.project_id = v_project_id
    WHERE pri.receipt_id = p_receipt_id AND poi.resource_id IS NOT NULL;

    -- Marcar la recepción como confirmada
    UPDATE public.purchase_receipts
    SET status = 'confirmed'
    WHERE id = p_receipt_id;

    -- Verificar si la OC está completamente recibida y actualizar su estado
    UPDATE public.purchase_orders po
    SET status = 'received'
    WHERE po.id = v_po_id
    AND NOT EXISTS (
        SELECT 1 FROM public.purchase_order_items poi2
        WHERE poi2.purchase_order_id = v_po_id
        AND poi2.quantity > (
            SELECT COALESCE(SUM(pri2.received_quantity), 0)
            FROM public.purchase_receipt_items pri2
            JOIN public.purchase_receipts pr2 ON pri2.receipt_id = pr2.id
            WHERE pr2.purchase_order_id = v_po_id
              AND pr2.status = 'confirmed'
              AND pri2.purchase_order_item_id = poi2.id
        )
    );
END;
$$;
