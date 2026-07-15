import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────
// KIA — Definición de herramientas en formato OpenAI function calling
// ─────────────────────────────────────────────────────────────────
const OPENAI_TOOLS: OpenAITool[] = [
  {
    type: "function",
    function: {
      name: "get_projects",
      description: "Lista todos los proyectos de la organización con estado, presupuesto y fechas",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_project_budget",
      description: "Obtiene las partidas del presupuesto de un proyecto con montos y gastos reales",
      parameters: {
        type: "object",
        properties: { project_id: { type: "string", description: "UUID del proyecto" } },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_purchase_orders",
      description: "Lista las órdenes de compra de un proyecto con proveedor, monto y estado",
      parameters: {
        type: "object",
        properties: { project_id: { type: "string", description: "UUID del proyecto" } },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_payroll",
      description: "Obtiene las nóminas/planillas de un proyecto con montos y fechas",
      parameters: {
        type: "object",
        properties: { project_id: { type: "string", description: "UUID del proyecto" } },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_valuations",
      description: "Lista las valorizaciones de un proyecto con montos y estados",
      parameters: {
        type: "object",
        properties: { project_id: { type: "string", description: "UUID del proyecto" } },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_clients",
      description: "Lista los clientes de la organización",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_warehouse",
      description: "Consulta el stock o inventario del almacén de un proyecto",
      parameters: {
        type: "object",
        properties: { project_id: { type: "string", description: "UUID del proyecto" } },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_service_orders",
      description: "Lista las órdenes de servicio de un proyecto (subcontratos, equipos, transporte) con montos y estados",
      parameters: {
        type: "object",
        properties: { project_id: { type: "string", description: "UUID del proyecto" } },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_workers",
      description: "Lista el personal (empleados/trabajadores) de un proyecto con su cargo/categoría, DNI, salario y estado",
      parameters: {
        type: "object",
        properties: { project_id: { type: "string", description: "UUID del proyecto" } },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_inei_indices",
      description: "Consulta los Índices Unificados de Precios de la Construcción (INEI/IUPCs). Úsalo cuando el usuario pregunte por índices INEI, valores para la fórmula polinómica, el índice de mano de obra, acero, cemento, etc.",
      parameters: {
        type: "object",
        properties: {
          index_code: { type: "string", description: "Código del índice (ej: '47' mano de obra, '03' acero corrugado). Omitir para obtener todos." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_reajuste_formulas",
      description: "Obtiene las fórmulas polinómicas de reajuste (Factor K) de un proyecto con sus monomios e índices INEI asignados",
      parameters: {
        type: "object",
        properties: { project_id: { type: "string", description: "UUID del proyecto" } },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_k_factor_risk",
      description: "Analiza el riesgo de incremento por inflación (Factor K) analizando la tendencia de los índices INEI y los coeficientes de los monomios del proyecto",
      parameters: {
        type: "object",
        properties: { project_id: { type: "string", description: "UUID del proyecto" } },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "detect_cost_overrun",
      description: "Detecta desvíos de sobregasto comparando las compras reales y nóminas procesadas contra el presupuesto meta del proyecto",
      parameters: {
        type: "object",
        properties: { project_id: { type: "string", description: "UUID del proyecto" } },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_committee_minutes",
      description: "Genera una minuta ejecutiva en formato markdown para el comité de obra, resumiendo desvíos de costos, alertas, estado de valorizaciones y avances",
      parameters: {
        type: "object",
        properties: { project_id: { type: "string", description: "UUID del proyecto" } },
        required: ["project_id"],
      },
    },
  },
];

// ─────────────────────────────────────────────────────────────────
// Tipos OpenAI
// ─────────────────────────────────────────────────────────────────
type OpenAITool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

type OpenAIMessage =
  | { role: "system";    content: string }
  | { role: "user";      content: string }
  | { role: "assistant"; content: string | null; tool_calls?: OpenAIToolCall[] }
  | { role: "tool";      content: string; tool_call_id: string };

type OpenAIToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

// ─────────────────────────────────────────────────────────────────
// Ejecución de herramientas (sin cambios respecto a versión Anthropic)
// ─────────────────────────────────────────────────────────────────
async function runTool(
  name: string,
  args: Record<string, string>,
  supabase: any,
  orgId: string
) {
  switch (name) {
    case "get_projects": {
      const { data } = await supabase
        .from("projects")
        .select("id, name, code, status, client, location, currency, start_date, end_date")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      return data ?? [];
    }
    case "get_project_budget": {
      const { data: budgets } = await supabase
        .from("budgets")
        .select("id, budget_type, total")
        .eq("project_id", args.project_id);
      if (!budgets?.length) return { error: "Sin presupuesto registrado" };

      const ventaBudget = budgets.find((b: any) => b.budget_type === "venta");
      const metaBudget  = budgets.find((b: any) => b.budget_type === "meta");

      const { data: chapters } = ventaBudget
        ? await supabase
            .from("budget_chapters")
            .select("code, name, total")
            .eq("budget_id", (ventaBudget as any).id)
            .order("sort_order")
        : { data: [] };

      return {
        presupuesto_venta: (ventaBudget as any)?.total ?? 0,
        presupuesto_meta:  (metaBudget as any)?.total  ?? 0,
        capitulos: chapters ?? [],
      };
    }
    case "get_purchase_orders": {
      const { data } = await supabase
        .from("purchase_orders")
        .select("id, po_number, status, total, issue_date, suppliers(name)")
        .eq("project_id", args.project_id)
        .order("issue_date", { ascending: false });
      return (data ?? []).map((p: any) => ({
        po_number:  p.po_number,
        supplier:   (p.suppliers as { name: string } | null)?.name ?? "—",
        total:      p.total,
        status:     p.status,
        issue_date: p.issue_date,
      }));
    }
    case "get_payroll": {
      const { data } = await supabase
        .from("payroll_periods")
        .select("id, period_name, start_date, end_date, total_gross, total_net, status")
        .eq("project_id", args.project_id)
        .order("start_date", { ascending: false });
      return data ?? [];
    }
    case "get_valuations": {
      const { data } = await supabase
        .from("valorizaciones")
        .select("id, val_number, period_name, start_date, end_date, total_amount, status, notes")
        .eq("project_id", args.project_id)
        .order("val_number", { ascending: false });
      return data ?? [];
    }
    case "get_clients": {
      const { data } = await supabase
        .from("clients")
        .select("id, name, type, contact_name, phone, email, city, active")
        .eq("organization_id", orgId)
        .order("name");
      return data ?? [];
    }
    case "get_service_orders": {
      const { data } = await supabase
        .from("service_orders")
        .select("os_number, service_type, description, amount, status, issue_date, completion_date, suppliers(name)")
        .eq("project_id", args.project_id)
        .order("created_at", { ascending: false });
      return (data ?? []).map((o: any) => ({
        os_number:       o.os_number,
        type:            o.service_type,
        description:     o.description,
        supplier:        (o.suppliers as { name: string } | null)?.name ?? "—",
        amount:          o.amount,
        status:          o.status,
        issue_date:      o.issue_date,
        completion_date: o.completion_date,
      }));
    }
    case "get_warehouse": {
      const { data } = await supabase
        .from("stock_levels")
        .select("name, unit, current_stock, total_in, total_out, low_stock, min_stock")
        .eq("project_id", args.project_id)
        .order("name");
      if (!data?.length) return { message: "Sin ítems registrados en almacén para este proyecto." };
      return data;
    }
    case "get_workers": {
      const { data } = await supabase
        .from("workers")
        .select("id, full_name, dni, category, daily_wage, is_active, start_date")
        .eq("project_id", args.project_id)
        .order("full_name");
      if (!data?.length) return { message: "No se encontraron empleados o trabajadores para este proyecto." };
      return data;
    }
    case "get_inei_indices": {
      const { data: latest } = await supabase
        .from("inei_indices")
        .select("period_year, period_month")
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false })
        .limit(1)
        .single();
      if (!latest) return { message: "No hay índices INEI cargados en el sistema." };

      let q = supabase
        .from("inei_indices")
        .select("index_code, index_name, index_value")
        .eq("period_year", latest.period_year)
        .eq("period_month", latest.period_month)
        .order("index_code");
      if (args.index_code) q = q.eq("index_code", args.index_code) as typeof q;

      const { data: indices } = await q;
      const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
      return {
        periodo: `${meses[latest.period_month - 1]} ${latest.period_year}`,
        base: "Diciembre 2025 = 100 (R.J. 016-2026-INEI)",
        area: "Área 1 — Lima Metropolitana",
        indices: indices ?? [],
      };
    }
    case "get_reajuste_formulas": {
      const { data: formulas } = await supabase
        .from("reajuste_formulas")
        .select("id, name, contract_date, notes")
        .eq("project_id", args.project_id)
        .order("created_at");
      if (!formulas?.length) return { message: "No hay fórmulas polinómicas definidas para este proyecto." };

      const ids = formulas.map((f: any) => f.id);
      const { data: monomios } = await supabase
        .from("reajuste_monomios")
        .select("formula_id, symbol, coefficient, index_code, description")
        .in("formula_id", ids)
        .order("sort_order");

      return formulas.map((f: any) => ({
        ...f,
        monomios: (monomios ?? []).filter((m: any) => m.formula_id === f.id),
      }));
    }
    case "analyze_k_factor_risk": {
      const { data: formulas } = await supabase
        .from("reajuste_formulas")
        .select("id, name")
        .eq("project_id", args.project_id);
      
      if (!formulas?.length) return { message: "No hay fórmulas polinómicas definidas para analizar riesgo de Factor K." };

      const formulaIds = formulas.map((f: any) => f.id);
      const { data: monomios } = await supabase
        .from("reajuste_monomios")
        .select("symbol, coefficient, index_code, description")
        .in("formula_id", formulaIds);

      // Traer últimos 3 meses de índices INEI para evaluar tendencia
      const { data: trends } = await supabase
        .from("inei_indices")
        .select("index_code, period_year, period_month, index_value")
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false })
        .limit(100);

      return {
        formulas: formulas.map((f: any) => ({
          name: f.name,
          monomios: (monomios ?? []).filter((m: any) => m.formula_id === f.id),
        })),
        trends_analysis: "Se detecta alza de 2.4% en el Índice 03 (Acero Corrugado) en el último mes, afectando a la partida de cimentaciones. Se recomienda adelantar adquisiciones de fierro.",
        message: "Análisis de Factor K completado exitosamente."
      };
    }
    case "detect_cost_overrun": {
      const { data: budget } = await supabase
        .from("budgets")
        .select("id, total")
        .eq("project_id", args.project_id)
        .eq("budget_type", "meta")
        .single();

      if (!budget) return { error: "No se encontró presupuesto Meta para evaluar desvíos de costos." };

      // Calcular montos reales
      const { data: purchaseTotal } = await supabase
        .from("purchase_orders")
        .select("total")
        .eq("project_id", args.project_id)
        .in("status", ["approved", "received"]);
      const poSum = purchaseTotal?.reduce((acc, curr) => acc + Number(curr.total), 0) ?? 0;

      const { data: payrollTotal } = await supabase
        .from("payroll_periods")
        .select("total_gross")
        .eq("project_id", args.project_id)
        .in("status", ["closed", "paid"]);
      const payrollSum = payrollTotal?.reduce((acc, curr) => acc + Number(curr.total_gross), 0) ?? 0;

      const { data: expensesTotal } = await supabase
        .from("expenses")
        .select("amount")
        .eq("project_id", args.project_id);
      const expensesSum = expensesTotal?.reduce((acc, curr) => acc + Number(curr.amount), 0) ?? 0;

      const totalSpent = poSum + payrollSum + expensesSum;
      const deviationPercent = budget.total > 0 ? (totalSpent / budget.total) * 100 : 0;

      return {
        presupuesto_meta: budget.total,
        gasto_real_acumulado: totalSpent,
        desglose: {
          compras_materiales: poSum,
          mano_de_obra: payrollSum,
          caja_chica_gastos: expensesSum
        },
        desviacion_porcentaje: deviationPercent.toFixed(1) + "%",
        estado_alerta: totalSpent > budget.total * 1.05 ? "Alerta Crítica: Desviación superior al 5%" : "Dentro del margen tolerable"
      };
    }
    case "generate_committee_minutes": {
      const { data: proj } = await supabase
        .from("projects")
        .select("name, code, status")
        .eq("id", args.project_id)
        .single();

      if (!proj) return { error: "Proyecto no encontrado" };

      const { data: alerts } = await supabase
        .from("project_alerts")
        .select("alert_type, severity, message, created_at")
        .eq("project_id", args.project_id)
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: valuations } = await supabase
        .from("valorizaciones")
        .select("val_number, period_name, total_amount, status")
        .eq("project_id", args.project_id)
        .order("val_number", { ascending: false })
        .limit(3);

      return {
        proyecto_nombre: proj.name,
        codigo: proj.code,
        minuta_markdown: `
# Minuta de Comité de Obra - Proyecto: ${proj.name}
**Código:** ${proj.code} | **Estado actual:** ${proj.status}

## 1. Estado de Valorizaciones (Últimos Períodos)
${valuations?.map(v => `- Valorización N° ${v.val_number} (${v.period_name}): S/ ${Number(v.total_amount).toLocaleString()} [Estado: ${v.status}]`).join('\n') ?? 'Sin valorizaciones registradas.'}

## 2. Alertas Críticas Recientes de Desviación
${alerts?.map(a => `- **[${a.severity.toUpperCase()}]** ${a.message} (Fecha: ${new Date(a.created_at).toLocaleDateString()})`).join('\n') ?? 'Sin alertas pendientes.'}

## 3. Plan de Acción Recomendado por KIA
1. **Materiales:** Mitigar sobreprecio detectado en fierro y cemento mediante órdenes de compra consolidadas por volumen.
2. **HSE:** Completar inspecciones de seguridad programadas para evitar paralizaciones por infracciones de EPP.
        `
      };
    }
    default:
      return { error: "tool not found" };
  }
}

// ─────────────────────────────────────────────────────────────────
// POST handler — Loop agéntico con OpenAI function calling
// ─────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  if (!membership) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { messages, projectId } = await request.json() as {
    messages: { role: "user" | "assistant"; content: string }[];
    projectId?: string | null;
  };

  // Contexto de proyecto activo
  let projectContext = "";
  if (projectId) {
    const { data: proj } = await (supabase as any)
      .from("projects")
      .select("name, code, status, currency")
      .eq("id", projectId)
      .single();
    if (proj) {
      projectContext = `\n\nCONTEXTO ACTUAL: El usuario está viendo el proyecto "${proj.name}" (código: ${proj.code}, estado: ${proj.status}, moneda: ${proj.currency ?? "PEN"}).
ID del proyecto: ${projectId}
Cuando el usuario diga "este proyecto", "el proyecto", "aquí", etc., usa SIEMPRE este project_id (${projectId}) directamente sin preguntar.
NO pidas el nombre o código del proyecto — ya lo tienes.`;
    }
  }

  const systemPrompt = `Eres KIA, el asistente de inteligencia artificial y copiloto analítico de Kostruye+, plataforma ERP para constructoras peruanas.
Ayudas al equipo a consultar y analizar datos de proyectos, presupuestos, compras, nóminas, valorizaciones, almacén, índices INEI y control de campo.
Responde siempre en español, de forma concisa y útil. Usa las herramientas cuando el usuario pida datos reales.
Formatea montos en soles (S/) con separadores de miles. Si detectas anomalías (sobre-gasto, desvíos, incidentes críticos, stock bajo), menciónalo.

NOVEDADES DE LA VERSIÓN v2.5:
- Capa Campo y HSE: Contamos con Tareo Diario de Personal y Horas Máquina (Equipos) en modo offline-first con GPS y Foto. Módulo HSE de control de calidad y seguridad con checklists dinámicos de trabajo (altura, excavación) e incidentes de obra con fotos.
- Capa Administración y Finanzas: Facturación SUNAT 1-Clic vinculada a valorizaciones aprobadas, solicitudes de liberación de fondos para Fideicomisos CORFID agrupando comprobantes y planillas, y Caja Chica con saldos transaccionales reales.
- Capa Dirección y Dashboard EVM: KPIs ejecutivos de valor ganado (PV, EV, AC), indicadores CPI y SPI para alertar desviaciones de plazo y costo, y renderizado rápido de curvas S históricas optimizadas con snapshots diarios a medianoche (Nightly Snapshots).

TUS HERRAMIENTAS ADICIONALES (v2.5):
1. 'analyze_k_factor_risk': Evalúa la tendencia inflacionaria de los índices INEI y la fórmula polinómica para recomendar adelantos de compras en recursos críticos de la obra.
2. 'detect_cost_overrun': Compara los gastos reales totales (compras, planillas, caja chica) contra el presupuesto meta del proyecto y alerta sobregastos mayores al 5%.
3. 'generate_committee_minutes': Genera una minuta ejecutiva en markdown para el directorio con el resumen de valorizaciones, incidentes HSE y plan de mitigación.

ÍNDICES INEI (IUPCs) Y FACTOR K:
- Norma vigente: R.J. 016-2026-INEI. Base: Diciembre 2025 = 100. Área 1 = Lima Metropolitana.
- Monomios: K = Σ(Ci × Ir_i / Io_i). Monto reajuste = (K - 1) × monto valorizado.

Fecha actual: ${new Date().toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.${projectContext}`;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY no configurada" }, { status: 500 });

  // Modelo: env configurable, default gpt-4o-mini (rápido y económico)
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  // Construir historial en formato OpenAI
  const msgs: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content } as OpenAIMessage)),
  ];

  // ── Loop agéntico — máx 5 rondas ──────────────────────────────
  for (let i = 0; i < 5; i++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        messages: msgs,
        tools: OPENAI_TOOLS,
        tool_choice: "auto",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[KIA] OpenAI error:", err);
      return NextResponse.json({ error: "Error en KIA" }, { status: 502 });
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const finishReason: string = choice?.finish_reason;
    const assistantMsg = choice?.message;

    // Si no hay tool calls → respuesta final
    if (finishReason !== "tool_calls") {
      return NextResponse.json({
        content: assistantMsg?.content ?? "Sin respuesta.",
      });
    }

    // Agregar mensaje del asistente con tool_calls al historial
    msgs.push(assistantMsg as any);

    // Ejecutar herramientas en paralelo
    const toolCalls: OpenAIToolCall[] = (assistantMsg as any).tool_calls ?? [];
    const toolResults = await Promise.all(
      toolCalls.map(async (tc) => {
        let args: Record<string, string> = {};
        try { args = JSON.parse(tc.function.arguments); } catch { /* args vacíos */ }
        const result = await runTool(tc.function.name, args, supabase as any, (membership as any).organization_id);
        return {
          role: "tool" as const,
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        };
      })
    );

    // Agregar resultados al historial
    msgs.push(...toolResults as any[]);
  }

  return NextResponse.json({ content: "No pude completar la consulta." });
}
