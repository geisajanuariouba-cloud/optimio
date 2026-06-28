import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Check, X, Star, Shield, Lock, ChevronDown, ChevronUp, ArrowRight, Zap } from "lucide-react";

// ── Countdown ──────────────────────────────────────────────────────────────
function nextSundayMidnight() {
  const d = new Date();
  const daysUntil = (7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + daysUntil);
  d.setHours(23, 59, 59, 0);
  return d.getTime();
}
const END_TS = nextSundayMidnight();

function useCountdown() {
  const [ms, setMs] = useState(() => Math.max(0, END_TS - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setMs(Math.max(0, END_TS - Date.now())), 1000);
    return () => clearInterval(id);
  }, []);
  const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  return { h, m, s };
}

// ── Helpers ────────────────────────────────────────────────────────────────
const faq: { q: string; a: string }[] = [
  { q: "Preciso instalar alguma coisa?", a: "Não. O Optimio é 100% online. Acesse pelo computador, celular ou tablet — basta um navegador e internet." },
  { q: "Serve para qualquer tipo de negócio?", a: "Sim. Salão de beleza, loja de roupas, pet shop, clínica, estúdio, loja de móveis, consultório — o sistema se adapta ao seu nicho automaticamente." },
  { q: "Posso cancelar quando quiser?", a: "Sim, sem fidelidade. No plano mensal você cancela a qualquer momento pelo painel. No trimestral, o acesso segue até o final do período pago." },
  { q: "E se eu não souber usar o sistema?", a: "O Optimio foi feito para ser simples. Mas caso precise, nosso suporte via WhatsApp está disponível para te ajudar no que precisar." },
  { q: "Meus dados ficam seguros?", a: "Seus dados ficam armazenados em servidores seguros com criptografia. Nenhum terceiro tem acesso às suas informações." },
  { q: "Posso trocar de mensal para trimestral?", a: "Sim. Você pode migrar de plano a qualquer momento pelo painel de configurações." },
];

const depoimentos = [
  { nome: "Carla Menezes", cidade: "Belo Horizonte – MG", negocio: "Salão de Beleza", texto: "Antes eu anotava tudo no caderno e no WhatsApp. Perdi clientes, perdi dinheiro. Com o Optimio meu caixa fecha certinho todo mês." },
  { nome: "Rafael Souza", cidade: "São Paulo – SP", negocio: "Loja de Móveis Planejados", texto: "Minhas ordens de produção ficavam espalhadas. Hoje consigo acompanhar cada pedido, estoque e fornecedor em um único lugar. Economizei horas por semana." },
  { nome: "Patrícia Lima", cidade: "Goiânia – GO", negocio: "Clínica Estética", texto: "Fiz 3 meses no plano trimestral e já paguei o investimento só com os agendamentos que eu deixava escapar antes. Vale muito." },
  { nome: "Marcos Andrade", cidade: "Curitiba – PR", negocio: "Pet Shop", texto: "A parte financeira era um caos total. Agora eu vejo receita, despesas e lucro real em tempo real. Finalmente sei se estou ganhando ou perdendo." },
];

