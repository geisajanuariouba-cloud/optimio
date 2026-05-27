import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { ClipboardCheck, Check, X, Eye } from "lucide-react";

type Item = {
  id: string; catalog_id: string | null; supplier_id: string | null; source_page: number | null;
  proposed_name: string | null; proposed_code: string | null; proposed_category: string | null;
  proposed_image_url: string | null; review_status: string; match_status: string; dedup_hash: string | null;
};

export default function ImportReview() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data } = await supabase.from("catalog_review_items").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as Item[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const filtered = items
    .filter(i => filter === "all" ? true : i.review_status === filter)
    .filter(i => !search || (i.proposed_name ?? "").toLowerCase().includes(search.toLowerCase()) || (i.proposed_code ?? "").toLowerCase().includes(search.toLowerCase()));

  const approve = async (i: Item) => {
    if (!user) return;
    const { error: pErr } = await supabase.from("products").insert({
      user_id: user.id,
      name: i.proposed_name ?? "Produto sem nome",
      code: i.proposed_code,
      category: i.proposed_category,
      image_url: i.proposed_image_url,
      sale_price: 0,
      cost: 0,
      source_catalog_id: i.catalog_id,
      dedup_hash: i.dedup_hash,
      review_status: "approved",
      status: "active",
    });
    if (pErr) return toast.error(pErr.message);
    await supabase.from("catalog_review_items").update({ review_status: "approved" }).eq("id", i.id);
    toast.success("Produto criado"); load();
  };

  const reject = async (i: Item) => {
    await supabase.from("catalog_review_items").update({ review_status: "rejected" }).eq("id", i.id);
    load();
  };

  const bulkApprove = async () => {
    const pending = filtered.filter(i => i.review_status === "pending");
    if (pending.length === 0) return;
    if (!confirm(`Aprovar ${pending.length} itens em lote?`)) return;
    for (const i of pending.slice(0, 50)) await approve(i);
    toast.success("Lote aprovado");
  };

  return (
    <div>
      <PageHeader title="Revisão de Importação" description="Aprove os itens extraídos do catálogo antes de virarem produtos." />

      <MetricsRow items={[
        { label: "Aguardando", value: String(items.filter(i => i.review_status === "pending").length), tone: "warning" },
        { label: "Aprovados", value: String(items.filter(i => i.review_status === "approved").length), tone: "success" },
        { label: "Rejeitados", value: String(items.filter(i => i.review_status === "rejected").length), tone: "danger" },
        { label: "Total extraído", value: String(items.length), tone: "primary" },
      ]} />

      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48 bg-primary/10 border-primary/30"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Aguardando</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="rejected">Rejeitados</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Buscar por nome ou código…" value={search} onChange={e => setSearch(e.target.value)} className="flex-1 min-w-[200px]" />
        {filter === "pending" && filtered.length > 0 && (
          <Button onClick={bulkApprove} className="rounded-2xl gap-2"><Check className="h-4 w-4" />Aprovar lote</Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card className="rounded-3xl border-0 shadow-sm">
          <EmptyState icon={ClipboardCheck} title="Nada para revisar" description="Itens extraídos de catálogos aparecerão aqui para revisão." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(i => (
            <Card key={i.id} className="rounded-3xl border-0 shadow-sm overflow-hidden">
              <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                {i.proposed_image_url ? <img src={i.proposed_image_url} alt={i.proposed_name ?? ""} className="w-full h-full object-cover" />
                  : <Eye className="h-10 w-10 text-muted-foreground/50" />}
              </div>
              <div className="p-3 space-y-2">
                <div className="font-medium text-sm line-clamp-2">{i.proposed_name ?? "Sem nome"}</div>
                <div className="text-xs text-muted-foreground">
                  {i.proposed_code && <span>{i.proposed_code} · </span>}
                  {i.proposed_category ?? "Sem categoria"}
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">Pág {i.source_page ?? "?"}</Badge>
                  {i.match_status === "duplicate" && <Badge variant="outline" className="text-[10px] text-amber-600">Possível duplicado</Badge>}
                </div>
                {i.review_status === "pending" && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={() => approve(i)} className="flex-1 rounded-2xl gap-1"><Check className="h-3.5 w-3.5" />Aprovar</Button>
                    <Button size="sm" variant="outline" onClick={() => reject(i)} className="flex-1 rounded-2xl gap-1 text-rose-600"><X className="h-3.5 w-3.5" />Rejeitar</Button>
                  </div>
                )}
                {i.review_status === "approved" && <Badge className="bg-emerald-500/15 text-emerald-600 w-fit">Aprovado</Badge>}
                {i.review_status === "rejected" && <Badge className="bg-rose-500/15 text-rose-600 w-fit">Rejeitado</Badge>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
