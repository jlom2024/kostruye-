import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PrintTrigger, PrintButton } from "./print-trigger";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; valId: string }>;
}): Promise<Metadata> {
  const { valId } = await params;
  const supabase = await createClient();
  const { data: val } = await supabase
    .from("valorizaciones")
    .select("val_number, period_name")
    .eq("id", valId)
    .single();
  return { title: val ? `Valorización N° ${val.val_number} — ${val.period_name}` : "Valorización" };
}

export default async function ValorizacionPrintPage({
  params,
}: {
  params: Promise<{ id: string; valId: string }>;
}) {
  const { id, valId } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: val }, { data: budget }] = await Promise.all([
    supabase.from("projects").select("name, code, client, currency").eq("id", id).single(),
    supabase.from("valorizaciones").select("*").eq("id", valId).single(),
    supabase.from("budgets").select("id, total").eq("project_id", id).eq("budget_type", "venta").single(),
  ]);

  if (!project || !val) notFound();

  const [{ data: viRows }, { data: chapters }, { data: items }] = await Promise.all([
    supabase
      .from("valorizacion_items")
      .select("budget_item_id, prev_percent, period_percent, cumul_percent")
      .eq("valorizacion_id", valId),
    budget?.id
      ? supabase.from("budget_chapters").select("id, code, name, total").eq("budget_id", budget.id).order("sort_order")
      : Promise.resolve({ data: [] }),
    budget?.id
      ? supabase.from("budget_items").select("id, chapter_id, item_code, description, unit, quantity, unit_price, total").eq("budget_id", budget.id).order("sort_order")
      : Promise.resolve({ data: [] }),
  ]);

  const viMap     = new Map((viRows ?? []).map(r => [r.budget_item_id, r]));
  const sym       = project.currency === "USD" ? "$" : "S/";
  const money     = (n: number) =>
    `${sym} ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate   = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });
  const ventaTotal = Number(budget?.total ?? 0);

  return (
    <>
      {/* Print styles — oculta el sidebar y topbar al imprimir */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 15mm 12mm; }
          /* Ocultar layout del dashboard */
          body > div > div > *:first-child { display: none !important; }
          body > div > div > main { overflow: visible !important; height: auto !important; }
          body > div > div { display: block !important; height: auto !important; overflow: visible !important; }
          .no-print { display: none !important; }
          .print-page { padding: 0 !important; }
        }
        .print-page * { box-sizing: border-box; }
        .print-page { font-family: Arial, sans-serif; font-size: 10px; color: #1e293b; background: white; max-width: 1100px; margin: 0 auto; padding: 24px; }
        .ph { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 2px solid #1e40af; padding-bottom: 12px; }
        .ph-title { font-size: 16px; font-weight: 700; color: #1e40af; }
        .ph-sub { font-size: 10px; color: #64748b; margin-top: 2px; }
        .badge { display: inline-block; background: #1e40af; color: white; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 4px; margin-bottom: 4px; }
        .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
        .meta-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; }
        .meta-label { font-size: 8px; font-weight: 600; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; }
        .meta-value { font-size: 11px; font-weight: 700; color: #1e293b; margin-top: 1px; }
        .pt { width: 100%; border-collapse: collapse; font-size: 9px; }
        .pt thead tr { background: #1e40af; color: white; }
        .pt thead th { padding: 5px 6px; text-align: left; font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
        .pt thead th.r { text-align: right; }
        .pt tbody tr:nth-child(even) { background: #f8fafc; }
        .pt tbody tr.chap { background: #e2e8f0; }
        .pt tbody tr.chap td { font-weight: 700; font-size: 9px; padding: 4px 6px; }
        .pt tbody td { padding: 3px 6px; border-bottom: 1px solid #f1f5f9; }
        .pt tbody td.r { text-align: right; }
        .totals { margin-top: 12px; display: flex; justify-content: flex-end; }
        .totals table { width: 340px; font-size: 10px; border-collapse: collapse; }
        .totals td { padding: 4px 8px; }
        .totals tr.grand td { font-weight: 700; font-size: 12px; border-top: 2px solid #1e40af; padding-top: 6px; }
        .totals td.r { text-align: right; }
        .print-btn { position: fixed; bottom: 20px; right: 20px; background: #1e40af; color: white; border: none; border-radius: 8px; padding: 10px 20px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,.2); z-index: 9999; }
        .print-btn:hover { background: #1d4ed8; }
      `}</style>

      <PrintTrigger />

      <div className="print-page">

        {/* Header */}
        <div className="ph">
          <div>
            <div className="ph-title">{project.name}</div>
            <div className="ph-sub">{project.code}{project.client ? ` · ${project.client}` : ""}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="badge">VALORIZACIÓN N° {String(val.val_number).padStart(2, "0")}</div>
            <div style={{ fontSize: "10px", color: "#64748b" }}>{val.period_name}</div>
          </div>
        </div>

        {/* Meta */}
        <div className="meta">
          <div className="meta-item">
            <div className="meta-label">Período</div>
            <div className="meta-value">
              {val.start_date ? fmtDate(val.start_date) : "—"} → {val.end_date ? fmtDate(val.end_date) : "—"}
            </div>
          </div>
          <div className="meta-item">
            <div className="meta-label">Contrato (Venta)</div>
            <div className="meta-value">{money(ventaTotal)}</div>
          </div>
          <div className="meta-item">
            <div className="meta-label">Monto período</div>
            <div className="meta-value">{money(Number(val.total_amount))}</div>
          </div>
          <div className="meta-item">
            <div className="meta-label">Estado</div>
            <div className="meta-value" style={{ textTransform: "capitalize" }}>{val.status}</div>
          </div>
        </div>

        {/* Table */}
        <table className="pt">
          <thead>
            <tr>
              <th style={{ width: "6%" }}>Código</th>
              <th style={{ width: "30%" }}>Descripción</th>
              <th style={{ width: "4%" }}>Und</th>
              <th className="r" style={{ width: "6%" }}>Metrado</th>
              <th className="r" style={{ width: "8%" }}>P.U.</th>
              <th className="r" style={{ width: "9%" }}>Presup.</th>
              <th className="r" style={{ width: "7%" }}>% Ant.</th>
              <th className="r" style={{ width: "7%" }}>% Per.</th>
              <th className="r" style={{ width: "7%" }}>% Acum.</th>
              <th className="r" style={{ width: "8%" }}>Mont. Per.</th>
              <th className="r" style={{ width: "8%" }}>Mont. Acum.</th>
            </tr>
          </thead>
          <tbody>
            {(chapters ?? []).map(chapter => {
              const chapterItems = (items ?? []).filter(i => i.chapter_id === chapter.id);
              if (chapterItems.length === 0) return null;
              const periodTotal = chapterItems.reduce((s, item) => {
                const vi = viMap.get(item.id);
                return s + (vi ? (vi.period_percent / 100) * Number(item.total) : 0);
              }, 0);
              const cumulTotal = chapterItems.reduce((s, item) => {
                const vi = viMap.get(item.id);
                return s + (vi ? (vi.cumul_percent / 100) * Number(item.total) : 0);
              }, 0);
              return (
                <>
                  <tr key={chapter.id} className="chap">
                    <td>{chapter.code}</td>
                    <td colSpan={4}>{chapter.name.toUpperCase()}</td>
                    <td className="r">{money(Number(chapter.total))}</td>
                    <td /><td /><td />
                    <td className="r">{money(periodTotal)}</td>
                    <td className="r">{money(cumulTotal)}</td>
                  </tr>
                  {chapterItems.map(item => {
                    const vi = viMap.get(item.id);
                    const periodAmt = vi ? (vi.period_percent / 100) * Number(item.total) : 0;
                    const cumulAmt  = vi ? (vi.cumul_percent  / 100) * Number(item.total) : 0;
                    return (
                      <tr key={item.id}>
                        <td style={{ paddingLeft: "14px" }}>{item.item_code}</td>
                        <td>{item.description}</td>
                        <td>{item.unit}</td>
                        <td className="r">{Number(item.quantity).toFixed(2)}</td>
                        <td className="r">{money(Number(item.unit_price))}</td>
                        <td className="r">{money(Number(item.total))}</td>
                        <td className="r">{vi ? vi.prev_percent.toFixed(2) : "0.00"}%</td>
                        <td className="r">{vi ? vi.period_percent.toFixed(2) : "0.00"}%</td>
                        <td className="r">{vi ? vi.cumul_percent.toFixed(2) : "0.00"}%</td>
                        <td className="r">{money(periodAmt)}</td>
                        <td className="r">{money(cumulAmt)}</td>
                      </tr>
                    );
                  })}
                </>
              );
            })}
          </tbody>
        </table>

        {/* Totals */}
        <div className="totals">
          <table>
            <tbody>
              <tr>
                <td>Monto período</td>
                <td className="r">{money(Number(val.total_amount))}</td>
              </tr>
              <tr>
                <td>IGV (18%)</td>
                <td className="r">{money(Number(val.total_amount) * 0.18)}</td>
              </tr>
              <tr className="grand">
                <td>TOTAL CON IGV</td>
                <td className="r">{money(Number(val.total_amount) * 1.18)}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

      <PrintButton />
    </>
  );
}
