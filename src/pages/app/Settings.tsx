import { useEffect, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { NICHES, NicheKey } from "@/lib/niches";
import { toast } from "sonner";
import { Settings as SettingsIcon, Palette, RefreshCw, Crown, Tags, Plus, Trash2, ClipboardList, ArrowUp, LifeBuoy } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Link } from "react-router-dom";

const COLORS = [
  { name: "Roxo", value: "271 91% 65%" },
  { name: "Ciano", value: "174 80% 55%" },
  { name: "Rosa", value: "322 70% 55%" },
  { name: "Azul", value: "220 90% 65%" },
  { name: "Verde", value: "142 71% 45%" },
  { name: "Laranja", value: "24 95% 58%" },
];

type Cat = { id: string; kind: "income" | "expense" | "product"; name: string };
type Q = { key: string; label: string };

export default function Settings() {
  const { user } = useAuth();
  const { profile, refresh } = useTenant();
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [niche, setNiche] = useState<NicheKey>("beauty");
  const [primaryColor, setPrimaryColor] = useState("271 91% 65%");
  const [borderStyle, setBorderStyle] = useState("rounded");
  const [loading, setLoading] = useState(false);
  const [supportVisible, setSupportVisible] = useState(true);
  const [supportPosition, setSupportPosition] = useState<"bottom-right" | "bottom-left" | "top-right" | "top-left">("bottom-right");

  const [cats, setCats] = useState<Cat[]>([]);
  const [newCat, setNewCat] = useState<{ kind: Cat["kind"]; name: string }>({ kind: "income", name: "" });

  const [questions, setQuestions] = useState<Q[]>([]);
  const [savingAnam, setSavingAnam] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setCompanyName(profile.company_name ?? "");
    setFullName(profile.full_name ?? "");
    setNiche((profile.niche as NicheKey) ?? "beauty");
    setPrimaryColor(profile.primary_color);
    setBorderStyle(profile.border_style);
  }, [profile]);

  const loadExtras = async () => {
    if (!user) return;
    const [{ data: c }, { data: a }] = await Promise.all([
      supabase.from("categories").select("id,kind,name").order("kind").order("name"),
      supabase.from("anamnesis_templates").select("questions").eq("user_id", user.id).maybeSingle(),
    ]);
    setCats((c ?? []) as any);
    setQuestions(((a?.questions as any) ?? []) as Q[]);
  };
  useEffect(() => { loadExtras(); }, [user]);

  const save = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({
      company_name: companyName, full_name: fullName,
      primary_color: primaryColor, border_style: borderStyle,
    }).eq("id", user.id);
    setLoading(false);
    if (error) toast.error(friendlyError(error)); else { toast.success("Configurações salvas!"); refresh(); }
  };

  const resetNiche = async () => {
    if (!user) return;
    const n = NICHES[niche];
    const { error } = await supabase.from("profiles").update({
      niche, enabled_modules: n.modules, terms: n.terms,
    }).eq("id", user.id);
    if (error) toast.error(friendlyError(error)); else { toast.success(`Nicho alterado para ${n.label}`); refresh(); }
  };

  const addCat = async () => {
    if (!user || !newCat.name.trim()) return;
    const { error } = await supabase.from("categories").insert({ user_id: user.id, kind: newCat.kind, name: newCat.name.trim() });
    if (error) return toast.error(friendlyError(error));
    setNewCat({ ...newCat, name: "" });
    loadExtras();
  };
  const delCat = async (id: string) => {
    await supabase.from("categories").delete().eq("id", id);
    loadExtras();
  };

  const saveAnamnesis = async () => {
    if (!user) return;
    setSavingAnam(true);
    const { error } = await supabase.from("anamnesis_templates").upsert({ user_id: user.id, questions: questions as any });
    setSavingAnam(false);
    if (error) toast.error(friendlyError(error)); else toast.success("Anamnese atualizada");
  };

  const goCheckout = (plan: string) => {
    toast.info("Redirecionando para o checkout…");
    // TODO: integrar gateway. Por hora abre WhatsApp/admin para upgrade.
    supabase.from("app_settings").select("whatsapp_link").eq("id", 1).maybeSingle().then(({ data }) => {
      const link = data?.whatsapp_link || "https://wa.me/";
      const url = `${link}${link.includes("?") ? "&" : "?"}text=${encodeURIComponent(`Olá, quero fazer upgrade para o plano ${plan}.`)}`;
      window.open(url, "_blank");
    });
  };

  const grouped = (k: Cat["kind"]) => cats.filter(c => c.kind === k);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold mb-1">Configurações</h1>
        <p className="text-muted-foreground">Personalize empresa, nicho, design, plano, categorias e anamnese.</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="bg-secondary/40 flex-wrap h-auto">
          <TabsTrigger value="general"><SettingsIcon className="h-4 w-4 mr-1" />Geral</TabsTrigger>
          <TabsTrigger value="categories"><Tags className="h-4 w-4 mr-1" />Categorias</TabsTrigger>
          <TabsTrigger value="anamnesis"><ClipboardList className="h-4 w-4 mr-1" />Anamnese</TabsTrigger>
          <TabsTrigger value="plan"><Crown className="h-4 w-4 mr-1" />Plano</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-4">
          <Card className="p-6 rounded-3xl border-0 shadow-sm space-y-4">
            <h2 className="text-xl font-semibold">Empresa</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Nome completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-secondary/50 border-0 h-11" /></div>
              <div><Label>Nome da empresa (whitelabel)</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="bg-secondary/50 border-0 h-11" /></div>
            </div>
            <Button onClick={save} disabled={loading} className="rounded-2xl">{loading ? "Salvando…" : "Salvar"}</Button>
          </Card>

          <Card className="p-6 rounded-3xl border-0 shadow-sm space-y-4">
            <div className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /><h2 className="text-xl font-semibold">Aparência</h2></div>
            <div>
              <Label>Cor primária</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {COLORS.map(c => (
                  <button key={c.value} onClick={() => setPrimaryColor(c.value)}
                    className={`h-10 w-10 rounded-full border-2 ${primaryColor === c.value ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ background: `hsl(${c.value})` }} title={c.name} />
                ))}
              </div>
            </div>
            <div>
              <Label>Estilo de borda</Label>
              <Select value={borderStyle} onValueChange={setBorderStyle}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="rounded">Arredondado</SelectItem><SelectItem value="sharp">Reto</SelectItem></SelectContent>
              </Select>
            </div>
            <Button onClick={save} className="rounded-2xl">Aplicar</Button>
          </Card>

          <Card className="p-6 rounded-3xl border-0 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div><h2 className="text-xl font-semibold">Nicho do negócio</h2><p className="text-sm text-muted-foreground">Atual: {NICHES[(profile?.niche as NicheKey) ?? "beauty"]?.label}</p></div>
              <Badge variant="outline">{profile?.enabled_modules?.length ?? 0} módulos</Badge>
            </div>
            <Select value={niche} onValueChange={(v) => setNiche(v as NicheKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.values(NICHES).map(n => <SelectItem key={n.key} value={n.key}>{n.label}</SelectItem>)}</SelectContent>
            </Select>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="rounded-2xl"><RefreshCw className="h-4 w-4 mr-2" />Reiniciar nicho</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Mudar de nicho?</AlertDialogTitle>
                  <AlertDialogDescription>Mudar de nicho ocultará dados de módulos incompatíveis. Os dados não serão excluídos — apenas ocultos.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={resetNiche}>Confirmar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6 mt-4">
          <Card className="p-6 rounded-3xl border-0 shadow-sm space-y-4">
            <h2 className="text-xl font-semibold">Categorias</h2>
            <p className="text-sm text-muted-foreground">Usadas em Receitas, Despesas e Produtos. Padronize a entrada de dados.</p>
            <div className="grid sm:grid-cols-[140px_1fr_auto] gap-2">
              <Select value={newCat.kind} onValueChange={(v) => setNewCat({ ...newCat, kind: v as Cat["kind"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="product">Produto</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Nome da categoria" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addCat()} />
              <Button onClick={addCat}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
            </div>

            {(["income", "expense", "product"] as const).map(k => (
              <div key={k}>
                <div className="text-sm font-semibold mb-2 capitalize">{k === "income" ? "Receitas" : k === "expense" ? "Despesas" : "Produtos"}</div>
                <div className="flex flex-wrap gap-2">
                  {grouped(k).length === 0 && <span className="text-xs text-muted-foreground">Nenhuma cadastrada.</span>}
                  {grouped(k).map(c => (
                    <Badge key={c.id} variant="outline" className="gap-1 pr-1">
                      {c.name}
                      <button onClick={() => delCat(c.id)} className="hover:text-rose-500 ml-1"><Trash2 className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="anamnesis" className="space-y-6 mt-4">
          <Card className="p-6 rounded-3xl border-0 shadow-sm space-y-4">
            <h2 className="text-xl font-semibold">Editor de Ficha de Anamnese</h2>
            <p className="text-sm text-muted-foreground">Defina as perguntas padrão que aparecerão ao criar uma nova ficha.</p>
            <div className="space-y-2">
              {questions.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma pergunta. Adicione abaixo.</p>}
              {questions.map((q, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input value={q.label} onChange={(e) => setQuestions(qs => qs.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} placeholder="Pergunta" />
                  <Button size="icon" variant="ghost" onClick={() => setQuestions(qs => qs.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setQuestions(qs => [...qs, { key: `q_${Date.now()}`, label: "" }])}><Plus className="h-4 w-4 mr-1" />Pergunta</Button>
              <Button onClick={saveAnamnesis} disabled={savingAnam} className="rounded-2xl">{savingAnam ? "Salvando…" : "Salvar template"}</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="plan" className="space-y-6 mt-4">
          <Card className="p-6 rounded-3xl border-0 shadow-sm space-y-4">
            <h2 className="text-xl font-semibold">Plano atual</h2>
            <div className="flex items-center gap-3">
              <Badge className="text-sm capitalize">{profile?.plan}</Badge>
              <span className="text-sm text-muted-foreground">Veja todos os planos, compare benefícios e faça upgrade.</span>
            </div>
            <div className="flex gap-2">
              <Link to="/app/upgrade"><Button className="bg-gradient-brand text-white border-0 rounded-2xl gap-2"><Crown className="h-4 w-4" />Ver planos e fazer upgrade</Button></Link>
            </div>
            <p className="text-xs text-muted-foreground">A página de upgrade carrega seu vencimento, plano atual e os links de checkout configurados pelo administrador.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
