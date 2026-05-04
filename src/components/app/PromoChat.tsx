import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles, Send } from "lucide-react";

type Msg = { role: "user" | "system"; text: string; affected?: number };

// Parse simple commands like:
//  "aumentar 10% nos serviços"
//  "diminuir 15% nos produtos categoria cabelo"
//  "promoção 20% off em produtos"
const parse = (cmd: string) => {
  const lower = cmd.toLowerCase();
  const pct = parseFloat(lower.match(/(\d+(?:[.,]\d+)?)\s*%/)?.[1]?.replace(",", ".") ?? "");
  if (!pct) return null;
  const direction = /(diminu|reduz|off|desconto|promo)/.test(lower) ? -1 : 1;
  const target = /servi[cç]/.test(lower) ? "services" : /produto/.test(lower) ? "products" : null;
  if (!target) return null;
  const factor = 1 + (direction * pct) / 100;
  const catMatch = lower.match(/categoria\s+([\wáéíóúãõç]+)/);
  return { target, factor, pct, direction, category: catMatch?.[1] };
};

export default function PromoChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([
    { role: "system", text: "Olá! Posso alterar preços em massa. Ex.: \"aumentar 10% nos serviços\", \"promoção 20% off em produtos categoria cabelo\"." },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const loadHist = async () => {
    if (!user) return;
    const { data } = await supabase.from("promo_commands").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
    setHistory(data ?? []);
  };
  useEffect(() => { loadHist(); }, [user]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || !user) return;
    const cmd = input; setInput("");
    setMessages(m => [...m, { role: "user", text: cmd }]);
    const parsed = parse(cmd);
    if (!parsed) {
      setMessages(m => [...m, { role: "system", text: "Não entendi. Tente: \"aumentar 10% nos serviços\"." }]);
      return;
    }
    const table = parsed.target;
    const priceField = table === "services" ? "starting_price" : "sale_price";
    let q = supabase.from(table as any).select(`id, ${priceField}, category`).eq("user_id", user.id).is("deleted_at", null);
    if (parsed.category) q = q.ilike("category", `%${parsed.category}%`);
    const { data, error } = await q;
    if (error) return toast.error(error.message);
    const items = (data ?? []) as any[];
    if (items.length === 0) {
      setMessages(m => [...m, { role: "system", text: "Nenhum item encontrado para esse filtro." }]);
      return;
    }
    // Update each
    let count = 0;
    for (const it of items) {
      const newPrice = +(((it as any)[priceField] || 0) * parsed.factor).toFixed(2);
      const { error: upErr } = await supabase.from(table as any).update({ [priceField]: newPrice }).eq("id", it.id);
      if (!upErr) count++;
    }
    await supabase.from("promo_commands").insert({ user_id: user.id, command: cmd, affected_count: count, result: parsed as any });
    setMessages(m => [...m, { role: "system", text: `${parsed.direction > 0 ? "Aumento" : "Redução"} de ${parsed.pct}% aplicado em ${count} ${parsed.target === "services" ? "serviço(s)" : "produto(s)"}${parsed.category ? ` (categoria: ${parsed.category})` : ""}.`, affected: count }]);
    toast.success(`${count} item(ns) atualizados`);
    loadHist();
  };

  return (
    <Card className="rounded-3xl border-0 shadow-sm overflow-hidden flex flex-col h-[500px]">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Chat de Promoções</h3>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${m.role === "user" ? "bg-gradient-brand text-white" : "bg-secondary/60"}`}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="p-3 border-t border-border flex gap-2">
        <Input placeholder="Ex.: aumentar 10% nos serviços" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
        <Button onClick={send} className="bg-gradient-brand text-white border-0"><Send className="h-4 w-4" /></Button>
      </div>
    </Card>
  );
}
