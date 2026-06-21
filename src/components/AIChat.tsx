import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Bot, Send, X, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

export default function AIChat({ context = "visitor", floating = true, onEscalate, position = "bottom-right", visible = true }: { context?: "visitor" | "app"; floating?: boolean; onEscalate?: () => void; position?: "bottom-right" | "bottom-left" | "top-right" | "top-left"; visible?: boolean }) {
  const [open, setOpen] = useState(!floating);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: context === "visitor" ? "Olá! Sou o assistente do Optimio 👋 Como posso ajudar?" : "Oi! Posso ajudar com qualquer dúvida do app. Se não resolver, clique em 'Chamar humano'." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight }); }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    const next = [...messages, { role: "user" as const, content: input }];
    setMessages(next); setInput(""); setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", { body: { messages: next, context } });
      if (error) throw error;
      setMessages([...next, { role: "assistant", content: data.reply || "Desculpe, não consegui responder." }]);
    } catch (e: any) {
      setMessages([...next, { role: "assistant", content: "Erro: " + e.message }]);
    } finally { setLoading(false); }
  };

  const Body = (
    <Card className="rounded-3xl border-0 shadow-2xl overflow-hidden flex flex-col w-full h-full bg-card">
      <div className="flex items-center justify-between p-4 border-b bg-gradient-brand text-white">
        <div className="flex items-center gap-2"><Bot className="h-5 w-5" /><span className="font-semibold">Suporte Optimio</span></div>
        {floating && <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>}
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{m.content}</div>
          </div>
        ))}
        {loading && <div className="text-xs text-muted-foreground">digitando…</div>}
      </div>
      {onEscalate && (
        <div className="px-3 pb-2"><Button variant="outline" size="sm" className="w-full rounded-2xl" onClick={onEscalate}>Não resolvi — chamar humano</Button></div>
      )}
      <div className="p-3 border-t flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Pergunte algo…" />
        <Button onClick={send} disabled={loading} size="icon" className="bg-gradient-brand text-white border-0"><Send className="h-4 w-4" /></Button>
      </div>
    </Card>
  );

  if (!floating) return Body;
  if (!visible) return null;

  const posCls =
    position === "bottom-left" ? "bottom-6 left-6" :
    position === "top-right"   ? "top-6 right-6" :
    position === "top-left"    ? "top-6 left-6" :
                                 "bottom-6 right-6";

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} className={`fixed ${posCls} h-14 w-14 rounded-full bg-gradient-brand text-white shadow-2xl flex items-center justify-center z-50 hover:scale-110 transition`}>
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
      {open && <div className={`fixed ${posCls} w-[380px] max-w-[calc(100vw-1.5rem)] h-[560px] max-h-[calc(100vh-3rem)] z-50`}>{Body}</div>}
    </>
  );
}
