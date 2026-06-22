// Regra central de "estoque baixo".
// Respeita a configuração do tenant (profiles.alert_on_min_stock_exact):
//   - estoque atual < mínimo            => sempre alerta
//   - estoque atual == mínimo (> 0)     => alerta apenas se alertOnExact = true
//   - mínimo 0 e atual 0                => nunca alerta
export function isLowStock(stock: number | null | undefined, minStock: number | null | undefined, alertOnExact = true): boolean {
  const s = Number(stock ?? 0);
  const m = Number(minStock ?? 0);
  if (m === 0 && s === 0) return false;
  if (s < m) return true;
  if (s === m) return alertOnExact && m > 0;
  return false;
}
