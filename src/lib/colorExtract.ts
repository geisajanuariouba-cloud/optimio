// Client-side dominant color extraction from an image File/URL.
// Returns palette as HSL strings ("H S% L%") compatible with our design tokens.

export type Palette = { primary: string; secondary: string; accent: string; all: string[] };

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

const toToken = (h: number, s: number, l: number) => `${h} ${s}% ${l}%`;

export async function extractPaletteFromFile(file: File): Promise<Palette> {
  const url = URL.createObjectURL(file);
  try { return await extractPaletteFromUrl(url); } finally { URL.revokeObjectURL(url); }
}

export async function extractPaletteFromUrl(url: string): Promise<Palette> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image(); i.crossOrigin = "anonymous";
    i.onload = () => resolve(i); i.onerror = reject; i.src = url;
  });
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("canvas");
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  // Bucket by hue+saturation. Ignore near-white/black/transparent.
  const buckets = new Map<string, { count: number; h: number; s: number; l: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 200) continue;
    const [h, s, l] = rgbToHsl(r, g, b);
    if (l < 8 || l > 92) continue;        // skip near-black/white
    if (s < 12) continue;                  // skip grays
    const hb = Math.round(h / 15) * 15;    // 24 hue buckets
    const sb = Math.round(s / 20) * 20;
    const key = `${hb}_${sb}`;
    const cur = buckets.get(key);
    if (cur) { cur.count++; cur.h = (cur.h + h) / 2; cur.s = (cur.s + s) / 2; cur.l = (cur.l + l) / 2; }
    else buckets.set(key, { count: 1, h, s, l });
  }
  const sorted = Array.from(buckets.values()).sort((a, b) => b.count - a.count);
  if (!sorted.length) {
    const fallback = "271 91% 65%";
    return { primary: fallback, secondary: "220 15% 25%", accent: "174 80% 55%", all: [fallback] };
  }

  // Normalize lightness to a usable UI range (45–65)
  const normalize = (c: { h: number; s: number; l: number }) => {
    const l = Math.min(70, Math.max(40, c.l));
    const s = Math.max(40, Math.min(95, c.s));
    return toToken(Math.round(c.h), Math.round(s), Math.round(l));
  };

  const primary = normalize(sorted[0]);
  // Pick a secondary with hue distance >40°, else darker variant
  const secCandidate = sorted.find((c) => Math.abs(c.h - sorted[0].h) > 40) ?? sorted[0];
  const secondary = normalize({ ...secCandidate, l: Math.max(20, secCandidate.l - 25) });
  const accCandidate = sorted[2] ?? sorted[1] ?? sorted[0];
  const accent = normalize({ ...accCandidate, l: Math.min(70, accCandidate.l + 10) });

  return { primary, secondary, accent, all: sorted.slice(0, 6).map(normalize) };
}
