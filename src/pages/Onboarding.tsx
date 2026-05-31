import { useEffect, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { NICHES, NicheKey } from "@/lib/niches";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { ArrowRight, Check, Upload, Loader2, X } from "lucide-react";
import { extractPaletteFromFile, Palette } from "@/lib/colorExtract";

const COLORS = [
  { name: "Roxo Optimio", value: "271 91% 65%" },
  { name: "Ciano", value: "174 80% 55%" },
  { name: "Rosa Jewelry", value: "322 70% 55%" },
  { name: "Azul", value: "220 90% 65%" },
  { name: "Verde", value: "142 71% 45%" },
  { name: "Laranja", value: "24 95% 58%" },
];

export default function Onboarding() {
  const { user } = useAuth();
  const { refresh, profile } = useTenant();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [palette, setPalette] = useState<Palette | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [data, setData] = useState({
    company_name: "",
    phone_number: "",
    niche: "beauty" as NicheKey,
    has_appointments: true,
    produces_own: "resell" as "produce" | "resell" | "none",
    estimated_volume: "low",
    primary_color: "271 91% 65%",
    secondary_color: "220 15% 25%",
    accent_color: "174 80% 55%",
    border_style: "rounded",
    logo_url: "" as string,
    logo_palette: [] as string[],
  });


  useEffect(() => {
    if (profile?.onboarding_completed) nav("/app", { replace: true });
    if (profile?.company_name && profile.company_name !== "Studio") setData(d => ({ ...d, company_name: profile.company_name! }));
  }, [profile, nav]);

  const finish = async () => {
    if (!user) return;
    if (!data.phone_number || data.phone_number.replace(/\D/g,"").length < 10) {
      return toast.error("WhatsApp é obrigatório.");
    }
    const niche = NICHES[data.niche];
    let modules = [...niche.modules];
    if (!data.has_appointments) modules = modules.filter(m => m !== "appointments" && m !== "packages");
    if (data.produces_own === "none") modules = modules.filter(m => m !== "products");

    // Se já pagou via Kiwify (account_status active), mantém ativo. Senão, fica em waiting_approval.
    const alreadyActive = profile?.account_status === "active";
    const accountStatus = alreadyActive ? "active" : "waiting_approval";

    const { error } = await supabase.from("profiles").update({
      company_name: data.company_name || "Studio",
      phone_number: data.phone_number,
      niche: data.niche,
      enabled_modules: modules,
      terms: niche.terms,
      primary_color: data.primary_color,
      secondary_color: data.secondary_color,
      accent_color: data.accent_color,
      logo_url: data.logo_url || null,
      logo_palette: data.logo_palette,
      border_style: data.border_style,
      estimated_volume: data.estimated_volume,
      account_status: accountStatus,
      onboarding_completed: true,
    }).eq("id", user.id);

    if (error) return toast.error(friendlyError(error));

    // Cria assinatura pending apenas se ainda não tem nenhuma (sem Kiwify)
    if (!alreadyActive) {
      const { data: subs } = await supabase.from("subscriptions").select("id").eq("user_id", user.id).limit(1);
      if (!subs?.length) {
        await supabase.from("subscriptions").insert({
          user_id: user.id, plan_slug: "basic", status: "pending",
        });
      }
    }

    // Marca onboarding_status como concluído
    await supabase.from("onboarding_status").upsert({
      user_id: user.id, completed: true, current_step: "done", niche: data.niche,
      checklist: {},
    }, { onConflict: "user_id" });

    await supabase.rpc("seed_default_categories", { _user_id: user.id, _niche: data.niche });
    if (modules.includes("anamnesis")) {
      await supabase.from("anamnesis_templates").upsert({
        user_id: user.id,
        questions: [
          { key: "objetivo", label: "Qual o objetivo principal do tratamento?" },
          { key: "alergias", label: "Possui alergias ou sensibilidades?" },
          { key: "medicacoes", label: "Faz uso de medicações contínuas?" },
          { key: "tratamentos_anteriores", label: "Realizou tratamentos similares antes?" },
          { key: "expectativas", label: "Quais suas expectativas com o resultado?" },
        ],
      });
    }
    await refresh();
    toast.success(alreadyActive ? "Tudo pronto! Bem-vindo ao Optimio." : "Tudo pronto! Aguarde aprovação do pagamento.");
    nav("/app");
  };


  const next = () => setStep(s => Math.min(5, s + 1));
  const back = () => setStep(s => Math.max(0, s - 1));

  const onLogoSelected = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Logo deve ter no máximo 5MB.");
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setExtracting(true);
    try {
      const p = await extractPaletteFromFile(file);
      setPalette(p);
      setData(d => ({
        ...d,
        primary_color: p.primary,
        secondary_color: p.secondary,
        accent_color: p.accent,
        logo_palette: p.all,
      }));
      toast.success("Paleta extraída do seu logo!");
    } catch {
      toast.error("Não consegui extrair as cores. Use a paleta abaixo.");
    } finally { setExtracting(false); }

    // Upload em background
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("tenant-logos").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("tenant-logos").getPublicUrl(path);
      setData(d => ({ ...d, logo_url: pub.publicUrl }));
    } catch (e: any) {
      toast.error("Falha ao enviar logo: " + friendlyError(e));
    } finally { setUploading(false); }
  };

  const removeLogo = () => {
    setLogoFile(null); setLogoPreview(null); setPalette(null);
    setData(d => ({ ...d, logo_url: "", logo_palette: [] }));
  };


  return (
    <div className="min-h-screen bg-background bg-mesh flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl glass border-0 rounded-3xl p-8 md:p-12">
        <div className="flex items-center justify-between mb-8">
          <Logo size="sm" />
          <div className="text-xs text-muted-foreground">Passo {step + 1} de 6</div>
        </div>
        <div className="h-1.5 bg-secondary/40 rounded-full mb-10 overflow-hidden">
          <div className="h-full bg-gradient-brand transition-all" style={{ width: `${((step + 1) / 6) * 100}%` }} />
        </div>

        {step === 0 && (
          <div className="space-y-4 animate-fade-up">
            <h2 className="text-3xl font-bold">Qual o nome da sua empresa?</h2>
            <p className="text-muted-foreground">Vamos personalizar o Optimio para você (whitelabel).</p>
            <Input autoFocus value={data.company_name} onChange={(e) => setData({ ...data, company_name: e.target.value })} placeholder="Ex.: Studio Maria" className="h-14 text-lg bg-secondary/40 border-0" />
            <Label className="pt-2 block">WhatsApp (obrigatório)</Label>
            <Input value={data.phone_number} onChange={(e) => setData({ ...data, phone_number: e.target.value })} placeholder="(11) 99999-9999" className="h-14 text-lg bg-secondary/40 border-0" />
            <p className="text-xs text-muted-foreground">Usado para suporte e contato sobre sua assinatura.</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 animate-fade-up">
            <h2 className="text-3xl font-bold">Qual o seu nicho principal?</h2>
            <p className="text-muted-foreground">A interface se adapta automaticamente.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {(Object.values(NICHES)).map(n => (
                <button key={n.key} onClick={() => setData({ ...data, niche: n.key })}
                  className={`text-left p-5 rounded-2xl border-2 transition ${data.niche === n.key ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>
                  <div className="font-semibold mb-1">{n.label}</div>
                  <div className="text-xs text-muted-foreground">{n.modules.length} módulos · {n.terms.clients}, {n.terms.services}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-up">
            <h2 className="text-3xl font-bold">Você trabalha com agendamento?</h2>
            <div className="grid grid-cols-2 gap-3">
              {[{ v: true, l: "Sim, agendo horários" }, { v: false, l: "Não, só vendas" }].map(o => (
                <button key={String(o.v)} onClick={() => setData({ ...data, has_appointments: o.v })}
                  className={`p-6 rounded-2xl border-2 ${data.has_appointments === o.v ? "border-primary bg-primary/10" : "border-border"}`}>
                  {o.l}
                </button>
              ))}
            </div>
            <h2 className="text-3xl font-bold pt-4">Trabalha com produtos?</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { v: "produce" as const, l: "Fabrico/produzo" },
                { v: "resell" as const, l: "Apenas revendo" },
                { v: "none" as const, l: "Não vendo produtos" },
              ].map(o => (
                <button key={o.v} onClick={() => setData({ ...data, produces_own: o.v })}
                  className={`p-6 rounded-2xl border-2 text-sm ${data.produces_own === o.v ? "border-primary bg-primary/10" : "border-border"}`}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-up">
            <h2 className="text-3xl font-bold">Quantas transações por mês?</h2>
            <p className="text-muted-foreground">Sugerimos um plano com base no volume.</p>
            {[
              { v: "low", l: "Até 30", plan: "Basic — R$ 159" },
              { v: "mid", l: "Até 100", plan: "Standard — R$ 199" },
              { v: "high", l: "Mais de 100", plan: "Unlimited — R$ 399" },
            ].map(o => (
              <button key={o.v} onClick={() => setData({ ...data, estimated_volume: o.v })}
                className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 ${data.estimated_volume === o.v ? "border-primary bg-primary/10" : "border-border"}`}>
                <span className="font-semibold">{o.l}</span>
                <span className="text-sm text-muted-foreground">{o.plan}</span>
              </button>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-fade-up">
            <h2 className="text-3xl font-bold">Personalize o design</h2>
            <Label>Cor primária</Label>
            <div className="grid grid-cols-3 gap-3">
              {COLORS.map(c => (
                <button key={c.value} onClick={() => setData({ ...data, primary_color: c.value })}
                  className={`p-4 rounded-2xl border-2 flex items-center gap-2 ${data.primary_color === c.value ? "border-primary" : "border-border"}`}>
                  <span className="h-6 w-6 rounded-full" style={{ background: `hsl(${c.value})` }} />
                  <span className="text-sm">{c.name}</span>
                </button>
              ))}
            </div>
            <Label className="pt-4 block">Estilo de borda</Label>
            <div className="grid grid-cols-2 gap-3">
              {[{ v: "rounded", l: "Arredondado" }, { v: "sharp", l: "Reto" }].map(o => (
                <button key={o.v} onClick={() => setData({ ...data, border_style: o.v })}
                  className={`p-6 border-2 ${data.border_style === o.v ? "border-primary bg-primary/10" : "border-border"} ${o.v === "rounded" ? "rounded-3xl" : "rounded-none"}`}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 animate-fade-up text-center">
            <div className="h-16 w-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center"><Check className="h-8 w-8 text-primary" /></div>
            <h2 className="text-3xl font-bold">Tudo pronto, {data.company_name || "Studio"}!</h2>
            <p className="text-muted-foreground">Configuramos o Optimio para <strong>{NICHES[data.niche].label}</strong> com {NICHES[data.niche].modules.length} módulos ativos.</p>
            <p className="text-xs text-muted-foreground">Você pode reiniciar o setup a qualquer momento em Configurações.</p>
          </div>
        )}

        <div className="flex justify-between mt-10">
          <Button variant="ghost" onClick={back} disabled={step === 0}>Voltar</Button>
          {step < 5
            ? <Button onClick={next} className="bg-gradient-brand text-white border-0">Continuar <ArrowRight className="ml-2 h-4 w-4" /></Button>
            : <Button onClick={finish} className="bg-gradient-brand text-white border-0">Entrar no Optimio</Button>}
        </div>
      </Card>
    </div>
  );
}
