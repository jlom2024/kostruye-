"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus, ChevronDown, ChevronRight, Loader2, Trash2,
  Calculator, FolderPlus, FilePlus, Save, X, GripVertical, Download,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ResourceType = "LABOR" | "MATERIAL" | "EQUIPMENT" | "SUBCONTRACT";

interface ApuLine {
  id: string;
  resource_type: ResourceType;
  description: string | null;
  unit: string | null;
  crew_size: number;
  yield_rate: number | null;
  quantity_per_unit: number | null;
  unit_price: number;
  subtotal: number;
  sort_order: number;
  resource_id: string | null;
}

interface BudgetItem {
  id: string;
  budget_id: string;
  chapter_id: string | null;
  item_code: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number;
  apu_lines?: ApuLine[];
}

interface Chapter {
  id: string;
  budget_id: string;
  code: string;
  name: string;
  level: number;
  sort_order: number;
  total: number;
  items: BudgetItem[];
  expanded: boolean;
}

interface Props {
  budgetId: string;
  currency: string;
  onTotalChange?: (total: number) => void;
  /** ¿El usuario puede editar el presupuesto/APU? (permiso presupuesto.edit) */
  canEdit?: boolean;
}

// ── Resource type config ───────────────────────────────────────────────────────
const RESOURCE_LABELS: Record<ResourceType, string> = {
  LABOR:       "Mano de Obra",
  MATERIAL:    "Materiales",
  EQUIPMENT:   "Equipos",
  SUBCONTRACT: "Subcontratos",
};
const RESOURCE_COLORS: Record<ResourceType, string> = {
  LABOR:       "bg-blue-50 text-blue-700",
  MATERIAL:    "bg-amber-50 text-amber-700",
  EQUIPMENT:   "bg-purple-50 text-purple-700",
  SUBCONTRACT: "bg-rose-50 text-rose-700",
};

// ── CSV Export ─────────────────────────────────────────────────────────────────

