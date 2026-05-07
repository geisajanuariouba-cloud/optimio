import { Link, useLocation, Navigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

const PAGES: Record<string, { title: string; body: JSX.Element }> = {
  termos: {
    title: "Termos de Uso",
    body: (
      <>
        <p>Bem-vindo ao Optimio. Ao criar uma conta e usar nossa plataforma, você concorda com estes Termos de Uso. Leia com atenção.</p>
        <h2>1. Sobre o serviço</h2>
        <p>O Optimio é um SaaS multi-tenant de gestão (agenda, CRM, financeiro, marketing, site builder e integrações) destinado a profissionais autônomos e pequenas/médias empresas.</p>
        <h2>2. Cadastro e aprovação</h2>
        <p>O cadastro exige dados verdadeiros (nome, e-mail e WhatsApp). Toda nova conta passa por análise antes da liberação. Reservamo-nos o direito de recusar ou bloquear contas que violem estes Termos.</p>
        <h2>3. Pagamento</h2>
        <p>Os planos são cobrados mensalmente, conforme valores informados em <Link to="/#plans" className="text-primary underline">/#plans</Link>. O não pagamento suspende o acesso.</p>
        <h2>4. Conduta</h2>
        <p>É proibido usar o Optimio para atividades ilícitas, enviar spam, violar direitos de terceiros ou tentar comprometer a segurança da plataforma.</p>
        <h2>5. Propriedade intelectual</h2>
        <p>O código, marca e identidade visual do Optimio são de propriedade exclusiva da plataforma. Os dados inseridos por você permanecem seus.</p>
        <h2>6. Limitação de responsabilidade</h2>
        <p>O serviço é fornecido "como está". Não nos responsabilizamos por perdas indiretas decorrentes do uso da plataforma.</p>
        <h2>7. Alterações</h2>
        <p>Estes termos podem ser atualizados. Mudanças relevantes serão comunicadas no painel.</p>
        <p className="text-sm text-muted-foreground mt-8">Última atualização: 07/05/2026.</p>
      </>
    ),
  },
  privacidade: {
    title: "Política de Privacidade",
    body: (
      <>
        <p>Esta Política descreve como o Optimio coleta, usa e protege seus dados pessoais, em conformidade com a LGPD.</p>
        <h2>1. Dados coletados</h2>
        <ul>
          <li>Nome, e-mail, WhatsApp e dados da empresa fornecidos no cadastro;</li>
          <li>Dados de uso da plataforma (logs, métricas);</li>
          <li>Dados que você inserir (clientes, agendamentos, financeiro), que ficam isolados em sua tenant.</li>
        </ul>
        <h2>2. Finalidade</h2>
        <p>Operar a plataforma, processar pagamentos, prestar suporte e cumprir obrigações legais.</p>
        <h2>3. Compartilhamento</h2>
        <p>Não vendemos seus dados. Compartilhamos apenas com provedores essenciais (hospedagem, processadores de pagamento) e quando exigido por lei.</p>
        <h2>4. Seus direitos</h2>
        <p>Você pode solicitar acesso, correção, exportação ou exclusão dos seus dados a qualquer momento via suporte.</p>
        <h2>5. Segurança</h2>
        <p>Usamos criptografia em trânsito e em repouso, controle de acesso por linha (RLS) e backups regulares.</p>
        <h2>6. Cookies</h2>
        <p>Usamos cookies essenciais para login e analíticos para melhorar a experiência.</p>
        <h2>7. Contato</h2>
        <p>Em caso de dúvidas: contato pelo WhatsApp oficial ou e-mail de suporte exibido no painel.</p>
        <p className="text-sm text-muted-foreground mt-8">Última atualização: 07/05/2026.</p>
      </>
    ),
  },
  reembolso: {
    title: "Política de Reembolso",
    body: (
      <>
        <p>Confira as regras para cancelamento e reembolso da assinatura do Optimio.</p>
        <h2>1. Período de teste</h2>
        <p>Novos clientes podem solicitar reembolso integral em até <strong>7 dias</strong> após a primeira cobrança, conforme o Código de Defesa do Consumidor.</p>
        <h2>2. Cancelamento</h2>
        <p>Você pode cancelar a qualquer momento. Não há multa nem fidelidade. O acesso permanece ativo até o fim do ciclo já pago.</p>
        <h2>3. Reembolso fora do prazo</h2>
        <p>Após 7 dias, não há reembolso retroativo de mensalidades já consumidas. Períodos não utilizados podem ser analisados caso a caso.</p>
        <h2>4. Como solicitar</h2>
        <p>Envie a solicitação via WhatsApp oficial do Optimio ou pela aba de Suporte no painel. O reembolso é processado em até <strong>10 dias úteis</strong> no mesmo método de pagamento.</p>
        <h2>5. Casos excepcionais</h2>
        <p>Cobranças duplicadas ou erros operacionais são reembolsados integralmente após verificação.</p>
        <p className="text-sm text-muted-foreground mt-8">Última atualização: 07/05/2026.</p>
      </>
    ),
  },
};

export default function Legal() {
  const slug = useLocation().pathname.replace("/", "");
  const page = slug ? PAGES[slug] : null;
  if (!page) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background bg-mesh">
      <nav className="px-6 lg:px-12 py-6 flex items-center justify-between border-b border-border/40">
        <Logo />
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao site
        </Link>
      </nav>
      <article className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        <h1 className="text-4xl font-bold mb-8">{page.title}</h1>
        <div className="prose prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-a:text-primary max-w-none space-y-4">
          {page.body}
        </div>
      </article>
      <footer className="border-t border-border/40 px-6 py-8 text-center text-xs text-muted-foreground">
        © 2026 Optimio · <Link to="/termos" className="hover:text-foreground">Termos</Link> · <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link> · <Link to="/reembolso" className="hover:text-foreground">Reembolso</Link>
      </footer>
    </div>
  );
}
