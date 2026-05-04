import { ModulePage } from "@/components/app/ModulePage";
import { Boxes } from "lucide-react";
export default function Products() {
  return <ModulePage title="Produtos & Estoque" description="Central unificada — produtos, ingredientes (sobras) e produção." icon={Boxes} actionLabel="Produto"
    metrics={[
      { label: "Produtos cadastrados", value: "48" },
      { label: "Estoque baixo", value: "3", hint: "abaixo do mínimo" },
      { label: "Vendas (mês)", value: "R$ 4.8k" },
      { label: "Margem média", value: "62%" },
    ]} />;
}
