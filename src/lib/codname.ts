// Gera apelido curto a partir de nome + atributos
// Ex: ("Sofá Retrátil 2.30m", "2.30m", "Bege", "Sofás") => "SOFA230BG"
export function generateCodname(name: string, size?: string | null, color?: string | null, category?: string | null): string {
  if (!name) return "";
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const firstToken = norm(name).trim().split(/\s+/)[0] || "";
  let base = firstToken.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase();
  if (base.length < 3 && category) {
    const catPart = norm(category).replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();
    base = (base + catPart).slice(0, 4);
  }
  const sizePart = size ? (size.match(/[0-9]+/g)?.join("") ?? "").slice(0, 4) : "";
  const colorPart = color ? norm(color).replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() : "";
  return `${base}${sizePart}${colorPart}`;
}
