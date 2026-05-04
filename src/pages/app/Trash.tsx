import { ModulePage } from "@/components/app/ModulePage";
import { Trash2 } from "lucide-react";
export default function Trash() {
  return <ModulePage title="Lixeira" description="Restauração com 1 clique. Limpeza automática após 30 dias." icon={Trash2} actionLabel="Limpar tudo" />;
}
