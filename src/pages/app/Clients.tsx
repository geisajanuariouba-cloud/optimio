import { ModulePage } from "@/components/app/ModulePage";
import { Users } from "lucide-react";
export default function Clients() {
  return <ModulePage title="Clientes" description="CRM premium com anamnese integrada e métricas individuais." icon={Users} actionLabel="Cliente"
    metrics={[
      { label: "Total de clientes", value: "184" },
      { label: "Ativas (30d)", value: "127" },
      { label: "LTV médio", value: "R$ 1.240" },
      { label: "Frequência", value: "2,3/mês" },
    ]} />;
}
