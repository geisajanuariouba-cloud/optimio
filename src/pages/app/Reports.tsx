import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useModuleVisibility } from "@/hooks/useModuleVisibility";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/app/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Download } from "lucide-react";
import { toast } from "sonner";

type ReportKind = "sales" | "financial" | "stock" | "clients" | "products" | "expenses";

const KIND_LABEL: Record<ReportKind, string> = {
  sales: "Vendas",
  financial: "Financeiro",
  stock: "Estoque",
  clients: "Clientes",
  products: "Produtos",
  expenses: "Despesas",
};

function toCSV(rows: any[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const head = cols.join(",");
  const body = rows.map(r =>
    cols.map(c => {
      const v = r[c];
      if (v == null) return "";
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")
  ).join("\n");
  return head + "\n" + body;
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Cada tipo de relatório pertence a um módulo; só aparece se o módulo estiver visível.
const KIND_MODULE: Record<ReportKind, string> = {
  sales: "financial",
  financial: "financial",
  expenses: "financial",
  stock: "products",
  products: "products",
  clients: "clients",
};

export default function Reports() {
  const { user } = useAuth();
  const { isModuleVisible } = useModuleVisibility();
  const availableKinds = useMemo(
    () => (Object.keys(KIND_LABEL) as ReportKind[]).filter((k) => isModuleVisible(KIND_MODULE[k])),
    [isModuleVisible]
  );
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [kind, setKind] = useState<ReportKind>("sales");
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let data: any[] = [];
      if (kind === "sales") {
        const { data: d } = await supabase.from("financial")
          .select("transaction_date, description, category, gross_amount, net_amount, payment_method, status")
          .eq("type", "income")
          .gte("transaction_date", from).lte("transaction_date", to)
          .order("transaction_date", { ascending: false }).limit(2000);
        data = d ?? [];
      } else if (kind === "financial") {
        const { data: d } = await supabase.from("financial")
          .select("transaction_date, type, description, category, gross_amount, net_amount, payment_method, status, due_date, paid_at")
          .gte("transaction_date", from).lte("transaction_date", to)
          .order("transaction_date", { ascending: false }).limit(2000);
        data = d ?? [];
      } else if (kind === "expenses") {
        const { data: d } = await supabase.from("financial")
          .select("transaction_date, description, category, gross_amount, payment_method, status, due_date, paid_at, is_fixed, recurrence, notes")
          .eq("type", "expense")
          .gte("transaction_date", from).lte("transaction_date", to)
          .order("transaction_date", { ascending: false }).limit(2000);
        data = d ?? [];
      } else if (kind === "stock") {
        const { data: d } = await supabase.from("products")
          .select("name, code, stock, cost, sale_price, status, out_of_line")
          .is("deleted_at", null).order("name").limit(2000);
        data = d ?? [];
      } else if (kind === "products") {
        const { data: d } = await supabase.from("products")
          .select("name, code, category, cost, sale_price, status, stock, created_at")
          .is("deleted_at", null).order("created_at", { ascending: false }).limit(2000);
        data = d ?? [];
      } else if (kind === "clients") {
        const { data: d } = await supabase.from("clients")
          .select("full_name, phone_number, email, city, state, created_at")
          .is("deleted_at", null).order("created_at", { ascending: false }).limit(2000);
        data = d ?? [];
      }
      setRows(data);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  };

  // Se o tipo atual deixar de estar disponível (módulo desativado), volta para o primeiro válido.
  useEffect(() => {
    if (availableKinds.length && !availableKinds.includes(kind)) setKind(availableKinds[0]);
  }, [availableKinds, kind]);

  useEffect(() => { if (user) run(); /* eslint-disable-next-line */ }, [user, kind]);

  const totals = useMemo(() => {
    if (kind === "sales") {
      const gross = rows.reduce((a, r) => a + Number(r.gross_amount || 0), 0);
      const net = rows.reduce((a, r) => a + Number(r.net_amount || r.gross_amount || 0), 0);
      return { gross, net };
    }
    if (kind === "expenses") {
      return { gross: rows.reduce((a, r) => a + Number(r.gross_amount || 0), 0), net: 0 };
    }
    if (kind === "financial") {
      const inc = rows.filter(r => r.type === "income").reduce((a, r) => a + Number(r.net_amount || r.gross_amount || 0), 0);
      const exp = rows.filter(r => r.type === "expense").reduce((a, r) => a + Number(r.gross_amount || 0), 0);
      return { gross: inc - exp, net: inc };
    }
    return null;
  }, [rows, kind]);

  const cols = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-4">
      <PageHeader title="Relatórios" description="Gere relatórios por período e exporte em CSV." />

      <Card className="p-4 rounded-2xl space-y-3">
        <div className="grid sm:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as ReportKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableKinds.map(k => (
                  <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">De</Label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Até</Label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={run} disabled={loading} className="rounded-xl">
              {loading ? "Gerando…" : "Gerar"}
            </Button>
            <Button variant="outline" disabled={!rows.length} onClick={() => downloadCSV(`${kind}-${from}-${to}.csv`, toCSV(rows))} className="rounded-xl gap-2">
              <Download className="h-4 w-4" /> CSV
            </Button>
          </div>
        </div>

        {totals && (
          <div className="flex flex-wrap gap-4 text-sm border-t border-border/50 pt-3">
            {"gross" in totals && (
              <div>
                <span className="text-muted-foreground">{kind === "expenses" ? "Total despesas" : "Total bruto"}: </span>
                <strong className="text-primary">R$ {Number(totals.gross).toFixed(2)}</strong>
              </div>
            )}
            {kind === "sales" && (
              <div>
                <span className="text-muted-foreground">Líquido: </span>
                <strong>R$ {Number(totals.net).toFixed(2)}</strong>
              </div>
            )}
            <div className="text-muted-foreground">Registros: <strong className="text-foreground">{rows.length}</strong></div>
          </div>
        )}
      </Card>

      <Card className="rounded-2xl overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {loading ? "Carregando…" : "Sem dados para os filtros selecionados."}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>{cols.map(c => <TableHead key={c} className="text-xs whitespace-nowrap">{c}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 500).map((r, i) => (
                  <TableRow key={i}>
                    {cols.map(c => (
                      <TableCell key={c} className="text-xs whitespace-nowrap">
                        {r[c] == null ? "—" : typeof r[c] === "object" ? JSON.stringify(r[c]) : String(r[c])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length > 500 && (
              <div className="p-3 text-xs text-muted-foreground text-center border-t border-border/50">
                Mostrando 500 de {rows.length}. Exporte em CSV para ver tudo.
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
