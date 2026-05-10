import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { Plus, Trash2, Pencil, Tag, ArrowUpRight, ArrowDownRight, Boxes } from "lucide-react";

type Cat = { id: string; kind: "income" | "expense" | "product"; name: string };

const ROOT_INCOME = ["Venda", "Serviço"];

export default function Categories() {
  const { user } = useAuth();
  const [cats, setCats] = useState<Cat[]>([]);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({ income: "", expense: "", product: "" });

  const load = async () => {
    const { data } = await supabase.from("categories").select("id,kind,name").order("kind").order("name");
    setCats((data ?? []) as Cat[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const add = async (kind: Cat["kind"]) => {
    const name = drafts[kind].trim();
    if (!user || !name) return;
    const { error } = await supabase.from("categories").insert({ user_id: user.id, kind, name });
    if (error) return toast.error(error.message);
    setDrafts({ ...drafts, [kind]: "" });
    load();
  };

  const rename = async () => {
    if (!editing || !editing.name.trim()) return;
    const old = cats.find(c => c.id === editing.id);
    const { error } = await supabase.from("categories").update({ name: editing.name.trim() }).eq("id", editing.id);
    if (error) return toast.error(error.message);
    if (old && old.kind === "product") {
      await supabase.from("products").update({ category: editing.name.trim() }).eq("category", old.name);
    }
    setEditing(null); load();
  };

  const remove = async (c: Cat) => {
    if (c.kind === "income" && ROOT_INCOME.includes(c.name)) return toast.error(`"${c.name}" é obrigatória.`);
    if (!confirm(`Remover categoria "${c.name}"?`)) return;
    await supabase.from("categories").delete().eq("id", c.id);
    load();
  };

  const ensureRoots = async () => {
    if (!user) return;
    const have = new Set(cats.filter(c => c.kind === "income").map(c => c.name));
    const missing = ROOT_INCOME.filter(n => !have.has(n));
    if (missing.length === 0) return;
    await supabase.from("categories").insert(missing.map(n => ({ user_id: user.id, kind: "income" as const, name: n })));
    load();
  };
  useEffect(() => { if (user && cats.length >= 0) ensureRoots(); }, [user, cats.length]);

  const grouped = (k: Cat["kind"]) => cats.filter(c => c.kind === k);

  const renderList = (k: Cat["kind"], locked: string[] = []) => (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input placeholder="Nova categoria" value={drafts[k]} onChange={(e) => setDrafts({ ...drafts, [k]: e.target.value })} onKeyDown={(e) => e.key === "Enter" && add(k)} className="bg-secondary/50 border-0 h-11" />
        <Button onClick={() => add(k)} className="rounded-2xl h-11"><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
      </div>
      {k === "income" && (
        <div className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3">
          ⚠️ <strong>Venda</strong> e <strong>Serviço</strong> são raízes obrigatórias do sistema. Você pode criar quantas subcategorias quiser, mas essas duas não podem ser apagadas.
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {grouped(k).length === 0 && <span className="text-sm text-muted-foreground">Nenhuma cadastrada.</span>}
        {grouped(k).map(c => {
          const isLocked = locked.includes(c.name);
          return editing?.id === c.id ? (
            <div key={c.id} className="flex items-center gap-1">
              <Input autoFocus value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && rename()} className="h-8 w-40" />
              <Button size="sm" onClick={rename}>OK</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>X</Button>
            </div>
          ) : (
            <Badge key={c.id} variant="outline" className="gap-1.5 pr-1 py-1 px-3 text-sm">
              {isLocked && <span title="Categoria raiz" className="text-amber-500">★</span>}
              {c.name}
              {!isLocked && <button onClick={() => setEditing({ id: c.id, name: c.name })} className="hover:text-primary ml-1"><Pencil className="h-3 w-3" /></button>}
              {!isLocked && <button onClick={() => remove(c)} className="hover:text-rose-500"><Trash2 className="h-3 w-3" /></button>}
            </Badge>
          );
        })}
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Categorias" description="Padronize entradas, saídas e produtos do seu negócio." />
      <MetricsRow items={[
        { label: "Entradas", value: String(grouped("income").length), tone: "primary" },
        { label: "Saídas", value: String(grouped("expense").length), tone: "primary" },
        { label: "Produtos", value: String(grouped("product").length), tone: "primary" },
        { label: "Total", value: String(cats.length), tone: "primary" },
      ]} />

      <Card className="p-4 md:p-6 rounded-3xl border-0 shadow-sm">
        <Tabs defaultValue="product">
          <TabsList className="bg-secondary/40">
            <TabsTrigger value="product"><Boxes className="h-4 w-4 mr-1" />Produtos</TabsTrigger>
            <TabsTrigger value="income"><ArrowUpRight className="h-4 w-4 mr-1" />Entradas</TabsTrigger>
            <TabsTrigger value="expense"><ArrowDownRight className="h-4 w-4 mr-1" />Saídas</TabsTrigger>
          </TabsList>
          <TabsContent value="product" className="mt-4">{renderList("product")}</TabsContent>
          <TabsContent value="income" className="mt-4">{renderList("income", ROOT_INCOME)}</TabsContent>
          <TabsContent value="expense" className="mt-4">{renderList("expense")}</TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
