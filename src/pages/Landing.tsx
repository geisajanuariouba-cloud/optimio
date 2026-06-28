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

function CountdownDisplay({ h, m, s, dark }: { h: string; m: string; s: string; dark?: boolean }) {
  const boxCls = dark
    ? "bg-black/20 text-white rounded-lg px-3 py-1.5 font-mono font-black text-2xl leading-none min-w-[52px] text-center"
    : "bg-orange-600 text-white rounded-lg px-3 py-1.5 font-mono font-black text-2xl leading-none min-w-[52px] text-center shadow";
  const labelCls = dark ? "text-white/60 text-[10px] text-center mt-1" : "text-orange-600 text-[10px] text-center mt-1 font-semibold";
  return (
    <div className="flex items-start gap-1.5">
      <div><div className={boxCls}>{h}</div><div className={labelCls}>HORAS</div></div>
      <div className={`font-black text-xl mt-1 ${dark ? "text-white/60" : "text-orange-400"}`}>:</div>
      <div><div className={boxCls}>{m}</div><div className={labelCls}>MIN</div></div>
      <div className={`font-black text-xl mt-1 ${dark ? "text-white/60" : "text-orange-400"}`}>:</div>
      <div><div className={boxCls}>{s}</div><div className={labelCls}>SEG</div></div>
    </div>
  );
}

// ── Dados ──────────────────────────────────────────────────────────────────
const faq: { q: string; a: string }[] = [
  { q: "Preciso instalar alguma coisa?", a: "Não. O Optimio é 100% online. Acesse pelo computador, celular ou tablet, basta um navegador e internet." },
  { q: "Serve para qualquer tipo de negócio?", a: "Sim. Salão de beleza, loja de roupas, pet shop, clínica, estúdio, loja de móveis, consultório. O sistema se adapta ao seu nicho automaticamente." },
  { q: "Posso cancelar quando quiser?", a: "Sim, sem fidelidade. No plano mensal você cancela a qualquer momento pelo painel. No trimestral, o acesso segue até o final do período pago." },
  { q: "E se eu não souber usar o sistema?", a: "O Optimio foi feito para ser simples. Mas caso precise, nosso suporte via WhatsApp está disponível para te ajudar no que precisar." },
  { q: "Meus dados ficam seguros?", a: "Seus dados ficam armazenados em servidores seguros com criptografia. Nenhum terceiro tem acesso às suas informações." },
  { q: "Posso trocar de mensal para trimestral?", a: "Sim. Você pode migrar de plano a qualquer momento pelo painel de configurações." },
];

