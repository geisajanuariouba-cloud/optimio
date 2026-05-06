import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type Kind = "income" | "expense" | "product";

export function CategorySelect({ kind, value, onChange, allowCreate = true, placeholder }: {
  kind: Kind;
  value: string;
  onChange: (v: string) => void;
  allowCreate?: boolean;
  placeholder?: string;
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<{ id: string; name: string }[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("categories").select("id,name").eq("kind", kind).order("name");
    setItems((data ?? []) as any);
  };
  useEffect(() => { load(); }, [user, kind]);

  const create = async () => {
    if (!user || !newName.trim()) return;
    const { error } = await supabase.from("categories").insert({ user_id: user.id, kind, name: newName.trim() });
    if (error) return toast.error(error.message);
    setNewName(""); setAdding(false);
    await load();
    onChange(newName.trim());
  };

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder={placeholder ?? "Selecione uma categoria"} /></SelectTrigger>
        <SelectContent>
          {items.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
          {items.length === 0 && <div className="text-xs text-muted-foreground p-2">Nenhuma categoria. Cadastre em Configurações.</div>}
        </SelectContent>
      </Select>
      {allowCreate && (
        adding ? (
          <div className="flex gap-2">
            <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nova categoria" onKeyDown={(e) => e.key === "Enter" && create()} />
            <Button size="sm" onClick={create}>OK</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>X</Button>
          </div>
        ) : (
          <Button type="button" size="sm" variant="ghost" className="text-xs" onClick={() => setAdding(true)}>
            <Plus className="h-3 w-3 mr-1" />Nova categoria
          </Button>
        )
      )}
    </div>
  );
}
