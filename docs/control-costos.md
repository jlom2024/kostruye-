# Control de Costos (desviaciones por partida)

Compara, **por partida de control**, lo presupuestado contra el costo real consumido, para detectar sobrecostos a tiempo.

## Alcance del "costo real"

El único costo real que el modelo ata a una partida es el **consumo de materiales (Kardex)**:
`stock_withdrawals.budget_item_id` × `total_cost` (PPP, migración 009).

- **Mano de obra** (`payroll_periods`) y **servicios** (`service_order_advances`) no se imputan a partida — se controlan a nivel de proyecto en el **Dashboard** (Resultado Operativo).
- Las **órdenes de compra** no se vinculan a partida (no hay FK), por eso no se usan aquí; el indicador de consumo es la salida de almacén imputada a la partida.

> Si en el futuro se agrega `budget_item_id` a OC/servicios, esta vista puede sumarlos sin cambios de UI.

## Datos

- **Partidas de control:** `budget_items` del presupuesto **venta**.
- **Consumo real:** suma de `stock_withdrawals.total_cost` agrupada por `budget_item_id` (filtrada por `project_id`).
- **Desviación** = consumido − presupuestado. **% consumo** = consumido / presupuestado.

## UI

- **Ruta:** `/proyectos/[id]/control-costos` (sidebar para `admin`/`contador`).
- **Page:** [`page.tsx`](../app/(dashboard)/proyectos/[id]/control-costos/page.tsx) — carga capítulos, partidas y vales; agrega consumo por partida en el servidor.
- **Client:** [`control-costos-client.tsx`](../app/(dashboard)/proyectos/[id]/control-costos/control-costos-client.tsx):
  - **KPIs:** presupuestado, consumido (+% del presupuesto), partidas con consumo, partidas en sobrecosto.
  - Tabla por capítulo (colapsable) con presupuesto / consumido / desviación / % consumo y barra de progreso (verde <85%, ámbar 85-100%, rojo sobrecosto).
  - Filtro **"Solo sobrecostos"**.
  - Aviso de alcance visible (el real = materiales Kardex).

## Pendiente / extensiones

- Imputar OC y servicios a partida (requiere `budget_item_id` en esas tablas) para un costo real completo por partida.
- Comparar contra el presupuesto **meta** (no solo venta) cuando exista mapeo meta↔venta de partidas.
