import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: {
  icon: LucideIcon; title: string; description: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <div className="text-center py-16">
      <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="rounded-2xl">+ {actionLabel}</Button>
      )}
    </div>
  );
}