function escapeCsv(val: string | number | null | undefined): string {
  const s = String(val ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function exportCsv(chapters: Chapter[], currency: string) {
  const sym = currency === "USD" ? "USD" : "PEN";
  const rows: string[] = [
    ["Código", "Descripción", "Unidad", "Metrado", `Precio Unit. (${sym})`, `Total (${sym})`].join(","),
  ];

  for (const chapter of chapters) {
    if (chapter.id !== "__uncategorized__") {
      rows.push([
        escapeCsv(chapter.code),
        escapeCsv(chapter.name.toUpperCase()),
        "", "", "",
        escapeCsv(chapter.total.toFixed(2)),
      ].join(","));
    }
    for (const item of chapter.items) {
      rows.push([
        escapeCsv(item.item_code),
        escapeCsv(item.description),
        escapeCsv(item.unit),
        escapeCsv(item.quantity.toFixed(4)),
        escapeCsv(item.unit_price.toFixed(2)),
        escapeCsv(item.total.toFixed(2)),
      ].join(","));
    }
  }

  const grandTotal = chapters.flatMap(c => c.items).reduce((s, i) => s + Number(i.total), 0);
  rows.push(["", "TOTAL PRESUPUESTO", "", "", "", escapeCsv(grandTotal.toFixed(2))].join(","));

  const bom = "﻿"; // UTF-8 BOM for Excel
  const blob = new Blob([bom + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `presupuesto_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BudgetEditor({ budgetId, currency, onTotalChange, canEdit = true }: Props) {
  const supabase = createClient();

  // Guard de edición: la RLS es la barrera definitiva; esto evita escrituras
  // inútiles y da feedback inmediato a roles sin permiso presupuesto.edit.
  const guardEdit = () => {
    if (!canEdit) {
      toast.error("No tienes permiso para editar el presupuesto");
      return false;
    }
    return true;
  };
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [apuLines, setApuLines] = useState<ApuLine[]>([]);
  const [loadingApu, setLoadingApu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newItemId, setNewItemId] = useState<string | null>(null);
  const editingRef = useRef<{ field: string; id: string } | null>(null);

  // ── Load chapters + items ──────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: chaps }, { data: items }] = await Promise.all([
      supabase
        .from("budget_chapters")
        .select("*")
        .eq("budget_id", budgetId)
        .order("sort_order"),
      supabase
        .from("budget_items")
        .select("*")
        .eq("budget_id", budgetId)
        .order("sort_order"),
    ]);

    const chaptersWithItems: Chapter[] = (chaps ?? []).map((c) => ({
      ...c,
      items: (items ?? []).filter((i) => i.chapter_id === c.id),
      expanded: true,
    }));

    // Items sin capítulo
    const uncategorized = (items ?? []).filter((i) => !i.chapter_id);
    if (uncategorized.length > 0 && chaptersWithItems.length === 0) {
      chaptersWithItems.push({
        id: "__uncategorized__",
        budget_id: budgetId,
        code: "",
        name: "Sin capítulo",
        level: 1,
        sort_order: 999,
        total: 0,
        items: uncategorized,
        expanded: true,
      });
    }

    setChapters(chaptersWithItems);
    const total = (items ?? []).reduce((s, i) => s + Number(i.total ?? 0), 0);
    onTotalChange?.(total);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Load APU lines for selected item ───────────────────────────────────────
  const loadApu = useCallback(async (itemId: string) => {
    setLoadingApu(true);
    const { data } = await supabase
      .from("apu_lines")
      .select("*")
      .eq("budget_item_id", itemId)
      .order("sort_order");
    setApuLines(data ?? []);
    setLoadingApu(false);
  }, [supabase]);

  const selectItem = useCallback((itemId: string) => {
    if (selectedItemId === itemId) {
      setSelectedItemId(null);
      setApuLines([]);
    } else {
      setSelectedItemId(itemId);
      loadApu(itemId);
    }
  }, [selectedItemId, loadApu]);

  // ── Chapter actions ────────────────────────────────────────────────────────
  const addChapter = async () => {
    if (!guardEdit()) return;
    const nextOrder = chapters.length;
    const nextNum   = String(nextOrder + 1).padStart(2, "0");
    const { data, error } = await supabase
      .from("budget_chapters")
      .insert({
        budget_id:  budgetId,
        code:       nextNum,
        name:       `Capítulo ${nextNum}`,
        level:      1,
        sort_order: nextOrder,
        total:      0,
      })
      .select()
      .single();
    if (error) { toast.error("Error al crear capítulo"); return; }
    setChapters((prev) => [...prev, { ...data, items: [], expanded: true }]);
    toast.success("Capítulo creado");
  };

  const updateChapter = async (chapterId: string, field: "code" | "name", value: string) => {
    setChapters((prev) =>
      prev.map((c) => c.id === chapterId ? { ...c, [field]: value } : c)
    );
  };

  const saveChapter = async (chapter: Chapter) => {
    if (!guardEdit()) return;
    if (chapter.id === "__uncategorized__") return;
    await supabase
      .from("budget_chapters")
      .update({ code: chapter.code, name: chapter.name })
      .eq("id", chapter.id);
  };

  const deleteChapter = async (chapterId: string) => {
    if (!guardEdit()) return;
    const chapter = chapters.find((c) => c.id === chapterId);
    if (chapter && chapter.items.length > 0) {
      toast.error("Elimina las partidas del capítulo primero");
      return;
    }
    await supabase.from("budget_chapters").delete().eq("id", chapterId);
    setChapters((prev) => prev.filter((c) => c.id !== chapterId));
    toast.success("Capítulo eliminado");
  };

  // ── Item actions ───────────────────────────────────────────────────────────
  const addItem = async (chapterId: string) => {
    if (!guardEdit()) return;
    const chapter = chapters.find((c) => c.id === chapterId);
    if (!chapter) return;
    const nextOrder = chapter.items.length;
    const nextNum   = `${chapter.code}.${String(nextOrder + 1).padStart(2, "0")}`;

    const { data, error } = await supabase
      .from("budget_items")
      .insert({
        budget_id:   budgetId,
        chapter_id:  chapterId === "__uncategorized__" ? null : chapterId,
        item_code:   nextNum,
        description: "Nueva partida",
        unit:        "GLB",
        quantity:    1,
        unit_price:  0,
        sort_order:  nextOrder,
      })
      .select()
      .single();
    if (error) { toast.error("Error al crear partida"); return; }
    setChapters((prev) =>
      prev.map((c) =>
        c.id === chapterId
          ? { ...c, items: [...c.items, { ...data, apu_lines: [] }] }
          : c
      )
    );
    setNewItemId(data.id);
  };

  const updateItem = (chapterId: string, itemId: string, field: keyof BudgetItem, value: string | number) => {
    setChapters((prev) =>
      prev.map((c) =>
        c.id === chapterId
          ? {
              ...c,
              items: c.items.map((i) => {
                if (i.id !== itemId) return i;
                const updated = { ...i, [field]: value };
                updated.total = Number(updated.quantity) * Number(updated.unit_price);
                return updated;
              }),
            }
          : c
      )
    );
  };

  const saveItem = async (item: BudgetItem) => {
    if (!guardEdit()) return;
    setSaving(true);
    const total = Number(item.quantity) * Number(item.unit_price);
    const { error } = await supabase
      .from("budget_items")
      .update({
        item_code:   item.item_code,
        description: item.description,
        unit:        item.unit,
        quantity:    Number(item.quantity),
        unit_price:  Number(item.unit_price),
        total,
      })
      .eq("id", item.id);
    setSaving(false);
    if (error) toast.error("Error al guardar partida");
    else {
      const grandTotal = chapters.flatMap((c) => c.items).reduce((s, i) => s + Number(i.total ?? 0), 0);
      onTotalChange?.(grandTotal);
    }
  };

  const deleteItem = async (chapterId: string, itemId: string) => {
    if (!guardEdit()) return;
    await supabase.from("budget_items").delete().eq("id", itemId);
    setChapters((prev) =>
      prev.map((c) =>
        c.id === chapterId
          ? { ...c, items: c.items.filter((i) => i.id !== itemId) }
          : c
      )
    );
    if (selectedItemId === itemId) { setSelectedItemId(null); setApuLines([]); }
    toast.success("Partida eliminada");
  };

  // ── APU line actions ────────────────────────────────────────────────────────
  const addApuLine = async (resourceType: ResourceType) => {
    if (!guardEdit()) return;
    if (!selectedItemId) return;
    const { data, error } = await supabase
      .from("apu_lines")
      .insert({
        budget_item_id:    selectedItemId,
        resource_type:     resourceType,
        description:       "Nuevo recurso",
        unit:              "HH",
        crew_size:         1,
        quantity_per_unit: 1,
        unit_price:        0,
        sort_order:        apuLines.filter((l) => l.resource_type === resourceType).length,
      })
      .select()
      .single();
    if (error) { toast.error("Error al crear línea APU"); return; }
    setApuLines((prev) => [...prev, data]);
  };

  const updateApuLine = (lineId: string, field: keyof ApuLine, value: string | number) => {
    setApuLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        const updated: ApuLine = { ...l, [field]: value };
        // Fórmula S10: subtotal = cuadrilla × cantidad/und × precio unitario
        updated.subtotal = Number(updated.crew_size) * Number(updated.quantity_per_unit ?? 0) * Number(updated.unit_price);
        return updated;
      })
    );
  };

  const saveApuLine = async (line: ApuLine) => {
    if (!guardEdit()) return;
    const { error } = await supabase
      .from("apu_lines")
      .update({
        description:       line.description,
        unit:              line.unit,
        crew_size:         Number(line.crew_size),
        quantity_per_unit: Number(line.quantity_per_unit ?? 0),
        unit_price:        Number(line.unit_price),
        subtotal:          Number(line.subtotal ?? 0),
      })
      .eq("id", line.id);
    if (error) { toast.error("Error al guardar recurso"); return; }

    // Recalc item unit_price y total
    const apuTotal = apuLines.reduce((s, l) => s + Number(l.subtotal ?? 0), 0);
    const itemQty  = selectedItem?.quantity ?? 0;
    const itemTotal = itemQty * apuTotal;

    await supabase
      .from("budget_items")
      .update({ unit_price: apuTotal, total: itemTotal })
      .eq("id", selectedItemId!);

    // Update local state
    setChapters((prev) =>
      prev.map((c) => ({
        ...c,
        items: c.items.map((i) => {
          if (i.id !== selectedItemId) return i;
          return { ...i, unit_price: apuTotal, total: itemTotal };
        }),
      }))
    );
    onTotalChange?.(chapters.flatMap((c) => c.items).reduce((s, i) => s + Number(i.total ?? 0), 0));
  };

  const deleteApuLine = async (lineId: string) => {
    if (!guardEdit()) return;
    await supabase.from("apu_lines").delete().eq("id", lineId);
    setApuLines((prev) => prev.filter((l) => l.id !== lineId));
    toast.success("Recurso eliminado");
  };

  // ── Toggle chapter ─────────────────────────────────────────────────────────
  const toggleChapter = (chapterId: string) => {
    setChapters((prev) =>
      prev.map((c) => c.id === chapterId ? { ...c, expanded: !c.expanded } : c)
    );
  };

  // ── Computed values ────────────────────────────────────────────────────────
  const grandTotal = chapters.flatMap((c) => c.items).reduce((s, i) => s + Number(i.total ?? 0), 0);
  const apuTotal   = apuLines.reduce((s, l) => s + Number(l.subtotal ?? 0), 0);
  const selectedItem = chapters.flatMap((c) => c.items).find((i) => i.id === selectedItemId);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Cargando presupuesto...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {canEdit && (
          <>
            <button
              onClick={addChapter}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <FolderPlus className="h-4 w-4" />
              Capítulo
            </button>
            <span className="text-slate-300">|</span>
          </>
        )}
        <button
          onClick={() => exportCsv(chapters, currency)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          title="Exportar a Excel (CSV)"
        >
          <Download className="h-4 w-4" />
          Exportar Excel
        </button>
        {saving && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Guardando...
          </span>
        )}
        <div className="ml-auto text-sm font-semibold text-slate-700">
          Total: <span className="text-blue-700">{formatCurrency(grandTotal, currency as "PEN" | "USD")}</span>
        </div>
      </div>

      {/* ── Budget table ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2rem_6rem_1fr_5rem_7rem_7rem_7rem_2.5rem] gap-0 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <div />
          <div>Código</div>
          <div>Descripción</div>
          <div>Und.</div>
          <div className="text-right">Metrado</div>
          <div className="text-right">P. Unit.</div>
          <div className="text-right">Parcial</div>
          <div />
        </div>

        {/* Rows */}
        {chapters.length === 0 ? (
          <div className="py-16 text-center">
            <Calculator className="h-10 w-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Sin partidas aún</p>
            <p className="text-xs text-slate-300 mt-1">Agrega un capítulo para empezar</p>
          </div>
        ) : (
          chapters.map((chapter) => (
            <ChapterSection
              key={chapter.id}
              chapter={chapter}
              currency={currency}
              selectedItemId={selectedItemId}
              onToggle={() => toggleChapter(chapter.id)}
              onUpdateChapter={(field, value) => updateChapter(chapter.id, field, value)}
              onSaveChapter={() => saveChapter(chapter)}
              onDeleteChapter={() => deleteChapter(chapter.id)}
              onAddItem={() => addItem(chapter.id)}
              onSelectItem={selectItem}
              onUpdateItem={(itemId, field, value) => updateItem(chapter.id, itemId, field, value)}
              onSaveItem={(item) => saveItem(item)}
              onDeleteItem={(itemId) => deleteItem(chapter.id, itemId)}
              newItemId={newItemId}
              onNewItemFocused={() => setNewItemId(null)}
              // APU panel (rendered inside the row)
              apuPanel={
                selectedItemId && chapter.items.some((i) => i.id === selectedItemId) ? (
                  <ApuPanel
                    item={selectedItem!}
                    lines={apuLines}
                    loading={loadingApu}
                    currency={currency}
                    apuTotal={apuTotal}
                    onAddLine={addApuLine}
                    onUpdateLine={updateApuLine}
                    onSaveLine={saveApuLine}
                    onDeleteLine={deleteApuLine}
                    onClose={() => { setSelectedItemId(null); setApuLines([]); }}
                  />
                ) : null
              }
            />
          ))
        )}

        {/* Footer total */}
        {chapters.length > 0 && (
          <div className="grid grid-cols-[2rem_6rem_1fr_5rem_7rem_7rem_7rem_2.5rem] gap-0 border-t-2 border-slate-200 bg-slate-50 px-3 py-2.5">
            <div />
            <div />
            <div className="text-sm font-bold text-slate-700">TOTAL PRESUPUESTO</div>
            <div />
            <div />
            <div />
            <div className="text-right text-sm font-bold text-blue-700">
              {formatCurrency(grandTotal, currency as "PEN" | "USD")}
            </div>
            <div />
          </div>
        )}
      </div>
    </div>
  );
}

// ── ChapterSection ─────────────────────────────────────────────────────────────

function ChapterSection({
  chapter,
  currency,
  selectedItemId,
  onToggle,
  onUpdateChapter,
  onSaveChapter,
  onDeleteChapter,
  onAddItem,
  onSelectItem,
  onUpdateItem,
  onSaveItem,
  onDeleteItem,
  apuPanel,
  newItemId,
  onNewItemFocused,
}: {
  chapter: Chapter;
  currency: string;
  selectedItemId: string | null;
  onToggle: () => void;
  onUpdateChapter: (field: "code" | "name", value: string) => void;
  onSaveChapter: () => void;
  onDeleteChapter: () => void;
  onAddItem: () => void;
  onSelectItem: (id: string) => void;
  onUpdateItem: (itemId: string, field: keyof BudgetItem, value: string | number) => void;
  onSaveItem: (item: BudgetItem) => void;
  onDeleteItem: (itemId: string) => void;
  apuPanel: React.ReactNode;
  newItemId: string | null;
  onNewItemFocused: () => void;
}) {
  const chapterTotal = chapter.items.reduce((s, i) => s + Number(i.total ?? 0), 0);

  return (
    <div>
      {/* Chapter header row */}
      <div className="group grid grid-cols-[2rem_6rem_1fr_5rem_7rem_7rem_7rem_2.5rem] gap-0 border-b border-slate-100 bg-slate-50/70 px-3 py-2 items-center hover:bg-slate-50">
        <button onClick={onToggle} className="text-slate-400 hover:text-slate-700">
          {chapter.expanded
            ? <ChevronDown className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />}
        </button>
        <input
          className="text-xs font-mono font-bold text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none px-0.5 w-full"
          value={chapter.code}
          onChange={(e) => onUpdateChapter("code", e.target.value)}
          onBlur={onSaveChapter}
          placeholder="00"
          readOnly={chapter.id === "__uncategorized__"}
        />
        <input
          className="text-sm font-semibold text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none px-0.5 w-full"
          value={chapter.name}
          onChange={(e) => onUpdateChapter("name", e.target.value)}
          onBlur={onSaveChapter}
          placeholder="Nombre del capítulo"
          readOnly={chapter.id === "__uncategorized__"}
        />
        <div />
        <div />
        <div />
        <div className="text-right text-sm font-semibold text-slate-700">
          {formatCurrency(chapterTotal, currency as "PEN" | "USD")}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
          <button
            onClick={onDeleteChapter}
            className="rounded p-1 text-slate-400 hover:text-red-500 hover:bg-red-50"
            title="Eliminar capítulo"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Items */}
      {chapter.expanded && (
        <>
          {chapter.items.map((item) => (
            <div key={item.id}>
              <ItemRow
                item={item}
                currency={currency}
                isSelected={selectedItemId === item.id}
                autoFocus={newItemId === item.id}
                onSelect={() => onSelectItem(item.id)}
                onUpdate={(field, value) => onUpdateItem(item.id, field, value)}
                onSave={() => onSaveItem(item)}
                onDelete={() => onDeleteItem(item.id)}
                onFocused={onNewItemFocused}
              />
              {selectedItemId === item.id && apuPanel && (
                <div className="border-b border-slate-200">{apuPanel}</div>
              )}
            </div>
          ))}
          {/* Add item row */}
          <div className="border-b border-dashed border-slate-100">
            <button
              onClick={onAddItem}
              className="flex w-full items-center gap-1.5 px-10 py-2 text-xs text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar partida
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── ItemRow ────────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  currency,
  isSelected,
  autoFocus,
  onSelect,
  onUpdate,
  onSave,
  onDelete,
  onFocused,
}: {
  item: BudgetItem;
  currency: string;
  isSelected: boolean;
  autoFocus?: boolean;
  onSelect: () => void;
  onUpdate: (field: keyof BudgetItem, value: string | number) => void;
  onSave: () => void;
  onDelete: () => void;
  onFocused?: () => void;
}) {
  const descRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus && descRef.current) {
      descRef.current.focus();
      descRef.current.select();
      onFocused?.();
    }
  }, [autoFocus]); // eslint-disable-line

  return (
    <div
      className={cn(
        "group grid grid-cols-[2rem_6rem_1fr_5rem_7rem_7rem_7rem_2.5rem] gap-0 border-b border-slate-100 px-3 py-1.5 items-center",
        isSelected ? "bg-blue-50 border-blue-200" : "hover:bg-slate-50"
      )}
    >
      <button onClick={onSelect} className={cn("text-slate-300 hover:text-blue-500", isSelected && "text-blue-500")}>
        <Calculator className="h-3.5 w-3.5" />
      </button>
      <input
        className="text-xs font-mono text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none px-0.5 w-full"
        value={item.item_code}
        onChange={(e) => onUpdate("item_code", e.target.value)}
        onBlur={onSave}
        placeholder="01.01"
      />
      <input
        ref={descRef}
        className="text-sm text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none px-0.5 w-full"
        value={item.description}
        onChange={(e) => onUpdate("description", e.target.value)}
        onBlur={onSave}
        placeholder="Descripción de la partida"
      />
      <input
        className="text-xs text-center text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none px-0.5 w-full"
        value={item.unit}
        onChange={(e) => onUpdate("unit", e.target.value)}
        onBlur={onSave}
        placeholder="m²"
      />
      <input
        className="text-sm text-right text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none px-0.5 w-full"
        value={item.quantity}
        type="number"
        min={0}
        onChange={(e) => onUpdate("quantity", parseFloat(e.target.value) || 0)}
        onBlur={onSave}
      />
      <input
        className="text-sm text-right text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none px-0.5 w-full"
        value={item.unit_price}
        type="number"
        min={0}
        step={0.01}
        onChange={(e) => onUpdate("unit_price", parseFloat(e.target.value) || 0)}
        onBlur={onSave}
        title="Editar desde el panel APU para calcular automáticamente"
      />
      <div className="text-right text-sm font-medium text-slate-700 pr-1">
        {formatCurrency(Number(item.total ?? 0), currency as "PEN" | "USD")}
      </div>
      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100">
        <button
          onClick={onDelete}
          className="rounded p-1 text-slate-300 hover:text-red-500 hover:bg-red-50"
          title="Eliminar partida"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── ApuPanel ───────────────────────────────────────────────────────────────────

function ApuPanel({
  item,
  lines,
  loading,
  currency,
  apuTotal,
  onAddLine,
  onUpdateLine,
  onSaveLine,
  onDeleteLine,
  onClose,
}: {
  item: BudgetItem;
  lines: ApuLine[];
  loading: boolean;
  currency: string;
  apuTotal: number;
  onAddLine: (type: ResourceType) => void;
  onUpdateLine: (id: string, field: keyof ApuLine, value: string | number) => void;
  onSaveLine: (line: ApuLine) => void;
  onDeleteLine: (id: string) => void;
  onClose: () => void;
}) {
  const resourceTypes: ResourceType[] = ["LABOR", "MATERIAL", "EQUIPMENT", "SUBCONTRACT"];

  return (
    <div className="bg-slate-50 border-t border-blue-200 px-6 py-4">
      {/* APU Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs font-mono text-slate-400">{item.item_code}</span>
          <h4 className="text-sm font-semibold text-slate-700">{item.description}</h4>
          <span className="text-xs text-slate-500">Análisis de Precios Unitarios · Und: {item.unit}</span>
        </div>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200">
          <X className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando APU...
        </div>
      ) : (
        <>
          {/* APU Table */}
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden mb-3">
            <div className="grid grid-cols-[6rem_1fr_4rem_4rem_6rem_6rem_6rem_2rem] gap-0 border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <div>Tipo</div>
              <div>Descripción</div>
              <div className="text-center">Und.</div>
              <div className="text-right">Cuad.</div>
              <div className="text-right">Cant./Und.</div>
              <div className="text-right">P. Unit.</div>
              <div className="text-right">Subtotal</div>
              <div />
            </div>

            {resourceTypes.map((type) => {
              const typeLines = lines.filter((l) => l.resource_type === type);
              return (
                <div key={type}>
                  {/* Resource type header */}
                  <div className={cn("px-3 py-1 text-xs font-semibold border-b border-slate-100", RESOURCE_COLORS[type])}>
                    {RESOURCE_LABELS[type]}
                  </div>
                  {typeLines.map((line) => (
                    <ApuLineRow
                      key={line.id}
                      line={line}
                      currency={currency}
                      onUpdate={(field, value) => onUpdateLine(line.id, field, value)}
                      onSave={() => onSaveLine(line)}
                      onDelete={() => onDeleteLine(line.id)}
                    />
                  ))}
                  <button
                    onClick={() => onAddLine(type)}
                    className="flex w-full items-center gap-1 px-4 py-1 text-xs text-slate-400 hover:text-blue-600 hover:bg-blue-50 border-b border-slate-100 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Agregar {RESOURCE_LABELS[type].toLowerCase()}
                  </button>
                </div>
              );
            })}

            {/* APU Total */}
            <div className="grid grid-cols-[6rem_1fr_4rem_4rem_6rem_6rem_6rem_2rem] gap-0 border-t-2 border-slate-200 bg-slate-50 px-3 py-2 items-center">
              <div />
              <div className="text-xs font-bold text-slate-700">COSTO DIRECTO UNITARIO</div>
              <div />
              <div />
              <div />
              <div />
              <div className="text-right text-sm font-bold text-blue-700">
                {formatCurrency(apuTotal, currency as "PEN" | "USD")}
              </div>
              <div />
            </div>
          </div>

          {lines.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">
              Agrega recursos para calcular el costo unitario de la partida
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── ApuLineRow ─────────────────────────────────────────────────────────────────

function ApuLineRow({
  line,
  currency,
  onUpdate,
  onSave,
  onDelete,
}: {
  line: ApuLine;
  currency: string;
  onUpdate: (field: keyof ApuLine, value: string | number) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group grid grid-cols-[6rem_1fr_4rem_4rem_6rem_6rem_6rem_2rem] gap-0 border-b border-slate-100 px-3 py-1 items-center hover:bg-slate-50">
      <div className="text-xs text-slate-400">{RESOURCE_LABELS[line.resource_type]?.split(" ")[0]}</div>
      <input
        className="text-xs text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none px-0.5 w-full"
        value={line.description ?? ""}
        onChange={(e) => onUpdate("description", e.target.value)}
        onBlur={onSave}
        placeholder="Descripción"
      />
      <input
        className="text-xs text-center text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none px-0.5 w-full"
        value={line.unit ?? ""}
        onChange={(e) => onUpdate("unit", e.target.value)}
        onBlur={onSave}
        placeholder="HH"
      />
      <input
        className="text-xs text-right text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none px-0.5 w-full"
        value={line.crew_size}
        type="number"
        min={0}
        step={0.01}
        onChange={(e) => onUpdate("crew_size", parseFloat(e.target.value) || 0)}
        onBlur={onSave}
        title="Cuadrilla"
      />
      <input
        className="text-xs text-right text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none px-0.5 w-full"
        value={line.quantity_per_unit ?? 0}
        type="number"
        min={0}
        step={0.0001}
        onChange={(e) => onUpdate("quantity_per_unit", parseFloat(e.target.value) || 0)}
        onBlur={onSave}
        title="Cantidad por unidad de partida"
      />
      <input
        className="text-xs text-right text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none px-0.5 w-full"
        value={line.unit_price}
        type="number"
        min={0}
        step={0.01}
        onChange={(e) => onUpdate("unit_price", parseFloat(e.target.value) || 0)}
        onBlur={onSave}
      />
      <div className="text-right text-xs font-medium text-slate-700 pr-1">
        {formatCurrency(Number(line.subtotal ?? 0), currency as "PEN" | "USD")}
      </div>
      <button
        onClick={onDelete}
        className="rounded p-0.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
