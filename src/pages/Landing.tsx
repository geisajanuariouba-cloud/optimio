import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import {
  Check, Star, Shield, Lock, ChevronDown, ChevronUp,
  ArrowRight, BarChart3, Package, Users, ShoppingCart,
  TrendingUp, Wrench, Menu, X as XIcon,
} from "lucide-react";

// ── Countdown ──────────────────────────────────────────────────────────────
function nextSundayMidnight() {
  const d = new Date();
  const days = (7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + days);
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
  return {
    h: String(Math.floor(ms / 3600000)).padStart(2, "0"),
    m: String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0"),
    s: String(Math.floor((ms % 60000) / 1000)).padStart(2, "0"),
  };
}

function TimeBox({ v, label }: { v: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-orange-500 text-white font-mono font-black text-xl sm:text-2xl rounded-xl px-4 py-2 min-w-[56px] text-center leading-none shadow-md">
        {v}
      </div>
      <span className="text-[10px] text-gray-400 font-semibold mt-1 tracking-widest uppercase">{label}</span>
    </div>
  );
}

// ── Mock dashboard widget ──────────────────────────────────────────────────
function DashboardMock() {
  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden select-none">
      {/* topbar */}
      <div className="bg-gray-900 px-5 py-3 flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-red-400" />
        <div className="h-3 w-3 rounded-full bg-yellow-400" />
        <div className="h-3 w-3 rounded-full bg-green-400" />
        <span className="ml-3 text-gray-400 text-xs font-mono">optimio.app/dashboard</span>
      </div>
      {/* content */}
      <div className="bg-gray-50 p-5">
        <p className="text-xs text-gray-400 mb-1">Bom dia, Geisa ☀️</p>
        <p className="text-sm font-bold text-gray-800 mb-4">Resumo de junho 2025</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Receita", val: "R$18.420", color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Despesas", val: "R$9.130", color: "text-rose-600", bg: "bg-rose-50" },
            { label: "Lucro", val: "R$9.290", color: "text-orange-600", bg: "bg-orange-50" },
          ].map(({ label, val, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-3 text-center`}>
              <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
              <p className={`text-sm font-black ${color}`}>{val}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-3">
          <p className="text-[11px] font-bold text-gray-600 mb-2">Últimas movimentações</p>
          {[
            { desc: "Venda #1042", val: "+R$890", color: "text-emerald-600" },
            { desc: "Fornecedor Tecidos SA", val: "-R$340", color: "text-rose-600" },
            { desc: "Assinatura software", val: "-R$67,90", color: "text-rose-600" },
            { desc: "Venda #1041", val: "+R$1.200", color: "text-emerald-600" },
          ].map(({ desc, val, color }) => (
            <div key={desc} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-[11px] text-gray-600">{desc}</span>
              <span className={`text-[11px] font-bold ${color}`}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Dados ──────────────────────────────────────────────────────────────────
const recursos = [
  { icon: <BarChart3 className="h-6 w-6" />, titulo: "Dashboard em tempo real", desc: "Receita, lucro, ticket médio e previsões atualizados a cada acesso. Tome decisões com dados, não com intuição." },
  { icon: <TrendingUp className="h-6 w-6" />, titulo: "Financeiro completo", desc: "Controle entradas, saídas, despesas fixas e variáveis. Saiba exatamente quanto sobra no fim do mês." },
  { icon: <Package className="h-6 w-6" />, titulo: "Estoque inteligente", desc: "Alertas automáticos de mínimo, movimentação por venda e custo unitário por variação de produto." },
  { icon: <Users className="h-6 w-6" />, titulo: "CRM e Clientes", desc: "Histórico completo de cada cliente, agendamentos, retorno automático e muito mais em um único lugar." },
  { icon: <ShoppingCart className="h-6 w-6" />, titulo: "Vendas e Orçamentos", desc: "Do orçamento à venda em um clique. Acompanhe cada negociação até o fechamento." },
  { icon: <Wrench className="h-6 w-6" />, titulo: "Produção e Receitas", desc: "Ordens de produção, fichas técnicas e baixa automática de matéria-prima integrada ao estoque." },
];

const comoFunciona = [
  {
    num: "01",
    titulo: "Crie sua conta",
    desc: "Em menos de 2 minutos você configura sua empresa, define seu nicho e já está pronto para usar.",
    items: ["Sem cartão de crédito para testar", "Configuração guiada por etapas", "Seu negócio configurado do seu jeito"],
  },
  {
    num: "02",
    titulo: "Cadastre produtos e clientes",
    desc: "Importe sua base existente ou cadastre do zero. O Optimio aprende com o seu negócio.",
    items: ["Importação em massa por planilha", "Categorias e variações ilimitadas", "Histórico completo de cada cliente"],
  },
  {
    num: "03",
    titulo: "Registre vendas e movimentações",
    desc: "Cada venda atualiza automaticamente o estoque, o financeiro e o histórico do cliente.",
    items: ["Baixa automática de estoque", "Lançamento financeiro instantâneo", "Orçamentos em um clique"],
  },
  {
    num: "04",
    titulo: "Acompanhe pelo dashboard",
    desc: "Veja o desempenho do seu negócio em tempo real, de qualquer dispositivo, a qualquer hora.",
    items: ["Acesso pelo celular, tablet ou computador", "Relatórios em PDF com um clique", "Alertas de mínimo de estoque"],
  },
  {
    num: "05",
    titulo: "Cresça com controle",
    desc: "Com dados precisos na mão, você identifica o que vende mais, o que gasta mais e onde lucrar mais.",
    items: ["Relatórios de desempenho por período", "Ranking de produtos mais vendidos", "Projeção de faturamento mensal"],
  },
];

const depoimentos = [
  { nome: "Carla Menezes", cargo: "Empresária", negocio: "Salão de Beleza", texto: "Antes eu anotava tudo no caderno. Perdi clientes, perdi dinheiro. Com o Optimio meu caixa fecha certinho todo mês e ainda sobra tempo pra focar nos clientes.", iniciais: "CM" },
  { nome: "Rafael Souza", cargo: "Proprietário", negocio: "Loja de Móveis Planejados", texto: "Minhas ordens de produção ficavam espalhadas. Hoje acompanho cada pedido, estoque e fornecedor em um único lugar. Economizei horas por semana.", iniciais: "RS" },
  { nome: "Patrícia Lima", cargo: "Empreendedora", negocio: "Clínica Estética", texto: "Fiz o trimestral e já paguei o investimento só com os agendamentos que eu deixava escapar antes. O sistema se pagou em menos de 2 semanas.", iniciais: "PL" },
];

const faq: { q: string; a: string }[] = [
  { q: "Preciso instalar alguma coisa?", a: "Não. O Optimio é 100% online. Acesse pelo computador, celular ou tablet, basta um navegador e internet." },
  { q: "Serve para qualquer tipo de negócio?", a: "Sim. Salão de beleza, loja de roupas, pet shop, clínica, estúdio, loja de móveis, consultório. O sistema se adapta ao seu nicho automaticamente." },
  { q: "Posso cancelar quando quiser?", a: "Sim, sem fidelidade. No plano mensal você cancela a qualquer momento pelo painel. No trimestral, o acesso segue até o final do período pago." },
  { q: "Meus dados ficam seguros?", a: "Seus dados ficam armazenados em servidores seguros com criptografia de ponta a ponta. Nenhum terceiro tem acesso às suas informações." },
  { q: "Posso migrar do mensal para o trimestral?", a: "Sim. Você pode migrar de plano a qualquer momento pelo painel de configurações da sua conta." },
  { q: "Tem período de teste gratuito?", a: "Sim. Você tem 7 dias de garantia. Se não gostar por qualquer motivo, devolvemos 100% do valor pago, sem perguntas." },
];

// ── Componente principal ───────────────────────────────────────────────────
export default function Landing() {
  const { h, m, s } = useCountdown();
  const [checkoutMensal, setCheckoutMensal] = useState("/auth");
  const [checkoutTrimestral, setCheckoutTrimestral] = useState("/auth");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [ciclo, setCiclo] = useState<"mensal" | "trimestral">("trimestral");
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    supabase.from("system_settings").select("key,value").eq("scope", "global")
      .in("key", ["checkout_mensal_url", "checkout_trimestral_url", "checkout_basic_url", "checkout_pro_url"])
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data ?? []).forEach((r: any) => { map[r.key] = typeof r.value === "string" ? r.value : (r.value?.value ?? ""); });
        if (map["checkout_mensal_url"] || map["checkout_basic_url"]) setCheckoutMensal(map["checkout_mensal_url"] || map["checkout_basic_url"]);
        if (map["checkout_trimestral_url"] || map["checkout_pro_url"]) setCheckoutTrimestral(map["checkout_trimestral_url"] || map["checkout_pro_url"]);
      });
  }, []);

  const ctaUrl = ciclo === "mensal" ? checkoutMensal : checkoutTrimestral;

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ── NAV FIXA ────────────────────────────────────────────── */}
      <nav ref={navRef} className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <Logo />
          {/* desktop links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-500 font-medium">
            {[["recursos", "Recursos"], ["como-funciona", "Como Funciona"], ["planos", "Planos"], ["depoimentos", "Depoimentos"]].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="hover:text-orange-500 transition">{label}</button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <button className="hidden sm:block text-sm text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-xl transition">
                Entrar
              </button>
            </Link>
            <a href="#planos">
              <button className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold px-5 py-2 rounded-xl transition shadow-sm shadow-orange-200">
                Começar agora
              </button>
            </a>
            <button className="md:hidden p-2" onClick={() => setMenuOpen(v => !v)}>
              {menuOpen ? <XIcon className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {/* mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-5 py-4 flex flex-col gap-4 text-sm font-medium text-gray-600">
            {[["recursos", "Recursos"], ["como-funciona", "Como Funciona"], ["planos", "Planos"], ["depoimentos", "Depoimentos"]].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-left hover:text-orange-500 transition">{label}</button>
            ))}
          </div>
        )}
      </nav>

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="pt-28 pb-20 px-5 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block bg-orange-50 border border-orange-200 text-orange-600 text-xs font-bold px-4 py-1.5 rounded-full mb-5 uppercase tracking-widest">
              Sistema ERP para pequenas empresas
            </span>
            <h1 className="text-4xl sm:text-5xl font-black leading-[1.1] mb-5 text-gray-900">
              Gerencie sua empresa de forma{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
                simples e inteligente.
              </span>
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              Esqueça as planilhas e os cadernos de anotação. O Optimio centraliza clientes, vendas, estoque e financeiro em um único painel, acessível de qualquer dispositivo.
            </p>
            <div className="flex flex-wrap gap-3 mb-6">
              <a href="#planos">
                <button className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold text-base px-7 py-3.5 rounded-2xl shadow-lg shadow-orange-100 transition hover:scale-105">
                  Testar agora <ArrowRight className="h-4 w-4" />
                </button>
              </a>
              <button onClick={() => scrollTo("planos")} className="inline-flex items-center gap-2 border border-gray-200 hover:border-orange-300 text-gray-600 hover:text-orange-600 font-semibold text-base px-7 py-3.5 rounded-2xl transition">
                Ver planos
              </button>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> 7 dias de garantia</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> Sem fidelidade</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> Acesso imediato</span>
            </div>
          </div>
          <div className="w-full">
            <DashboardMock />
          </div>
        </div>
      </section>

      {/* ── NÚMEROS ─────────────────────────────────────────────── */}
      <div className="bg-gray-50 border-y border-gray-100 py-10 px-5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { n: "+1.200", l: "empresas gerenciadas" },
            { n: "4.9★", l: "avaliação dos usuários" },
            { n: "6 módulos", l: "tudo em um só lugar" },
            { n: "7 dias", l: "garantia de reembolso" },
          ].map(({ n, l }) => (
            <div key={l}>
              <div className="text-2xl md:text-3xl font-black text-orange-500">{n}</div>
              <div className="text-xs text-gray-400 mt-1">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RECURSOS ─────────────────────────────────────────────── */}
      <section id="recursos" className="py-20 px-5 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Funcionalidades</span>
          <h2 className="text-3xl md:text-4xl font-black mt-2 text-gray-900">Tudo que sua empresa precisa</h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">Um sistema completo, sem precisar contratar 4 ferramentas diferentes.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {recursos.map(({ icon, titulo, desc }) => (
            <div key={titulo} className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-orange-300 hover:shadow-lg hover:shadow-orange-50 transition-all group">
              <div className="h-11 w-11 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4 group-hover:bg-orange-500 group-hover:text-white transition-all">
                {icon}
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{titulo}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMO FUNCIONA ────────────────────────────────────────── */}
      <section id="como-funciona" className="py-20 px-5 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Passo a passo</span>
            <h2 className="text-3xl md:text-4xl font-black mt-2 text-gray-900">Como o Optimio funciona</h2>
            <p className="text-gray-500 mt-3">Da configuração ao controle total, em minutos.</p>
          </div>
          <div className="space-y-8">
            {comoFunciona.map(({ num, titulo, desc, items }) => (
              <div key={num} className="bg-white border border-gray-200 rounded-3xl p-7 flex gap-6 items-start shadow-sm">
                <div className="text-4xl font-black text-orange-100 shrink-0 leading-none">{num}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{titulo}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-3">{desc}</p>
                  <ul className="space-y-1">
                    {items.map(it => (
                      <li key={it} className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />{it}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANOS ───────────────────────────────────────────────── */}
      <section id="planos" className="py-20 px-5 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Preços</span>
          <h2 className="text-3xl md:text-4xl font-black mt-2 text-gray-900">Um plano. Tudo incluso.</h2>
          <p className="text-gray-500 mt-3">Escolha a forma de pagamento que preferir.</p>
        </div>

        {/* Countdown */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <p className="text-sm font-semibold text-gray-500">Oferta especial encerra em:</p>
          <div className="flex items-start gap-3">
            <TimeBox v={h} label="Horas" />
            <span className="text-orange-400 font-black text-2xl mt-2">:</span>
            <TimeBox v={m} label="Min" />
            <span className="text-orange-400 font-black text-2xl mt-2">:</span>
            <TimeBox v={s} label="Seg" />
          </div>
        </div>

        {/* Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-gray-100 border border-gray-200 rounded-2xl p-1">
            <button
              onClick={() => setCiclo("mensal")}
              className={`px-7 py-2.5 rounded-xl text-sm font-semibold transition-all ${ciclo === "mensal" ? "bg-orange-500 text-white shadow" : "text-gray-500 hover:text-gray-800"}`}
            >
              Mensal
            </button>
            <button
              onClick={() => setCiclo("trimestral")}
              className={`px-7 py-2.5 rounded-xl text-sm font-semibold transition-all relative ${ciclo === "trimestral" ? "bg-orange-500 text-white shadow" : "text-gray-500 hover:text-gray-800"}`}
            >
              Trimestral
              <span className="absolute -top-2.5 -right-3 bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">-40%</span>
            </button>
          </div>
        </div>

        {/* Card */}
        <div className="max-w-md mx-auto bg-white border-2 border-orange-400 rounded-3xl overflow-hidden shadow-xl shadow-orange-100">
          <div className="h-1.5 bg-gradient-to-r from-orange-500 to-amber-400" />
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-0.5">Plano Optimio</p>
                <p className="text-sm text-gray-400">Acesso completo a todos os módulos</p>
              </div>
              <span className="bg-orange-500 text-white text-xs font-black px-3 py-1 rounded-full">MAIS POPULAR</span>
            </div>

            {ciclo === "mensal" ? (
              <div className="mb-6">
                <p className="text-gray-400 text-sm line-through mb-1">De R$89,90/mês</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-gray-900">R$37</span>
                  <span className="text-3xl font-black text-orange-500">,90</span>
                  <span className="text-gray-400 text-sm">/mês</span>
                </div>
                <p className="text-emerald-600 text-sm font-semibold mt-1">Economia de R$52,00 vs preço cheio</p>
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-gray-400 text-sm line-through mb-1">De R$113,70 (3x o mensal)</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-gray-900">R$67</span>
                  <span className="text-3xl font-black text-orange-500">,90</span>
                  <span className="text-gray-400 text-sm">/trimestre</span>
                </div>
                <p className="text-gray-400 text-sm mt-0.5">Equivale a R$22,63/mês por 3 meses</p>
                <p className="text-emerald-600 text-sm font-semibold">Economia de R$45,80 vs plano mensal</p>
              </div>
            )}

            <div className="space-y-2.5 mb-8">
              {[
                "Clientes, agenda e CRM completo",
                "Controle financeiro detalhado",
                "Estoque com alerta de mínimo",
                "Vendas e orçamentos em um clique",
                "Produção e fichas técnicas",
                "Dashboard e relatórios em tempo real",
                "Compras inteligentes",
                "Suporte via WhatsApp",
                "Acesso em qualquer dispositivo",
                "Atualizações gratuitas",
              ].map(t => (
                <div key={t} className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-emerald-600" />
                  </div>
                  <span className="text-sm text-gray-700">{t}</span>
                </div>
              ))}
            </div>

            <a href={ctaUrl} target="_blank" rel="noopener noreferrer" className="block">
              <button className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black text-lg py-4 rounded-2xl transition hover:scale-[1.02] shadow-lg shadow-orange-100">
                Começar agora
              </button>
            </a>
            <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
              <Lock className="h-3 w-3" /> Pagamento seguro · Acesso imediato
            </p>
          </div>
        </div>

        {/* O que está incluso */}
        <div className="mt-10 bg-gray-50 border border-gray-200 rounded-3xl p-7 max-w-md mx-auto">
          <p className="font-bold text-sm text-gray-700 text-center mb-4">Incluso em todos os planos</p>
          <div className="grid grid-cols-2 gap-2">
            {["Sem taxa de instalação", "Cancele quando quiser", "Atualizações automáticas", "Suporte humano", "Backup diário dos dados", "SSL e criptografia", "Multi-dispositivo", "Histórico ilimitado"].map(t => (
              <div key={t} className="flex items-center gap-2 text-xs text-gray-600">
                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />{t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GARANTIA ─────────────────────────────────────────────── */}
      <div className="px-5 pb-10 max-w-md mx-auto text-center">
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-7">
          <Shield className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-black text-gray-900 mb-2">Garantia incondicional de 7 dias</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Experimente por 7 dias. Se por qualquer motivo não gostar, devolvemos 100% do seu dinheiro. Sem perguntas, sem burocracia.
          </p>
        </div>
      </div>

      {/* ── DEPOIMENTOS ──────────────────────────────────────────── */}
      <section id="depoimentos" className="py-20 px-5 bg-gray-50 border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Depoimentos</span>
            <h2 className="text-3xl md:text-4xl font-black mt-2 text-gray-900">Quem usa, recomenda</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {depoimentos.map(({ nome, cargo, negocio, texto, iniciais }) => (
              <div key={nome} className="bg-white border border-gray-200 rounded-3xl p-7 shadow-sm">
                <div className="flex text-amber-400 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400" />)}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-5">"{texto}"</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-600 font-black text-sm flex items-center justify-center shrink-0">
                    {iniciais}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">{nome}</p>
                    <p className="text-xs text-gray-400">{cargo} · {negocio}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="py-20 px-5 max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Dúvidas</span>
          <h2 className="text-3xl md:text-4xl font-black mt-2 text-gray-900">Perguntas frequentes</h2>
        </div>
        <div className="space-y-3">
          {faq.map(({ q, a }, i) => (
            <div key={i} className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-gray-50 transition"
              >
                <span className="font-semibold text-sm text-gray-800">{q}</span>
                {openFaq === i ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-3">{a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────── */}
      <section className="px-5 py-16 bg-gradient-to-br from-orange-500 to-amber-500">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Pronto para ter controle total do seu negócio?
          </h2>
          <p className="text-orange-100 mb-8 text-lg">Comece agora e veja a diferença em menos de uma semana.</p>
          <a href={ctaUrl} target="_blank" rel="noopener noreferrer">
            <button className="inline-flex items-center gap-2 bg-white text-orange-600 hover:bg-orange-50 font-black text-xl px-12 py-5 rounded-2xl shadow-xl transition hover:scale-105">
              Começar agora <ArrowRight className="h-6 w-6" />
            </button>
          </a>
          <div className="mt-5 flex flex-wrap justify-center gap-5 text-sm text-orange-100">
            <span className="flex items-center gap-1.5"><Lock className="h-4 w-4" /> Pagamento seguro</span>
            <span className="flex items-center gap-1.5"><Shield className="h-4 w-4" /> Garantia 7 dias</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> Acesso imediato</span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 px-5 py-14">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <Logo />
            <p className="text-sm mt-3 leading-relaxed">Sistema ERP simples e completo para pequenas e médias empresas.</p>
          </div>
          <div>
            <p className="text-white font-bold text-sm mb-4">Produto</p>
            <ul className="space-y-2 text-sm">
              {[["recursos", "Recursos"], ["como-funciona", "Como Funciona"], ["planos", "Planos"]].map(([id, label]) => (
                <li key={id}><button onClick={() => scrollTo(id)} className="hover:text-white transition">{label}</button></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-white font-bold text-sm mb-4">Suporte</p>
            <ul className="space-y-2 text-sm">
              {["Central de Ajuda", "WhatsApp", "Contato"].map(t => (
                <li key={t}><span className="hover:text-white transition cursor-pointer">{t}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-white font-bold text-sm mb-4">Legal</p>
            <ul className="space-y-2 text-sm">
              {[["termos", "Termos de Uso"], ["privacidade", "Privacidade"], ["reembolso", "Política de Reembolso"]].map(([to, label]) => (
                <li key={to}><Link to={`/${to}`} className="hover:text-white transition">{label}</Link></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span>© {new Date().getFullYear()} Optimio. Todos os direitos reservados.</span>
          <Link to="/auth" className="hover:text-white transition">Acessar minha conta</Link>
        </div>
      </footer>
    </div>
  );
}
