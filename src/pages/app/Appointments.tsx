import { ModulePage } from "@/components/app/ModulePage";
import { Calendar } from "lucide-react";
export default function Appointments() {
  return <ModulePage title="Agenda" description="Calendário inteligente, fila de vendas e venda rápida (balcão)." icon={Calendar} actionLabel="Agendamento"
    metrics={[
      { label: "Agendamentos hoje", value: "12", hint: "9 confirmados" },
      { label: "Taxa de ocupação", value: "78%", hint: "média semanal" },
      { label: "Sem agendamento", value: "4", hint: "esta semana" },
      { label: "Ticket médio", value: "R$ 187" },
    ]} />;
}
