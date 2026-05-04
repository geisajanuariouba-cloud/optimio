import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface ModulePageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  metrics?: { label: string; value: string; hint?: string }[];
  children?: React.ReactNode;
  actionLabel?: string;
}

export function ModulePage({ title, description, icon: Icon, metrics = [], children, actionLabel = "Novo" }: ModulePageProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-1">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Button className="bg-primary text-primary-foreground rounded-2xl h-11 px-6">
          + {actionLabel}
        </Button>
      </div>

      {metrics.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <Card key={m.label} className="p-5 rounded-3xl border-0 shadow-sm">
              <div className="text-xs text-muted-foreground mb-1">{m.label}</div>
              <div className="text-2xl font-bold">{m.value}</div>
              {m.hint && <div className="text-xs text-muted-foreground mt-1">{m.hint}</div>}
            </Card>
          ))}
        </div>
      )}

      <Card className="p-12 rounded-3xl border-0 shadow-sm text-center">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Módulo em construção</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          A estrutura está pronta e o backend já está conectado. Continue a conversa para implementarmos as funcionalidades específicas deste módulo.
        </p>
        {children}
      </Card>
    </div>
  );
}
