// Helpers para o ciclo (mês operacional) configurável.
// O ciclo começa no dia X do mês e termina no dia (X-1) do mês seguinte.
// Ex.: startDay=10 → ciclo de 10/jan a 09/fev.

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function getCycleRange(startDay = 1, ref: Date = new Date()) {
  const safe = Math.min(28, Math.max(1, Math.floor(startDay || 1)));
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const day = ref.getDate();

  const startMonth = day >= safe ? m : m - 1;
  const start = new Date(y, startMonth, safe);
  const end = new Date(y, startMonth + 1, safe - 1, 23, 59, 59, 999);
  return { start, end, startIso: iso(start), endIso: iso(end) };
}

export function getCycleLabel(startDay = 1, ref: Date = new Date()) {
  const { start, end } = getCycleRange(startDay, ref);
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return `${fmt(start)} → ${fmt(end)}`;
}
