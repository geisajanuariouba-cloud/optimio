import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function PageHeader({ title, description, actionLabel, onAction, children }: {
  title: string; description: string; actionLabel?: string; onAction?: () => void; children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        {children}
        {actionLabel && onAction && (
          <Button onClick={onAction} className="rounded-2xl h-11 px-5 bg-primary text-primary-foreground gap-2">
            <Plus className="h-4 w-4" /> {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

export function MetricsRow({ items }: { items: { label: string; value: string; hint?: string }[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {items.map((m) => (
        <div key={m.label} className="p-5 rounded-3xl bg-card border-0 shadow-sm">
          <div className="text-xs text-muted-foreground mb-1">{m.label}</div>
          <div className="text-2xl font-bold">{m.value}</div>
          {m.hint && <div className="text-xs text-muted-foreground mt-1">{m.hint}</div>}
        </div>
      ))}
    </div>
  );
}
