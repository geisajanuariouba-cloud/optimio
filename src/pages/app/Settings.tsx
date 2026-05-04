import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { NICHES, NicheKey } from "@/lib/niches";
import { toast } from "sonner";
import { Settings as SettingsIcon, Palette, RefreshCw } from "lucide-react";

const COLORS = [
  { name: "Roxo", value: "271 91% 65%" },
  { name: "Ciano", value: "174 80% 55%" },
  { name: "Rosa", value: "322 70% 55%" },
  { name: "Azul", value: "220 90% 65%" },
  { name: "Verde", value: "142 71% 45%" },
  { name: "Laranja", value: "24 95% 58%" },
];

export default function Settings() {
  const { user } = useAuth();
  const { profile, refresh } = useTenant();
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [niche, setNiche] = useState<NicheKey>("beauty");
  const [primaryColor, setPrimaryColor] = useState("271 91% 65%");
  const [borderStyle, setBorderStyle] = useState("rounded");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setCompanyName(profile.company_name ?? "");
    setFullName(profile.full_name ?? "");
    setNiche((profile.niche as NicheKey) ?? "beauty");
    setPrimaryColor(profile.primary_color);
    setBorderStyle(profile.border_style);
  }, [profile]);

  const save = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({
      company_name: companyName, full_name: fullName,
      primary_color: primaryColor, border_style: borderStyle,
    }).eq("id", user.id);
    setLoading(false);
    if (error) toast.error(error.message); else { toast.success("Configurações salvas!"); refresh(); }
  };

  const resetNiche = async () => {
    if (!user) return;
    const n = NICHES[niche];
    const { error } = await supabase.from("profiles").update({
      niche, enabled_modules: n.modules, terms: n.terms,
    }).eq("id", user.id);
    if (error) toast.error(error.message); else { toast.success(`Nicho alterado para ${n.label}`); refresh(); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold mb-1">Configurações</h1>
        <p className="text-muted-foreground">Personalize empresa, nicho, design e plano.</p>
      </div>

      <Card className="p-6 rounded-3xl border-0 shadow-sm space-y-4">
        <div className="flex items-center gap-2"><SettingsIcon className="h-5 w-5 text-primary" /><h2 className="text-xl font-semibold">Empresa</h2></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Nome completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-secondary/50 border-0 h-11" /></div>
          <div><Label>Nome da empresa (whitelabel)</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="bg-secondary/50 border-0 h-11" /></div>
        </div>
        <Button onClick={save} disabled={loading} className="rounded-2xl">{loading ? "Salvando…" : "Salvar"}</Button>
      </Card>

      <Card className="p-6 rounded-3xl border-0 shadow-sm space-y-4">
        <div className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" /><h2 className="text-xl font-semibold">Aparência</h2></div>
        <div>
          <Label>Cor primária</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {COLORS.map(c => (
              <button key={c.value} onClick={() => setPrimaryColor(c.value)}
                className={`h-10 w-10 rounded-full border-2 ${primaryColor === c.value ? "border-foreground scale-110" : "border-transparent"}`}
                style={{ background: `hsl(${c.value})` }} title={c.name} />
            ))}
          </div>
        </div>
        <div>
          <Label>Estilo de borda</Label>
          <Select value={borderStyle} onValueChange={setBorderStyle}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="rounded">Arredondado</SelectItem><SelectItem value="sharp">Reto</SelectItem></SelectContent>
          </Select>
        </div>
        <Button onClick={save} className="rounded-2xl">Aplicar</Button>
      </Card>

      <Card className="p-6 rounded-3xl border-0 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div><h2 className="text-xl font-semibold">Nicho do negócio</h2><p className="text-sm text-muted-foreground">Atual: {NICHES[(profile?.niche as NicheKey) ?? "beauty"]?.label}</p></div>
          <Badge variant="outline">{profile?.enabled_modules?.length ?? 0} módulos</Badge>
        </div>
        <Select value={niche} onValueChange={(v) => setNiche(v as NicheKey)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{Object.values(NICHES).map(n => <SelectItem key={n.key} value={n.key}>{n.label}</SelectItem>)}</SelectContent>
        </Select>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="rounded-2xl"><RefreshCw className="h-4 w-4 mr-2" />Reiniciar nicho</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mudar de nicho?</AlertDialogTitle>
              <AlertDialogDescription>
                Mudar de nicho ocultará dados de módulos incompatíveis (ex.: Anamneses). Os dados não serão excluídos — apenas ocultos. Deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={resetNiche}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>

      <Card className="p-6 rounded-3xl border-0 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Plano atual</h2>
        <div className="flex items-center gap-3">
          <Badge className="text-sm capitalize">{profile?.plan}</Badge>
          <span className="text-sm text-muted-foreground">
            {profile?.plan === "basic" && "30 transações/mês"}
            {profile?.plan === "standard" && "100 transações/mês"}
            {profile?.plan === "unlimited" && "Transações ilimitadas"}
          </span>
        </div>
      </Card>
    </div>
  );
}
