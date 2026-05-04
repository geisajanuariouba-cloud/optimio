import { ModulePage } from "@/components/app/ModulePage";
import { Wallet } from "lucide-react";
export default function Financial() {
  return <ModulePage title="Financeiro" description="Entradas, saídas, taxas (snapshot) e promissórias." icon={Wallet} actionLabel="Lançamento"
    metrics={[
      { label: "Receita (mês)", value: "R$ 24.870" },
      { label: "Despesas", value: "R$ 8.420" },
      { label: "Lucro líquido", value: "R$ 16.450" },
      { label: "Promissórias", value: "R$ 1.230", hint: "em aberto" },
    ]} />;
}
