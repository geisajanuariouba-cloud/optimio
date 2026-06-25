import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
}

export function ComingSoonModal({ open, onClose, title }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-3xl max-w-sm text-center">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl">{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mt-1 mb-2">
          Este módulo está em desenvolvimento e será lançado em breve. Fique de olho nas novidades!
        </p>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30">
          <Sparkles className="h-3 w-3" /> Em breve
        </span>
      </DialogContent>
    </Dialog>
  );
}
