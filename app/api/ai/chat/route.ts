import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const tools: OpenAI.Chat.ChatCompletionTool[] = [
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
        properties: {
          project_id: { type: "string", description: "UUID del proyecto" },
        },
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
        properties: {
          project_id: { type: "string", description: "UUID del proyecto" },
        },
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
        properties: {
          project_id: { type: "string", description: "UUID del proyecto" },
        },
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
        properties: {
          project_id: { type: "string", description: "UUID del proyecto" },
        },
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
        properties: {
          project_id: { type: "string", description: "UUID del proyecto" },
        },
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
        properties: {
          project_id: { type: "string", description: "UUID del proyecto" },
        },
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
        properties: {
          project_id: { type: "string", description: "UUID del proyecto" },
        },
        required: ["project_id"],
      },
    },
  },
];

async function runTool(name: string, args: Record<string, string>, supabase: Awaited<ReturnType<typeof createClient>>, orgId: string) {
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
      // budget_items no tiene project_id directo — se accede via budget_id
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
      // Campo correcto: po_number (no oc_number), supplier via join
      const { data } = await supabase
        .from("purchase_orders")
        .select("id, po_number, status, total, issue_date, suppliers(name)")
        .eq("project_id", args.project_id)
        .order("issue_date", { ascending: false });
      return (data ?? []).map(p => ({
        po_number:     p.po_number,
        supplier:      (p.suppliers as { name: string } | null)?.name ?? "—",
        total:         p.total,
        status:        p.status,
        issue_date:    p.issue_date,
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
        os_number:    o.os_number,
        type:         o.service_type,
        description:  o.description,
        supplier:     (o.suppliers as { name: string } | null)?.name ?? "—",
        amount:       o.amount,
        status:       o.status,
        issue_date:   o.issue_date,
        completion_date: o.completion_date,
      }));
    }
    case "get_warehouse": {
      // Usar la vista stock_levels que tiene current_stock, total_in, total_out, low_stock
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
    default:
      return { error: "tool not found" };
  }
}

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
    messages: OpenAI.Chat.ChatCompletionMessageParam[];
    projectId?: string | null;
  };

  // Si viene projectId, resolvemos el nombre del proyecto para el contexto
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

  const systemPrompt = `Eres KIA, el asistente de inteligencia artificial de Kostruye+, una plataforma de gestión de obras de construcción.
Ayudas al equipo de la constructora a consultar datos de proyectos, presupuestos, compras, nóminas, valorizaciones y almacén.
Responde siempre en español, de forma concisa y útil.
Cuando el usuario pregunte sobre datos, usa las herramientas disponibles para obtener información actualizada.
Formatea los montos en soles (S/) con separadores de miles.
Si detectas anomalías (sobre-gasto, OC pendiente antigua, stock bajo), menciónalas proactivamente.
Fecha actual: ${new Date().toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.${projectContext}`;

  const msgs: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  let response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: msgs,
    tools,
    tool_choice: "auto",
  });

  // Agentic loop — max 5 rounds
  for (let i = 0; i < 5; i++) {
    const choice = response.choices[0];
    if (choice.finish_reason !== "tool_calls") break;

    const toolCalls = choice.message.tool_calls ?? [];
    msgs.push(choice.message);

    const toolResults = await Promise.all(
      toolCalls.map(async (tc) => {
        const result = await runTool(
          tc.function.name,
          JSON.parse(tc.function.arguments) as Record<string, string>,
          supabase,
          membership.organization_id
        );
        return {
          role: "tool" as const,
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        };
      })
    );

    msgs.push(...toolResults);

    response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: msgs,
      tools,
      tool_choice: "auto",
    });
  }

  const content = response.choices[0]?.message?.content ?? "No pude generar una respuesta.";
  return NextResponse.json({ content });
}
