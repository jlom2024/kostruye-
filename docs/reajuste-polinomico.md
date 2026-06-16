# Fórmula Polinómica de Reajuste (D.S. 011-79-VC)

Reajuste de valorizaciones por variación de precios usando índices unificados INEI, según la fórmula polinómica de la normativa peruana de obras públicas.

```
K = Σ ( coef_i × Ir_i / Io_i )
```

- **coef_i** — coeficiente de incidencia del monomio (Σ debe = 1.00)
- **Io_i** — índice INEI en la **fecha base** del contrato
- **Ir_i** — índice INEI en el **período** de la valorización
- **K** — factor de reajuste aplicado al monto de la valorización

## Modelo de datos

| Tabla | Rol |
|-------|-----|
| `reajuste_formulas` | Fórmula por proyecto (`name`, `budget_id`, `contract_date`, `notes`) |
| `reajuste_monomios` | Monomios de la fórmula (`symbol`, `coefficient`, `index_code`, `sort_order`) |
| `inei_indices` | Catálogo de índices INEI por período (`index_code`, `period_year/month`, `index_value`) |
| `valorizaciones` | Campos `reajuste_formula_id`, `factor_k`, `monto_reajuste` |

**Función SQL:** `fn_calc_factor_k(formula_id, año_base, mes_base, año_val, mes_val)` → `NUMERIC` (migración 016).

**Validación:** el trigger `fn_check_reajuste_coeff` rechaza guardar un monomio si Σ coeficientes > 1.00 (tolerancia 0.001).

## RLS (migración 020)

`reajuste_formulas` y `reajuste_monomios` tenían **solo** policy de SELECT. Se añadieron INSERT/UPDATE/DELETE para `admin`/`project_manager` del proyecto (criterio project-aware con fallback a org, igual que `valorizaciones`). Los monomios heredan el permiso vía su fórmula padre.

## UI — Panel de Fórmula Polinómica

**Componente:** [`components/reajuste/reajuste-panel.tsx`](../components/reajuste/reajuste-panel.tsx)
**Ubicación:** colapsable en la parte superior de `/proyectos/[id]/valorizaciones` (el reajuste es parte conceptual de las valorizaciones).

Funcionalidad:
- CRUD de fórmulas (nombre, fecha base Io).
- CRUD de monomios: símbolo (A, B, C…), coeficiente, índice INEI (select del catálogo).
- Indicador en vivo de **Σ coeficientes** — verde si = 1.000, ámbar si no.
- Al agregar un monomio sugiere el coeficiente restante para llegar a 1.000.
- Gating de edición por permiso `valorizaciones.edit` (`userCanProject`); en solo-lectura los inputs se deshabilitan y se ocultan los botones de agregar/eliminar.

### Permisos

- **Editar fórmulas/monomios:** `userCanProject(projectId, "valorizaciones", "edit")` → prop `canEdit`.
- La barrera real es la RLS (migración 020); el gating de UI es defensa en profundidad.

## Aplicación del factor K a la valorización ✅

En el detalle de cada valorización (`valorizaciones-client.tsx`) hay una fila **"Reajuste polinómico"**:

- Select de fórmula del proyecto. Al elegir una (o pulsar **Recalcular**) se invoca `fn_calc_factor_k` con:
  - **período base (Io)** = `contract_date` de la fórmula
  - **período valorización (Ir)** = mes del `end_date` de la valorización
- Se persiste en la valorización: `reajuste_formula_id`, `factor_k`, `monto_reajuste = (K − 1) × total_amount`.
- Se muestra K, el monto de reajuste y el **total con reajuste**.
- Bloqueado cuando la valorización está `approved` (display-only). Validaciones: la fórmula necesita `contract_date` y la valorización `end_date`.

## Reajuste en el PDF ✅

El comprobante imprimible (`valorizaciones/[valId]/print`) muestra, cuando la valorización tiene reajuste aplicado:

- Línea **Reajuste polinómico (K = x.xxxx)** con el monto.
- **Subtotal reajustado** = monto período + reajuste.
- El **IGV (18%)** y el **TOTAL CON IGV** se calculan sobre el subtotal reajustado.

## Gestión de índices INEI ✅

Como los índices INEI son **data nacional compartida** (no por tenant), su captura vive en el panel `/admin` de KREO (no en una pantalla por organización), evitando que un tenant altere los valores de otro.

- **UI:** [`app/admin/inei/page.tsx`](../app/admin/inei/page.tsx) — registrar/actualizar índices por código + período (autocompleta el nombre desde el catálogo de 20 códigos), listado agrupado por período, eliminar.
- **API:** [`app/api/admin/inei/route.ts`](../app/api/admin/inei/route.ts) — GET/POST(upsert)/DELETE, protegida por el cookie `kostruye_admin` (middleware) + service role. Upsert por `(index_code, period_year, period_month)`.
- Acceso desde el dashboard admin → botón **"Índices INEI"**.

> Flujo completo: KREO carga los índices INEI del mes en `/admin/inei` → el usuario define su fórmula polinómica → al valorizar, `fn_calc_factor_k` usa esos índices para K real.

## Pendiente

- Cargar la serie histórica real del INEI (los valores oficiales mes a mes) usando la pantalla `/admin/inei`. El módulo ya está completo en código; solo falta poblar la data.
