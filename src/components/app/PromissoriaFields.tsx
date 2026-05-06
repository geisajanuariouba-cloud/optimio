import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export type PromissoriaData = {
  total_amount: number;
  installments_count: number;
  first_due: string;
};

export function PromissoriaFields({ value, onChange, originalAmount }: {
  value: PromissoriaData;
  onChange: (v: PromissoriaData) => void;
  originalAmount?: number;
}) {
  const interest = Math.max(0, value.total_amount - (originalAmount ?? 0));
  const per = value.installments_count > 0 ? value.total_amount / value.installments_count : 0;
  return (
    <Card className="p-4 bg-amber-500/5 border border-amber-500/30 rounded-2xl space-y-3">
      <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Promissória</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Total a prazo (com juros) *</Label>
          <Input type="number" step="0.01" min={0} value={value.total_amount}
            onChange={(e) => onChange({ ...value, total_amount: +e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Nº de parcelas *</Label>
          <Input type="number" min={1} value={value.installments_count}
            onChange={(e) => onChange({ ...value, installments_count: +e.target.value })} />
        </div>
      </div>
      <div>
        <Label className="text-xs">1ª parcela vence em *</Label>
        <Input type="date" value={value.first_due}
          onChange={(e) => onChange({ ...value, first_due: e.target.value })} />
      </div>
      <div className="text-xs text-muted-foreground space-y-0.5">
        {originalAmount !== undefined && <div>Juros: <strong>R$ {interest.toFixed(2)}</strong></div>}
        <div>{value.installments_count}× de <strong>R$ {per.toFixed(2)}</strong></div>
      </div>
    </Card>
  );
}

export async function createPromissoria(opts: {
  supabase: any;
  user_id: string;
  client_id: string;
  original_amount: number;
  data: PromissoriaData;
  appointment_id?: string | null;
  notes?: string | null;
}) {
  const { supabase, user_id, client_id, original_amount, data, appointment_id, notes } = opts;
  const interest = Math.max(0, data.total_amount - original_amount);
  const { data: debt, error } = await supabase.from("debts").insert({
    user_id, client_id, origin: appointment_id ? "appointment" : "manual",
    original_amount, interest_amount: interest, total_amount: data.total_amount,
    installments_count: data.installments_count, appointment_id: appointment_id ?? null, notes: notes ?? null,
  }).select().single();
  if (error || !debt) throw error ?? new Error("Falha ao criar dívida");
  const per = data.total_amount / data.installments_count;
  const rows = Array.from({ length: data.installments_count }, (_, k) => {
    const d = new Date(data.first_due); d.setMonth(d.getMonth() + k);
    return { user_id, debt_id: debt.id, number: k + 1, amount: per, due_date: d.toISOString().slice(0, 10) };
  });
  await supabase.from("debt_installments").insert(rows);
  return debt;
}
