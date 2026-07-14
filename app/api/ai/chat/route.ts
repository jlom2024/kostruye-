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
  supabase: Awaited<ReturnType<typeof createClient>>,
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

      const ventaBudget = budgets.find(b => b.budget_type === "venta");
      const metaBudget  = budgets.find(b => b.budget_type === "meta");

      const { data: chapters } = ventaBudget
        ? await supabase
            .from("budget_chapters")
            .select("code, name, total")
            .eq("budget_id", ventaBudget.id)
            .order("sort_order")
        : { data: [] };

      return {
        presupuesto_venta: ventaBudget?.total ?? 0,
        presupuesto_meta:  metaBudget?.total  ?? 0,
        capitulos: chapters ?? [],
      };
    }
    case "get_purchase_orders": {
      const { data } = await supabase
        .from("purchase_orders")
        .select("id, po_number, status, total, issue_date, suppliers(name)")
        .eq("project_id", args.project_id)
        .order("issue_date", { ascending: false });
      return (data ?? []).map(p => ({
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
      return (data ?? []).map(o => ({
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

      const ids = formulas.map((f) => f.id);
      const { data: monomios } = await supabase
        .from("reajuste_monomios")
        .select("formula_id, symbol, coefficient, index_code, description")
        .in("formula_id", ids)
        .order("sort_order");

      return formulas.map((f) => ({
        ...f,
        monomios: (monomios ?? []).filter((m) => m.formula_id === f.id),
      }));
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
    const { data: proj } = await supabase
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

  const systemPrompt = `Eres KIA, el asistente de inteligencia artificial de Kostruye+, plataforma ERP para constructoras peruanas.
Ayudas al equipo a consultar y analizar datos de proyectos, presupuestos, compras, nóminas, valorizaciones, almacén e índices INEI.
Responde siempre en español, de forma concisa y útil. Usa las herramientas cuando el usuario pida datos reales.
Formatea montos en soles (S/) con separadores de miles. Si detectas anomalías (sobre-gasto, OC antigua pendiente, stock bajo), menciónalo.

MÓDULOS QUE CONOCES (web):
- Presupuesto/APU: partidas con costos directos e indirectos, roll-up automático. Importación de presupuestos S10 por Excel (.xlsx) o por PDF.
- Compras: órdenes de compra con aprobación por roles
- Servicios: órdenes de servicio (subcontratos, equipos, transporte)
- Almacén: Kardex PPP (precio promedio ponderado), alertas de stock mínimo
- Nóminas/Planillas: períodos con totales bruto/neto
- Valorizaciones: avance de obra por período con Fórmula Polinómica y Factor K
- Control de Costos: desviación entre presupuesto y costo real (Kardex)
- Contabilidad: facturación electrónica SUNAT
- Auditoría: log de cambios multi-tenant

IMPORTACIÓN DE PRESUPUESTOS S10 (novedad):
- El usuario puede cargar su presupuesto desde el botón "Importar PDF (OCR)" en el módulo Presupuesto, o desde un Excel S10 (.xlsx).
- Para PDFs S10 DIGITALES el sistema usa un lector determinístico que extrae TODAS las partidas y cuadra EXACTAMENTE con el COSTO DIRECTO impreso (verificación al céntimo, badge verde "verificado al céntimo").
- Soporta presupuestos enormes (carreteras, 100k+ partidas) cargando por lotes sin perder precisión.
- Para PDFs ESCANEADOS la extracción puede tener errores menores; lo más seguro siempre es el Excel S10. Recomienda esto si preguntan.
- Si la suma no coincide con el COSTO DIRECTO, la importación lo advierte en ámbar para que el usuario revise.

APP MÓVIL KOSTRUYE+ (Expo/React Native):
- Stack: Expo SDK 56, React Native 0.85, Expo Router, TanStack Query v5, misma Supabase
- Fases completadas: Auth, selector org/proyecto, Dashboard KPIs, Almacén (Kardex + ingresos + vales), Compras (lista OC + cambio estado en campo)
- La app móvil conecta a la misma base de datos que el web — los datos son los mismos
- Próximo: EAS Build → APK interno para distribución

ÍNDICES INEI (IUPCs):
- Norma vigente: R.J. 016-2026-INEI. Base: Diciembre 2025 = 100. Área 1 = Lima Metropolitana.
- Índices clave: 02=Acero liso, 03=Acero corrugado, 17=Cemento Portland tipo I, 21=Cemento Portland IP, 39=IPC General, 47=Mano de obra, 48=Maquinaria liviana, 49=Maquinaria pesada.

FÓRMULA POLINÓMICA (Factor K):
- K = Σ(Ci × Ir_i / Io_i). Monto de reajuste = (K − 1) × monto valorizado.

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
    const assistantMsg: OpenAIMessage = choice?.message;

    // Si no hay tool calls → respuesta final
    if (finishReason !== "tool_calls") {
      return NextResponse.json({
        content: assistantMsg?.content ?? "Sin respuesta.",
      });
    }

    // Agregar mensaje del asistente con tool_calls al historial
    msgs.push(assistantMsg);

    // Ejecutar herramientas en paralelo
    const toolCalls: OpenAIToolCall[] = assistantMsg.tool_calls ?? [];
    const toolResults = await Promise.all(
      toolCalls.map(async (tc) => {
        let args: Record<string, string> = {};
        try { args = JSON.parse(tc.function.arguments); } catch { /* args vacíos */ }
        const result = await runTool(tc.function.name, args, supabase, membership.organization_id);
        return {
          role: "tool" as const,
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        };
      })
    );

    // Agregar resultados al historial
    msgs.push(...toolResults);
  }

  return NextResponse.json({ content: "No pude completar la consulta." });
}