const depoimentos = [
  { nome: "Carla Menezes", cidade: "Belo Horizonte, MG", negocio: "Salão de Beleza", texto: "Antes eu anotava tudo no caderno e no WhatsApp. Perdi clientes, perdi dinheiro. Com o Optimio meu caixa fecha certinho todo mês." },
  { nome: "Rafael Souza", cidade: "São Paulo, SP", negocio: "Loja de Móveis Planejados", texto: "Minhas ordens de produção ficavam espalhadas. Hoje consigo acompanhar cada pedido, estoque e fornecedor em um único lugar. Economizei horas por semana." },
  { nome: "Patrícia Lima", cidade: "Goiânia, GO", negocio: "Clínica Estética", texto: "Fiz 3 meses no plano trimestral e já paguei o investimento só com os agendamentos que eu deixava escapar antes. Vale muito." },
  { nome: "Marcos Andrade", cidade: "Curitiba, PR", negocio: "Pet Shop", texto: "A parte financeira era um caos total. Agora eu vejo receita, despesas e lucro real em tempo real. Finalmente sei se estou ganhando ou perdendo." },
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
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ── BARRA DE URGÊNCIA ──────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 py-3 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 text-white">
          <span className="text-sm font-bold tracking-wide">⚡ OFERTA ESPECIAL encerra em:</span>
          <CountdownDisplay h={h} m={m} s={s} dark />
          <span className="text-sm font-semibold opacity-90">Aproveite antes que o preço suba!</span>
        </div>
      </div>

      {/* ── NAV ───────────────────────────────────────────────────── */}
      <nav className="px-5 py-4 flex items-center justify-between max-w-6xl mx-auto border-b border-gray-100">
        <Logo />
        <Link to="/auth">
          <button className="text-sm text-gray-500 hover:text-gray-800 transition border border-gray-300 hover:border-gray-400 px-4 py-2 rounded-xl">
            Já tenho conta
          </button>
        </Link>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="px-5 pt-12 pb-16 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-600 text-xs font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest">
          <Zap className="h-3.5 w-3.5" /> Sistema de Gestão para Pequenas Empresas
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.08] mb-6 text-gray-900">
          Chega de perder dinheiro<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
            por falta de controle.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-4 leading-relaxed">
          O <strong className="text-gray-900">Optimio</strong> organiza seu negócio inteiro — clientes, vendas, estoque,
          financeiro e produção — em um único painel simples e poderoso.
        </p>
        <p className="text-base text-gray-400 mb-10">
          Sem planilha. Sem caderno. Sem caos.
        </p>

        <a href="#planos">
          <button className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold text-lg px-10 py-4 rounded-2xl shadow-lg shadow-orange-200 transition-all hover:scale-105">
            QUERO ORGANIZAR MEU NEGÓCIO <ArrowRight className="h-5 w-5" />
          </button>
        </a>
        <p className="text-xs text-gray-400 mt-3">Acesso imediato · Sem fidelidade · Cancele quando quiser</p>
      </section>

      {/* ── NÚMEROS SOCIAIS ───────────────────────────────────────── */}
      <div className="border-y border-gray-100 bg-gray-50 py-8 px-5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { n: "+1.200", l: "empresas usam o Optimio" },
            { n: "4.9★", l: "avaliação média dos usuários" },
            { n: "R$0", l: "taxa de instalação" },
            { n: "24h", l: "suporte via WhatsApp" },
          ].map(({ n, l }) => (
            <div key={l}>
              <div className="text-2xl md:text-3xl font-black text-orange-500">{n}</div>
              <div className="text-xs text-gray-500 mt-1">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── O PROBLEMA ────────────────────────────────────────────── */}
      <section className="px-5 py-16 max-w-3xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 md:p-10">
          <h2 className="text-2xl md:text-3xl font-black text-center mb-8 text-rose-700">
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
                <X className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <span className="text-gray-700">{t}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 p-4 bg-rose-100 border border-rose-200 rounded-2xl text-center text-rose-700 font-semibold text-sm">
            A maioria das pequenas empresas fecha em até 5 anos. A causa número 1 é a falta de controle financeiro e operacional.
          </div>
        </div>
      </section>

      {/* ── O QUE É O OPTIMIO ────────────────────────────────────── */}
      <section className="px-5 py-10 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-black mb-4 text-gray-900">
          O Optimio resolve tudo isso
          <br /><span className="text-orange-500">de uma vez só.</span>
        </h2>
        <p className="text-gray-500 text-lg mb-12">Um sistema completo para quem quer crescer sem perder o controle.</p>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { icon: "📅", t: "Agenda & Clientes", d: "Histórico completo, agendamentos e CRM em um único lugar." },
            { icon: "💰", t: "Financeiro Real", d: "Controle de entradas, saídas, despesas fixas e lucro líquido." },
            { icon: "📦", t: "Estoque & Produtos", d: "Alertas de mínimo, movimentação automática e custo por variação." },
            { icon: "🏭", t: "Produção & Receitas", d: "Ordens de produção, fichas técnicas e baixa automática de matéria-prima." },
            { icon: "🛒", t: "Vendas & Orçamentos", d: "Do orçamento à venda em um clique, com histórico e relatórios." },
            { icon: "📊", t: "Dashboard & BI", d: "Veja receita, ticket médio, crescimento e previsões em tempo real." },
          ].map(({ icon, t, d }) => (
            <div key={t} className="bg-white border border-gray-200 rounded-2xl p-5 text-left hover:border-orange-300 hover:shadow-md hover:shadow-orange-50 transition-all">
              <div className="text-3xl mb-3">{icon}</div>
              <div className="font-bold mb-1 text-gray-900">{t}</div>
              <div className="text-sm text-gray-500">{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMPARATIVO ──────────────────────────────────────────── */}
      <section className="px-5 py-12 max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-black text-center mb-8 text-gray-900">Antes × Depois do Optimio</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
            <h3 className="font-bold text-rose-600 mb-4 text-center">Sem o Optimio</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              {["Caderno, planilha e WhatsApp misturados", "Caixa no vermelho sem saber por que", "Cliente some e você não percebe", "Estoque acabando na hora errada", "Horas fechando planilha no fim do mês", "Decisão no escuro, na intuição"].map(t => (
                <li key={t} className="flex gap-2"><X className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />{t}</li>
              ))}
            </ul>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
            <h3 className="font-bold text-emerald-700 mb-4 text-center">Com o Optimio</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              {["Tudo centralizado em um único painel", "Lucro real visível todo dia", "CRM com histórico e alertas de retorno", "Estoque com alerta automático de mínimo", "Relatórios em 1 clique, sem planilha", "Decisão com dados, não com chute"].map(t => (
                <li key={t} className="flex gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ──────────────────────────────────────────── */}
      <section className="px-5 py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-center mb-2 text-gray-900">O que dizem quem já usa</h2>
          <p className="text-center text-gray-400 mb-10 text-sm">Resultados reais de pequenos negócios como o seu.</p>
          <div className="grid sm:grid-cols-2 gap-5">
            {depoimentos.map(({ nome, cidade, negocio, texto }) => (
              <div key={nome} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex text-amber-400 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400" />)}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">"{texto}"</p>
                <div>
                  <div className="font-bold text-sm text-gray-900">{nome}</div>
                  <div className="text-xs text-gray-400">{negocio} · {cidade}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANOS / PRICING ─────────────────────────────────────── */}
      <section id="planos" className="px-5 py-16 max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-600 text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest">
          ⚡ Oferta por tempo limitado
        </div>
        <h2 className="text-3xl md:text-4xl font-black mb-2 text-gray-900">Um plano. Tudo incluso.</h2>
        <p className="text-gray-500 mb-8">Escolha como prefere pagar:</p>

        {/* Toggle ciclo */}
        <div className="inline-flex bg-gray-100 border border-gray-200 rounded-2xl p-1 mb-8">
          <button
            onClick={() => setCiclo("mensal")}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${ciclo === "mensal" ? "bg-orange-500 text-white shadow" : "text-gray-500 hover:text-gray-800"}`}
          >
            Mensal
          </button>
          <button
            onClick={() => setCiclo("trimestral")}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all relative ${ciclo === "trimestral" ? "bg-orange-500 text-white shadow" : "text-gray-500 hover:text-gray-800"}`}
          >
            Trimestral
            <span className="absolute -top-2.5 -right-2 bg-emerald-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">-40%</span>
          </button>
        </div>

        {/* Card preço */}
        <div className="bg-white border-2 border-orange-400 rounded-3xl p-8 relative overflow-hidden shadow-xl shadow-orange-100">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-500 to-amber-400" />
          <div className="absolute top-4 right-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black px-3 py-1 rounded-full">
            MAIS POPULAR
          </div>

          {ciclo === "mensal" ? (
            <div className="mb-6">
              <div className="text-gray-400 text-sm line-through mb-1">De R$89,90/mês</div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-black text-gray-900">R$37</span>
                <span className="text-2xl font-black text-orange-500">,90</span>
                <span className="text-gray-400 text-sm">/mês</span>
              </div>
              <div className="text-emerald-600 text-sm font-semibold mt-1">Você economiza R$52,00/mês vs preço cheio</div>
            </div>
          ) : (
            <div className="mb-6">
              <div className="text-gray-400 text-sm line-through mb-1">De R$113,70 (3x mensal)</div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-black text-gray-900">R$67</span>
                <span className="text-2xl font-black text-orange-500">,90</span>
                <span className="text-gray-400 text-sm">/trimestre</span>
              </div>
              <div className="text-gray-500 text-sm mt-1">R$22,63/mês · 3 meses de acesso</div>
              <div className="text-emerald-600 text-sm font-semibold">Você economiza R$45,80 vs plano mensal</div>
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
                <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-emerald-600" />
                </div>
                <span className="text-sm text-gray-700">{t}</span>
              </div>
            ))}
          </div>

          <a href={ctaUrl} target="_blank" rel="noopener noreferrer">
            <button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-orange-200 transition-all hover:scale-[1.02]">
              QUERO ACESSAR AGORA
            </button>
          </a>
          <p className="text-xs text-gray-400 mt-3">Pagamento 100% seguro · Acesso imediato após confirmação</p>
        </div>

        {/* Countdown abaixo do card */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <p className="text-sm font-semibold text-gray-600">Oferta encerra em:</p>
          <CountdownDisplay h={h} m={m} s={s} />
        </div>
      </section>

      {/* ── GARANTIA ─────────────────────────────────────────────── */}
      <section className="px-5 py-10 max-w-2xl mx-auto">
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center">
          <Shield className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-3 text-gray-900">Garantia de 7 dias</h2>
          <p className="text-gray-600 leading-relaxed text-sm">
            Experimente o Optimio por 7 dias completos. Se por qualquer motivo não gostar,
            devolvemos 100% do seu dinheiro. <strong className="text-gray-900">Sem perguntas. Sem burocracia.</strong>
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="px-5 py-10 max-w-2xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-black text-center mb-8 text-gray-900">Perguntas frequentes</h2>
        <div className="space-y-3">
          {faq.map(({ q, a }, i) => (
            <div key={i} className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50 transition"
              >
                <span className="font-semibold text-sm text-gray-800">{q}</span>
                {openFaq === i ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-3">{a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────── */}
      <section className="px-5 py-16 max-w-2xl mx-auto text-center">
        <div className="bg-gradient-to-b from-orange-50 to-white border border-orange-200 rounded-3xl p-10">
          <h2 className="text-3xl md:text-4xl font-black mb-4 text-gray-900">
            Seu negócio merece<br />
            <span className="text-orange-500">gestão profissional.</span>
          </h2>
          <p className="text-gray-500 mb-8">Comece hoje. Em minutos você já tem tudo configurado.</p>
          <a href={ctaUrl} target="_blank" rel="noopener noreferrer">
            <button className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-black text-xl px-12 py-5 rounded-2xl shadow-xl shadow-orange-200 transition-all hover:scale-105">
              QUERO O OPTIMIO AGORA <ArrowRight className="h-6 w-6" />
            </button>
          </a>
          <div className="mt-5 flex flex-wrap justify-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Pagamento seguro</span>
            <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Garantia 7 dias</span>
            <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Acesso imediato</span>
            <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Cancele quando quiser</span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 px-5 py-8 text-center text-xs text-gray-400 bg-gray-50">
        <Logo />
        <p className="mt-4">© {new Date().getFullYear()} Optimio. Todos os direitos reservados.</p>
        <div className="mt-3 flex justify-center gap-4">
          <Link to="/termos" className="hover:text-gray-600 transition">Termos de uso</Link>
          <Link to="/privacidade" className="hover:text-gray-600 transition">Privacidade</Link>
          <Link to="/reembolso" className="hover:text-gray-600 transition">Reembolso</Link>
          <Link to="/auth" className="hover:text-gray-600 transition">Entrar</Link>
        </div>
      </footer>
    </div>
  );
}
