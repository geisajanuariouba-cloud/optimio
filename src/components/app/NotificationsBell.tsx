import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, AlertTriangle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isComingSoon } from "@/lib/comingSoon";

type Alert = { id: string; title: string; severity: string | null; created_at: string };

const ALERTS_COMING_SOON = isComingSoon("/app/alerts");

export function NotificationsBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user || ALERTS_COMING_SOON) return;
    const { data } = await supabase
      .from("alerts")
      .select("id,title,severity,created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(8);
    setItems((data ?? []) as Alert[]);
  };

  useEffect(() => { load(); }, [user]);
  useEffect(() => { if (open) load(); }, [open]);

  const count = items.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-secondary/60 relative" aria-label="Notificações">
          <Bell className="h-[18px] w-[18px]" />
          {count > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <div className="text-sm font-semibold">Notificações</div>
          {!ALERTS_COMING_SOON && (
            <Link to="/app/alerts" onClick={() => setOpen(false)} className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
              Ver todas <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>
        <div className="max-h-80 overflow-auto">
          {items.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">Sem alertas abertos.</div>
          ) : items.map(a => (
            <Link
              key={a.id}
              to={ALERTS_COMING_SOON ? "/app" : "/app/alerts"}
              onClick={() => setOpen(false)}
              className="flex items-start gap-3 px-4 py-3 border-b border-border/40 hover:bg-secondary/60 transition"
            >
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                a.severity === "high" ? "bg-red-500/15 text-red-500" :
                a.severity === "medium" ? "bg-amber-500/15 text-amber-500" :
                "bg-muted text-muted-foreground"
              }`}>
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{a.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(a.created_at).toLocaleString("pt-BR")}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationsBell;
