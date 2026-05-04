import { ModulePage } from "@/components/app/ModulePage";
import { Package } from "lucide-react";
export default function Packages() {
  return <ModulePage title="Pacotes" description="4 sessões com IA de anamnese sugerindo tratamentos automaticamente." icon={Package} actionLabel="Pacote"
    metrics={[
      { label: "Em andamento", value: "27" },
      { label: "Concluídos (mês)", value: "14" },
      { label: "Faturamento", value: "R$ 12.4k" },
      { label: "Sessões hoje", value: "6" },
    ]} />;
}
