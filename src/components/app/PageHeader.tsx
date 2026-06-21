import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function PageHeader({ title, description, actionLabel, onAction, children }: {
  title: string; description: string; actionLabel?: string; onAction?: () => void; children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1">{title}</h1>
        <p className="text-muted-foreground text-sm md:text-base">{description}</p>
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

export function MetricsRow({ items }: { items: { label: string; value: string; hint?: string; tone?: "primary" | "success" | "warning" | "danger" }[] }) {
  const toneClass = (tone?: string) => {
    if (tone === "success") return "text-emerald-500";
    if (tone === "warning") return "text-amber-500";
    if (tone === "danger") return "text-rose-500";
    return "text-primary";
  };
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
      {items.map((m) => (
        <div key={m.label} className="p-4 md:p-5 rounded-3xl bg-card border border-border/50 shadow-sm">
          <div className="text-[11px] md:text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">{m.label}</div>
          <div className={`text-2xl md:text-3xl font-extrabold tracking-tight ${toneClass(m.tone)}`}>{m.value}</div>
          {m.hint && <div className="text-[11px] md:text-xs text-muted-foreground mt-1">{m.hint}</div>}
        </div>
      ))}
    </div>
  );
}
