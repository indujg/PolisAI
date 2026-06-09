"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Loader2, MessageSquare, Send, Sparkles, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiPost } from "@/lib/api";
import { useSim } from "@/lib/sim-context";
import { cn } from "@/lib/utils";

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

type QuickAction = {
  label: string;
  prompt: string;
  endpoint: "explain" | "recommend" | "news";
};

const quickActions: QuickAction[] = [
  { label: "What's happening?", prompt: "Explain the current simulation state.", endpoint: "explain" },
  { label: "Recommend next move", prompt: "What policies should I prioritize?", endpoint: "recommend" },
  { label: "Generate news", prompt: "Write a news article about the current state.", endpoint: "news" },
];

let msgId = 1;

export function AiChat() {
  const { simId } = useSim();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: msgId++, role: "assistant", text: "Hi! I'm your PolisAI assistant. Ask me to explain what's happening in the simulation, recommend policies, or generate a news brief." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string, endpoint: QuickAction["endpoint"] = "explain") {
    if (!text.trim() || !simId || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { id: msgId++, role: "user", text }]);
    setLoading(true);

    try {
      let reply = "";
      if (endpoint === "explain") {
        const res = await apiPost<{ explanation?: string; text?: string; content?: string }>(
          `/api/v1/ai/simulations/${simId}/explain`
        );
        reply = res.explanation ?? res.text ?? res.content ?? JSON.stringify(res);
      } else if (endpoint === "recommend") {
        const res = await apiPost<{ recommendations?: unknown[]; text?: string; content?: string }>(
          `/api/v1/ai/simulations/${simId}/recommend`
        );
        if (Array.isArray(res.recommendations)) {
          reply = res.recommendations
            .map((r, i) => `${i + 1}. ${typeof r === "string" ? r : JSON.stringify(r)}`)
            .join("\n");
        } else {
          reply = res.text ?? res.content ?? JSON.stringify(res);
        }
      } else {
        const res = await apiPost<{ headline?: string; body?: string; text?: string }>(
          `/api/v1/ai/simulations/${simId}/news`
        );
        reply = res.headline ? `**${res.headline}**\n\n${res.body ?? ""}` : (res.text ?? JSON.stringify(res));
      }
      setMessages((prev) => [...prev, { id: msgId++, role: "assistant", text: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: msgId++, role: "assistant", text: err instanceof Error ? err.message : "Something went wrong. Check that your simulation is running." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input, "explain");
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open AI assistant"
        className="fixed bottom-5 right-5 z-50 grid size-13 place-items-center rounded-full bg-city-graphite text-white shadow-polis-lg transition-all hover:scale-105 active:scale-95"
        style={{ width: 52, height: 52 }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="size-5" />
            </motion.span>
          ) : (
            <motion.span key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Bot className="size-5" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-[70px] right-5 z-50 flex h-[520px] w-[360px] flex-col overflow-hidden rounded-2xl border border-white/75 bg-white/[0.92] shadow-polis-lg backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
              <div className="grid size-8 place-items-center rounded-lg bg-city-graphite text-white">
                <Sparkles className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-bold text-foreground">PolisAI Assistant</p>
                <p className="text-caption text-muted-foreground">Powered by simulation AI</p>
              </div>
              {!simId && (
                <span className="text-caption text-city-coral">No sim selected</span>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-body-sm whitespace-pre-wrap",
                      msg.role === "user"
                        ? "bg-city-civic text-white rounded-br-sm"
                        : "bg-city-mist text-foreground rounded-bl-sm border border-border/60"
                    )}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-border/60 bg-city-mist px-3 py-2">
                    <Loader2 className="size-3.5 animate-spin text-city-civic" />
                    <span className="text-caption text-muted-foreground">Thinking…</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick actions */}
            {messages.length <= 1 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    disabled={loading || !simId}
                    onClick={() => send(action.prompt, action.endpoint)}
                    className="rounded-full border border-border/70 bg-white/[0.76] px-2.5 py-1 text-caption font-semibold text-foreground transition-all hover:bg-white hover:shadow-polis-xs disabled:opacity-40"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="border-t border-border/70 p-3 flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={simId ? "Ask about the simulation…" : "Select a simulation first"}
                disabled={loading || !simId}
                className="h-9 flex-1 bg-white/[0.76] text-body-sm"
              />
              <Button type="submit" variant="signal" size="icon-sm" disabled={loading || !input.trim() || !simId}>
                <Send className="size-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
