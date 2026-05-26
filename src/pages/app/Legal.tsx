import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { ScrollText, Sparkles, Eye, CheckCircle2 } from "lucide-react";
import DOMPurify from "dompurify";

const TYPES = [
  { key: "terms", label: "Termos de Uso" },
  { key: "privacy", label: "Política de Privacidade" },
  { key: "refund", label: "Reembolso" },
  { key: "cookies", label: "Cookies" },
  { key: "shipping", label: "Envio" },
];

type Page = { id: string; page_type: string; title: string; html_content: string; published: boolean; version: number; updated_at: string };

export default function Legal() {
  const { user } = useAuth();
  const { profile } = useTenant();
  const [pages, setPages] = useState<Page[]>([]);
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [preview, setPreview] = useState<Page | null>(null);

  const load = async () => {
    const { data } = await supabase.from("legal_pages").select("*").order("updated_at", { ascending: false });
    setPages((data ?? []) as Page[]);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const generate = async (page_type: string) => {
    if (!user || !profile) return;
    setLoadingType(page_type);
    try {
      const { data, error } = await supabase.functions.invoke("generate-legal", {
        body: { page_type, company_name: profile.company_name, niche: profile.niche },
      });
      if (error) throw error;
      const existing = pages.find(p => p.page_type === page_type);
      if (existing) {
        await supabase.from("legal_pages").update({
          title: data.title, html_content: data.html, version: existing.version + 1, generated_by: "google/gemini-2.5-flash",
        }).eq("id", existing.id);
      } else {
        await supabase.from("legal_pages").insert({
          user_id: user.id, page_type, title: data.title, html_content: data.html, generated_by: "google/gemini-2.5-flash",
        });
      }
      toast.success("Página gerada por IA");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao gerar");
    } finally { setLoadingType(null); }
  };

  const togglePublish = async (p: Page) => {
    await supabase.from("legal_pages").update({ published: !p.published }).eq("id", p.id);
    toast.success(p.published ? "Despublicado" : "Publicado no site");
    load();
  };

  return (
    <div>
      <PageHeader title="Páginas Legais (IA)" description="Gere Termos, Privacidade e demais políticas conformes (LGPD/GDPR) em 1 clique." />
      <div className="grid md:grid-cols-2 gap-4">
        {TYPES.map(t => {
          const existing = pages.find(p => p.page_type === t.key);
          const loading = loadingType === t.key;
          return (
            <Card key={t.key} className="rounded-3xl border-0 shadow-sm p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center"><ScrollText className="h-6 w-6 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold">{t.label}</h3>
                    {existing && <Badge variant="outline">v{existing.version}</Badge>}
                    {existing?.published && <Badge className="bg-emerald-500/10 text-emerald-600 gap-1"><CheckCircle2 className="h-3 w-3" /> Publicado</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {existing ? `Atualizado ${new Date(existing.updated_at).toLocaleDateString("pt-BR")}` : "Ainda não gerado."}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={() => generate(t.key)} disabled={loading} className="rounded-2xl">
                      <Sparkles className="h-4 w-4 mr-2" />{loading ? "Gerando…" : existing ? "Regenerar" : "Gerar com IA"}
                    </Button>
                    {existing && <Button variant="outline" onClick={() => setPreview(existing)}><Eye className="h-4 w-4 mr-2" />Ver</Button>}
                    {existing && <Button variant={existing.published ? "ghost" : "secondary"} onClick={() => togglePublish(existing)}>
                      {existing.published ? "Despublicar" : "Publicar"}
                    </Button>}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {pages.length === 0 && (
        <Card className="rounded-3xl border-0 shadow-sm mt-6">
          <EmptyState icon={ScrollText} title="Sem páginas legais" description="Selecione um tipo acima e gere o conteúdo automaticamente." />
        </Card>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="rounded-3xl max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>{preview?.title}</DialogTitle></DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(preview?.html_content ?? "") }} />
          <DialogFooter><Button variant="ghost" onClick={() => setPreview(null)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
