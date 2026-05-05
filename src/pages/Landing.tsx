import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Check, Sparkles, BarChart3, Calendar, Users, Package, Wallet, Megaphone, Zap, Shield, Rocket, ArrowRight, AlertTriangle } from "lucide-react";
import NicheDemo from "@/components/landing/NicheDemo";
import AIChat from "@/components/AIChat";

const features = [
  { icon: Calendar, title: "Agenda Inteligente", desc: "Calendário visual com fila de vendas integrada, anti-overbooking e métricas em tempo real." },
  { icon: Users, title: "CRM Premium", desc: "Histórico completo de clientes, anamnese integrada, LTV e métricas individuais." },
  { icon: Package, title: "Pacotes com IA", desc: "A IA lê a anamnese e monta automaticamente o pacote ideal de tratamentos." },
  { icon: Wallet, title: "Financeiro Sólido", desc: "Snapshot de taxas, promissórias com juros, conciliação automática por e-mail." },
  { icon: Megaphone, title: "Marketing Hub", desc: "Calendário editorial, kanban de ideias, integração com Meta e Gmail." },
  { icon: BarChart3, title: "BI Avançado", desc: "Dashboards de Business Intelligence em todos os módulos. Decida com dados." },
];

const plans = [
  {
    name: "Basic",
    price: 159,
    tagline: "Para começar com o pé direito",
    features: ["30 transações/mês", "Agenda Inteligente", "Cadastro de Clientes", "Anamnese Básica", "Suporte por e-mail"],
    cta: "Começar agora",
    highlight: false,
  },
  {
    name: "Standard",
    price: 199,
    tagline: "O mais escolhido — automação sólida",
    features: ["100 transações/mês", "Tudo do Basic", "Pacotes com IA de Anamnese", "Estoque & Produção unificados", "Marketing Hub", "Suporte prioritário"],
    cta: "Escolher plano",
    highlight: true,
  },
  {
    name: "Unlimited",
    price: 399,
    tagline: "Gestão total, sem limites",
    features: ["Transações ilimitadas", "Tudo do Standard", "BI Avançado", "Chat de promoções em tempo real", "Whitelabel completo", "Gerente de conta dedicado"],
    cta: "Escalar agora",
    highlight: false,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background bg-mesh overflow-hidden">
      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 lg:px-12 py-6">
        <Logo />
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition">Recursos</a>
          <a href="#plans" className="hover:text-foreground transition">Planos</a>
          <a href="#about" className="hover:text-foreground transition">Sobre</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth"><Button variant="ghost">Entrar</Button></Link>
          <Link to="/auth?mode=signup"><Button className="bg-gradient-brand text-white border-0 hover:opacity-90">Adquirir</Button></Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 lg:px-12 pt-16 pb-24 lg:pt-24 lg:pb-32">
        <div className="max-w-5xl mx-auto text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 text-sm">
            <Sparkles className="h-4 w-4 text-brand-cyan" />
            <span>Plataforma de Inteligência de Gestão</span>
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.05] mb-8">
            Gestão otimizada,<br />
            <span className="text-gradient-brand">crescimento real.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            O SaaS multi-tenant que adapta cada propriedade ao seu negócio — de salões de beleza a clínicas, estúdios e consultorias. Tudo em uma plataforma só.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth?mode=signup">
              <Button size="lg" className="bg-gradient-brand text-white border-0 hover:opacity-90 px-8 h-14 text-base animate-pulse-glow">
                Adquirir agora <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="#playground">
              <Button size="lg" variant="outline" className="px-8 h-14 text-base">
                Testar no meu nicho
              </Button>
            </a>
          </div>

          <div className="mt-10 inline-flex items-center gap-3 px-5 py-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-100 text-sm">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <span><strong>60% das empresas fecham</strong> por má gestão. O Optimio é a sua defesa.</span>
          </div>

          <div className="mt-20 grid grid-cols-3 gap-3 sm:gap-6 max-w-3xl mx-auto">
            {[
              { v: "+47%", l: "Faturamento médio" },
              { v: "3min", l: "Setup inicial" },
              { v: "24/7", l: "Automação ativa" },
            ].map((s) => (
              <div key={s.l} className="glass rounded-2xl p-3 sm:p-6 min-w-0">
                <div className="text-xl sm:text-3xl md:text-4xl font-bold text-gradient-brand break-words leading-tight">{s.v}</div>
                <div className="text-[11px] sm:text-sm text-muted-foreground mt-1 leading-snug">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* floating orbs */}
        <div className="absolute top-1/4 -left-24 h-72 w-72 rounded-full bg-brand-purple/30 blur-3xl animate-float" />
        <div className="absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-brand-cyan/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      </section>

      <div id="playground"><NicheDemo /></div>

      {/* Features */}
      <section id="features" className="relative px-6 lg:px-12 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Tudo que você precisa, <span className="text-gradient-brand">integrado.</span></h2>
            <p className="text-muted-foreground text-lg">Sete módulos. Zero fricção. Resultados desde o primeiro dia.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="glass rounded-3xl p-8 hover:scale-[1.02] transition group">
                <div className="h-12 w-12 rounded-xl bg-gradient-brand/20 border border-primary/30 flex items-center justify-center mb-5 group-hover:glow-primary transition">
                  <f.icon className="h-6 w-6 text-brand-cyan" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="relative px-6 lg:px-12 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Planos para <span className="text-gradient-brand">cada estágio</span></h2>
            <p className="text-muted-foreground text-lg">Sem fidelidade. Sem surpresa. Cancele quando quiser.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-3xl p-8 ${p.highlight ? "border-gradient bg-card-gradient glow-primary scale-[1.03]" : "glass"}`}
              >
                {p.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-brand text-xs font-semibold text-white">
                    MAIS VENDIDO
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-1">{p.name}</h3>
                <p className="text-sm text-muted-foreground mb-6">{p.tagline}</p>
                <div className="mb-6">
                  <span className="text-5xl font-bold">R${p.price}</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {p.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3 text-sm">
                      <Check className="h-5 w-5 text-brand-cyan shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/auth?mode=signup" className="block">
                  <Button className={`w-full h-12 ${p.highlight ? "bg-gradient-brand text-white border-0 hover:opacity-90" : ""}`} variant={p.highlight ? "default" : "outline"}>
                    {p.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About / Why */}
      <section id="about" className="relative px-6 lg:px-12 py-24">
        <div className="max-w-5xl mx-auto glass rounded-[2.5rem] p-12 md:p-16 text-center">
          <div className="flex justify-center gap-4 mb-8">
            {[Zap, Shield, Rocket].map((I, i) => (
              <div key={i} className="h-14 w-14 rounded-2xl bg-gradient-brand/20 border border-primary/30 flex items-center justify-center">
                <I className="h-6 w-6 text-brand-cyan" />
              </div>
            ))}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Pronto para <span className="text-gradient-brand">otimizar tudo?</span></h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Junte-se a centenas de gestores que estão escalando seus negócios com o Optimio. Setup em minutos, resultados imediatos.
          </p>
          <Link to="/auth?mode=signup">
            <Button size="lg" className="bg-gradient-brand text-white border-0 hover:opacity-90 px-10 h-14 text-base">
              Criar minha conta <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="px-6 lg:px-12 py-10 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <Logo size="sm" />
        <p>© 2026 Optimio. Todos os direitos reservados.</p>
      </footer>

      <AIChat context="visitor" />
    </div>
  );
}
