"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sparkles, X, Send, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "¿En qué proyectos estamos sobre-presupuesto?",
  "Resume el estado de todos mis proyectos",
  "¿Cuánto llevamos gastado en compras este mes?",
  "¿Qué valorizaciones están pendientes?",
];

export function AiChat() {
  const pathname = usePathname();

  // Extrae projectId del URL cuando estamos en /proyectos/{id}/*
  const projectIdFromUrl = (() => {
    const m = pathname.match(/\/proyectos\/([a-f0-9-]{36})/i);
    return m ? m[1] : null;
  })();

  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "Hola, soy **KIA** — tu asistente de obras. Puedo consultarte datos de proyectos, presupuestos, compras, nóminas y más. ¿En qué te ayudo?",
      }]);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");

    const userMsg: Message = { role: "user", content };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content })),
          projectId: projectIdFromUrl,
        }),
      });
      const data = await res.json() as { content: string };
      setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Ocurrió un error. Inténtalo de nuevo." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all",
          open
            ? "bg-slate-700 hover:bg-slate-600"
            : "bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 hover:shadow-blue-500/25 hover:shadow-xl"
        )}
      >
        {open ? <X className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        {open ? "Cerrar" : "KIA"}
      </button>

      {/* Panel de chat */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 flex h-[560px] w-[400px] flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 rounded-t-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">KIA</p>
              <p className="text-xs text-blue-100">Asistente de obras · o4-mini</p>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto text-white/70 hover:text-white">
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && (
                  <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "rounded-tr-sm bg-blue-600 text-white"
                      : "rounded-tl-sm bg-slate-100 text-slate-800"
                  )}
                >
                  <MdText text={m.content} />
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-slate-100 px-3.5 py-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            {/* Suggestions — only on first message */}
            {messages.length === 1 && !loading && (
              <div className="pt-1 space-y-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-100 p-3">
            <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Pregunta sobre tus proyectos..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
                style={{ maxHeight: 96 }}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-slate-400">Enter para enviar · Shift+Enter nueva línea</p>
          </div>
        </div>
      )}
    </>
  );
}

function MdText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**")
          ? <strong key={i}>{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}