export default function Landing() {
  const { h, m, s } = useCountdown();
  const [checkoutMensal, setCheckoutMensal] = useState("");
  const [checkoutTrimestral, setCheckoutTrimestral] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [ciclo, setCiclo] = useState<"mensal" | "trimestral">("trimestral");

  useEffect(() => {
    supabase.from("system_settings").select("key,value").eq("scope", "global")
      .in("key", ["checkout_mensal_url", "checkout_trimestral_url", "checkout_basic_url", "checkout_pro_url"])
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data ?? []).forEach((r: any) => { map[r.key] = typeof r.value === "string" ? r.value : (r.value?.value ?? ""); });
        setCheckoutMensal(map["checkout_mensal_url"] || map["checkout_basic_url"] || "/auth");
        setCheckoutTrimestral(map["checkout_trimestral_url"] || map["checkout_pro_url"] || "/auth");
      });
  }, []);

  const ctaUrl = ciclo === "mensal" ? checkoutMensal : checkoutTrimestral;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">

      {/* ── BARRA DE URGÊNCIA ──────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 py-2.5 px-4 text-center text-sm font-semibold tracking-wide text-white">
        ⚡ OFERTA ESPECIAL encerra em:{" "}
        <span className="inline-flex items-center gap-1 ml-1 font-mono text-base font-black bg-black/20 px-2 py-0.5 rounded">
          {h}:{m}:{s}
        </span>
        {" "}— Aproveite antes que o preço suba!
      </div>

      {/* ── NAV ───────────────────────────────────────────────────── */}
      <nav className="px-5 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Logo />
        <Link to="/auth">
          <button className="text-sm text-white/60 hover:text-white transition border border-white/20 hover:border-white/40 px-4 py-2 rounded-xl">
            Já tenho conta
          </button>
        </Link>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="px-5 pt-10 pb-16 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest">
          <Zap className="h-3.5 w-3.5" /> Sistema de Gestão para Pequenas Empresas
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.08] mb-6">
          Chega de perder dinheiro<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">
            por falta de controle.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-4 leading-relaxed">
          O <strong className="text-white">Optimio</strong> organiza seu negócio inteiro — clientes, vendas, estoque,
          financeiro e produção — em um único painel simples e poderoso.
        </p>
        <p className="text-base text-white/50 mb-10">
          Sem planilha. Sem caderno. Sem caos.
        </p>

        <a href="#planos">
          <button className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold text-lg px-10 py-4 rounded-2xl shadow-[0_0_40px_rgba(249,115,22,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(249,115,22,0.6)]">
            QUERO ORGANIZAR MEU NEGÓCIO <ArrowRight className="h-5 w-5" />
          </button>
        </a>
        <p className="text-xs text-white/30 mt-3">🔒 Acesso imediato · Sem fidelidade · Cancele quando quiser</p>
      </section>

      {/* ── NÚMEROS SOCIAIS ───────────────────────────────────────── */}
      <div className="border-y border-white/10 bg-white/[0.03] py-8 px-5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { n: "+1.200", l: "empresas usam o Optimio" },
            { n: "4.9★", l: "avaliação média dos usuários" },
            { n: "R$0", l: "taxa de instalação" },
            { n: "24h", l: "suporte via WhatsApp" },
          ].map(({ n, l }) => (
            <div key={l}>
              <div className="text-2xl md:text-3xl font-black text-orange-400">{n}</div>
              <div className="text-xs text-white/50 mt-1">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── O PROBLEMA ────────────────────────────────────────────── */}
      <section className="px-5 py-16 max-w-3xl mx-auto">
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-8 md:p-10">
          <h2 className="text-2xl md:text-3xl font-black text-center mb-8 text-rose-300">
            Você se identifica com algum disso?
          </h2>
          <div className="space-y-4">
            {[
              "Você ainda anota pedidos no caderno ou no WhatsApp",
              "Não sabe ao certo quanto entra e quanto sai do caixa todo mês",
              "Perde clientes porque não tem como acompanhar o histórico deles",
              "O estoque some e você só descobre quando o cliente está na sua frente",
              "Passa horas numa planilha tentando fechar o financeiro",
              "Não tem tempo de olhar para o negócio porque está apagando incêndio",
            ].map((t) => (
              <div key={t} className="flex items-start gap-3">
                <X className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                <span className="text-white/80">{t}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 p-4 bg-rose-500/20 rounded-2xl text-center text-rose-200 font-semibold text-sm">
            ⚠️ A maioria das pequenas empresas fecha em até 5 anos — e a causa número 1 é a falta de controle financeiro e operacional.
          </div>
        </div>
      </section>

      {/* ── O QUE É O OPTIMIO ────────────────────────────────────── */}
      <section className="px-5 py-10 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-black mb-4">
          O Optimio resolve tudo isso
          <br /><span className="text-orange-400">de uma vez só.</span>
        </h2>
        <p className="text-white/60 text-lg mb-12">Um sistema completo para quem quer crescer sem perder o controle.</p>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { icon: "📅", t: "Agenda & Clientes", d: "Histórico completo, agendamentos e CRM em um único lugar." },
            { icon: "💰", t: "Financeiro Real", d: "Controle de entradas, saídas, despesas fixas e lucro líquido." },
            { icon: "📦", t: "Estoque & Produtos", d: "Alertas de mínimo, movimentação automática e custo por variação." },
            { icon: "🏭", t: "Produção & Receitas", d: "Ordens de produção, fichas técnicas e baixa automática de matéria-prima." },
            { icon: "🛒", t: "Vendas & Orçamentos", d: "Do orçamento à venda em um clique, com histórico e relatórios." },
            { icon: "📊", t: "Dashboard & BI", d: "Veja receita, ticket médio, crescimento e previsões em tempo real." },
          ].map(({ icon, t, d }) => (
            <div key={t} className="bg-white/[0.05] border border-white/10 rounded-2xl p-5 text-left hover:border-orange-500/30 hover:bg-orange-500/5 transition-all">
              <div className="text-3xl mb-3">{icon}</div>
              <div className="font-bold mb-1">{t}</div>
              <div className="text-sm text-white/50">{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMPARATIVO ──────────────────────────────────────────── */}
      <section className="px-5 py-12 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-black text-center mb-8">Antes × Depois do Optimio</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6">
            <h3 className="font-bold text-rose-300 mb-4 text-center">❌ Sem o Optimio</h3>
            <ul className="space-y-3 text-sm text-white/70">
              {["Caderno, planilha e WhatsApp misturados", "Caixa no vermelho sem saber por quê", "Cliente some e você não percebe", "Estoque acabando na hora errada", "Horas fechando planilha no fim do mês", "Decisão no escuro, na intuição"].map(t => (
                <li key={t} className="flex gap-2"><X className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />{t}</li>
              ))}
            </ul>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
            <h3 className="font-bold text-emerald-300 mb-4 text-center">✅ Com o Optimio</h3>
            <ul className="space-y-3 text-sm text-white/70">
              {["Tudo centralizado em um único painel", "Lucro real visível todo dia", "CRM com histórico e alertas de retorno", "Estoque com alerta automático de mínimo", "Relatórios em 1 clique, sem planilha", "Decisão com dados, não com chute"].map(t => (
                <li key={t} className="flex gap-2"><Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ──────────────────────────────────────────── */}
      <section className="px-5 py-12 bg-white/[0.03] border-y border-white/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-center mb-2">O que dizem quem já usa</h2>
          <p className="text-center text-white/40 mb-10 text-sm">Resultados reais de pequenos negócios como o seu.</p>
          <div className="grid sm:grid-cols-2 gap-5">
            {depoimentos.map(({ nome, cidade, negocio, texto }) => (
              <div key={nome} className="bg-white/[0.05] border border-white/10 rounded-2xl p-6">
                <div className="flex text-amber-400 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400" />)}
                </div>
                <p className="text-white/80 text-sm leading-relaxed mb-4">"{texto}"</p>
                <div>
                  <div className="font-bold text-sm">{nome}</div>
                  <div className="text-xs text-white/40">{negocio} · {cidade}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANOS / PRICING ─────────────────────────────────────── */}
      <section id="planos" className="px-5 py-16 max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest">
          ⚡ Oferta por tempo limitado
        </div>
        <h2 className="text-3xl md:text-4xl font-black mb-2">Um plano. Tudo incluso.</h2>
        <p className="text-white/50 mb-8">Escolha como prefere pagar:</p>

        {/* Toggle ciclo */}
        <div className="inline-flex bg-white/[0.07] border border-white/10 rounded-2xl p-1 mb-8">
          <button
            onClick={() => setCiclo("mensal")}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${ciclo === "mensal" ? "bg-orange-500 text-white shadow" : "text-white/50 hover:text-white"}`}
          >
            Mensal
          </button>
          <button
            onClick={() => setCiclo("trimestral")}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all relative ${ciclo === "trimestral" ? "bg-orange-500 text-white shadow" : "text-white/50 hover:text-white"}`}
          >
            Trimestral
            <span className="absolute -top-2.5 -right-2 bg-emerald-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">-40%</span>
          </button>
        </div>

        {/* Card preço */}
        <div className="bg-white/[0.06] border-2 border-orange-500/50 rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-500 to-amber-400" />
          <div className="absolute top-4 right-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black px-3 py-1 rounded-full">
            MAIS POPULAR
          </div>

          {ciclo === "mensal" ? (
            <div className="mb-6">
              <div className="text-white/40 text-sm line-through mb-1">De R$89,90/mês</div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-black text-white">R$37</span>
                <span className="text-2xl font-black text-orange-400">,90</span>
                <span className="text-white/50 text-sm">/mês</span>
              </div>
              <div className="text-emerald-400 text-sm font-semibold mt-1">Você economiza R$52,00/mês vs preço cheio</div>
            </div>
          ) : (
            <div className="mb-6">
              <div className="text-white/40 text-sm line-through mb-1">De R$113,70 (3x mensal)</div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-black text-white">R$67</span>
                <span className="text-2xl font-black text-orange-400">,90</span>
                <span className="text-white/50 text-sm">/trimestre</span>
              </div>
              <div className="text-white/60 text-sm mt-1">R$22,63/mês · 3 meses de acesso</div>
              <div className="text-emerald-400 text-sm font-semibold">Você economiza R$45,80 vs plano mensal</div>
            </div>
          )}

          <div className="space-y-2.5 text-left mb-8">
            {[
              "Clientes, agenda e CRM completo",
              "Controle financeiro (entradas, saídas, despesas)",
              "Estoque com alerta de mínimo automático",
              "Vendas e orçamentos em um clique",
              "Módulo de produção e fichas técnicas",
              "Dashboard e relatórios em tempo real",
              "Compras inteligentes com sugestão de reposição",
              "Suporte via WhatsApp",
              "Acesso em qualquer dispositivo",
              "Atualizações gratuitas para sempre",
            ].map(t => (
              <div key={t} className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-emerald-400" />
                </div>
                <span className="text-sm text-white/80">{t}</span>
              </div>
            ))}
          </div>

          <a href={ctaUrl} target="_blank" rel="noopener noreferrer">
            <button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-black text-lg py-4 rounded-2xl shadow-[0_0_40px_rgba(249,115,22,0.35)] transition-all hover:scale-[1.02] hover:shadow-[0_0_60px_rgba(249,115,22,0.55)]">
              QUERO ACESSAR AGORA →
            </button>
          </a>
          <p className="text-xs text-white/30 mt-3">🔒 Pagamento 100% seguro · Acesso imediato após confirmação</p>
        </div>

        {/* Urgência abaixo do card */}
        <div className="mt-6 flex items-center justify-center gap-2 text-amber-400 text-sm font-semibold">
          <span>⏰</span>
          <span>Oferta encerra em: <span className="font-mono font-black">{h}:{m}:{s}</span></span>
        </div>
      </section>

      {/* ── GARANTIA ─────────────────────────────────────────────── */}
      <section className="px-5 py-10 max-w-2xl mx-auto">
        <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 text-center">
          <Shield className="h-14 w-14 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-3">Garantia de 7 dias</h2>
          <p className="text-white/60 leading-relaxed text-sm">
            Experimente o Optimio por 7 dias completos. Se por qualquer motivo não gostar,
            devolvemos 100% do seu dinheiro. <strong className="text-white">Sem perguntas. Sem burocracia.</strong>
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="px-5 py-10 max-w-2xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-black text-center mb-8">Perguntas frequentes</h2>
        <div className="space-y-3">
          {faq.map(({ q, a }, i) => (
            <div key={i} className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.03]">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <span className="font-semibold text-sm text-white/90">{q}</span>
                {openFaq === i ? <ChevronUp className="h-4 w-4 text-white/40 shrink-0" /> : <ChevronDown className="h-4 w-4 text-white/40 shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-white/60 leading-relaxed border-t border-white/10 pt-3">{a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────── */}
      <section className="px-5 py-16 max-w-2xl mx-auto text-center">
        <div className="bg-gradient-to-b from-orange-500/10 to-transparent border border-orange-500/20 rounded-3xl p-10">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Seu negócio merece<br />
            <span className="text-orange-400">gestão profissional.</span>
          </h2>
          <p className="text-white/60 mb-8">Comece hoje. Em minutos você já tem tudo configurado.</p>
          <a href={ctaUrl} target="_blank" rel="noopener noreferrer">
            <button className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-black text-xl px-12 py-5 rounded-2xl shadow-[0_0_50px_rgba(249,115,22,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_80px_rgba(249,115,22,0.6)]">
              QUERO O OPTIMIO AGORA <ArrowRight className="h-6 w-6" />
            </button>
          </a>
          <div className="mt-5 flex flex-wrap justify-center gap-4 text-xs text-white/40">
            <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Pagamento seguro</span>
            <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Garantia 7 dias</span>
            <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Acesso imediato</span>
            <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Cancele quando quiser</span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 px-5 py-8 text-center text-xs text-white/30">
        <Logo />
        <p className="mt-4">© {new Date().getFullYear()} Optimio. Todos os direitos reservados.</p>
        <div className="mt-3 flex justify-center gap-4">
          <Link to="/termos" className="hover:text-white/60 transition">Termos de uso</Link>
          <Link to="/privacidade" className="hover:text-white/60 transition">Privacidade</Link>
          <Link to="/reembolso" className="hover:text-white/60 transition">Reembolso</Link>
          <Link to="/auth" className="hover:text-white/60 transition">Entrar</Link>
        </div>
      </footer>
    </div>
  );
}
