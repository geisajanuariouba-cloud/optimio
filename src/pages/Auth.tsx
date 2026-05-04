import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function Auth() {
  const [params] = useSearchParams();
  const initialMode = params.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => { if (user) navigate("/app", { replace: true }); }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`,
            data: { full_name: fullName, company_name: companyName || "Studio" },
          },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from("profiles").update({ account_status: "waiting_approval" }).eq("id", data.user.id);
        }
        toast.success("Cadastro recebido! Sua conta aguarda aprovação do admin.");
        navigate("/onboarding");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        navigate("/app");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao autenticar");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex bg-background bg-mesh">
      {/* Visual side */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden p-12 flex-col justify-between">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="h-4 w-4" /> Voltar ao site
        </Link>

        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass mb-6 text-xs">
            <Sparkles className="h-3 w-3 text-brand-cyan" />
            <span>Plataforma multi-tenant</span>
          </div>
          <h2 className="text-5xl font-bold leading-tight mb-4">
            Otimize <span className="text-gradient-brand">cada decisão</span> do seu negócio.
          </h2>
          <p className="text-muted-foreground text-lg">
            Agenda, CRM, financeiro, marketing e BI — em uma única plataforma futurista que se molda ao seu negócio.
          </p>
        </div>

        <div className="relative z-10 flex gap-6">
          {["+47% faturamento", "3min setup", "Suporte 24/7"].map((s) => (
            <div key={s} className="text-sm text-muted-foreground">✦ {s}</div>
          ))}
        </div>

        {/* Floating orbs + grid */}
        <div className="absolute inset-0 -z-10 opacity-50"
             style={{
               backgroundImage: "linear-gradient(hsl(var(--primary)/0.1) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)/0.1) 1px, transparent 1px)",
               backgroundSize: "60px 60px",
             }} />
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-brand-purple/30 blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-brand-cyan/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      </div>

      {/* Form side */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8"><Logo /></div>
          <div className="glass rounded-3xl p-8 md:p-10 shadow-elegant">
            <h1 className="text-3xl font-bold mb-2">{mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}</h1>
            <p className="text-muted-foreground mb-8 text-sm">
              {mode === "login" ? "Acesse seu painel Optimio" : "Comece a otimizar em minutos"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <>
                  <div>
                    <Label htmlFor="name">Nome completo</Label>
                    <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="bg-secondary/50 border-border h-11" />
                  </div>
                  <div>
                    <Label htmlFor="company">Nome da empresa</Label>
                    <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Studio" className="bg-secondary/50 border-border h-11" />
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-secondary/50 border-border h-11" />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="bg-secondary/50 border-border h-11" />
              </div>

              {mode === "login" && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <Checkbox checked={remember} onCheckedChange={(c) => setRemember(!!c)} />
                  Manter-me conectado
                </label>
              )}

              <Button type="submit" disabled={loading} className="w-full h-12 bg-gradient-brand text-white border-0 hover:opacity-90">
                {loading ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
              </Button>
            </form>

            <p className="mt-6 text-sm text-center text-muted-foreground">
              {mode === "login" ? "Não tem conta? " : "Já tem conta? "}
              <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-brand-cyan hover:underline font-medium">
                {mode === "login" ? "Crie agora" : "Entrar"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
