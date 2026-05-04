import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [plan, setPlan] = useState("basic");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (data) { setCompanyName(data.company_name ?? ""); setFullName(data.full_name ?? ""); setPlan(data.plan); }
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ company_name: companyName, full_name: fullName }).eq("id", user.id);
    setLoading(false);
    if (error) toast.error(error.message); else toast.success("Configurações salvas!");
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold mb-1">Configurações</h1>
        <p className="text-muted-foreground">Personalize sua conta, propriedades e plano.</p>
      </div>

      <Card className="p-6 rounded-3xl border-0 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Empresa</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Nome completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-secondary/50 border-0 h-11" />
          </div>
          <div>
            <Label>Nome da empresa (substitui "Studio")</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="bg-secondary/50 border-0 h-11" />
          </div>
        </div>
        <Button onClick={save} disabled={loading} className="rounded-2xl">{loading ? "Salvando…" : "Salvar"}</Button>
      </Card>

      <Card className="p-6 rounded-3xl border-0 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Plano atual</h2>
        <div className="flex items-center gap-3">
          <Badge className="text-sm capitalize">{plan}</Badge>
          <span className="text-sm text-muted-foreground">
            {plan === "basic" && "30 transações/mês"}
            {plan === "standard" && "100 transações/mês"}
            {plan === "unlimited" && "Transações ilimitadas"}
          </span>
        </div>
      </Card>
    </div>
  );
}
