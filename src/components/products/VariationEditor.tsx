import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, Copy, Wand2 } from "lucide-react";
import { generateCodname } from "@/lib/codname";

export type Variation = {
  id?: string;
  name: string;
  codname?: string;
  sku?: string;
  color?: string;
  fabric?: string;
  material?: string;
  size?: string;
  cost?: number;
  sale_price?: number;
  stock?: number;
  min_stock?: number;
  image_url?: string;
  width?: number;
  height?: number;
  depth?: number;
  length_cm?: number;
  weight?: number;
  measure_unit?: string;
};

export function emptyVariation(): Variation {
  return { name: "", color: "", fabric: "", size: "", cost: 0, sale_price: 0, stock: 0, min_stock: 0, measure_unit: "cm" };
}

export function VariationEditor({
  value, onChange, parentName,
}: { value: Variation[]; onChange: (v: Variation[]) => void; parentName: string }) {
  const update = (i: number, patch: Partial<Variation>) => {
    const next = value.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const add = () => onChange([...value, emptyVariation()]);
  const remove = (i: number) => onChange(value.filter((_, k) => k !== i));
  const duplicate = (i: number) => {
    const next = value.slice();
    next.splice(i + 1, 0, { ...value[i], id: undefined });
    onChange(next);
  };
  const autoCodname = (i: number) => {
    const v = value[i];
    const cn = generateCodname(parentName || v.name, v.size, v.color);
    update(i, { codname: cn });
  };

  if (value.length === 0) {
    return (
      <Card className="rounded-2xl border-dashed border-2 p-6 text-center bg-muted/30">
        <p className="text-sm text-muted-foreground mb-3">Nenhuma variação ainda. Use variações quando o produto tem cores, tecidos ou tamanhos diferentes.</p>
        <Button onClick={add} variant="outline" className="rounded-xl gap-1"><Plus className="h-4 w-4" />Adicionar variação</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Accordion type="multiple" className="space-y-2">
        {value.map((v, i) => (
          <AccordionItem key={i} value={`v-${i}`} className="border rounded-2xl bg-card px-3">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-2 text-left flex-1">
                <span className="font-medium">{v.name || `Variação ${i + 1}`}</span>
                {v.codname && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{v.codname}</span>}
                {v.color && <span className="text-xs text-muted-foreground">• {v.color}</span>}
                {v.size && <span className="text-xs text-muted-foreground">• {v.size}</span>}
                <span className="ml-auto text-xs text-muted-foreground">R$ {Number(v.sale_price ?? 0).toFixed(2)} • estoque {v.stock ?? 0}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome da variação</Label><Input value={v.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Ex: 2.30m Linho Cinza" /></div>
                <div>
                  <Label>Codnome</Label>
                  <div className="flex gap-1">
                    <Input value={v.codname ?? ""} onChange={(e) => update(i, { codname: e.target.value })} placeholder="SOFA230CZ" />
                    <Button type="button" size="icon" variant="outline" onClick={() => autoCodname(i)} title="Gerar"><Wand2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Cor</Label><Input value={v.color ?? ""} onChange={(e) => update(i, { color: e.target.value })} /></div>
                <div><Label>Tecido</Label><Input value={v.fabric ?? ""} onChange={(e) => update(i, { fabric: e.target.value })} /></div>
                <div><Label>Material</Label><Input value={v.material ?? ""} onChange={(e) => update(i, { material: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Tamanho</Label><Input value={v.size ?? ""} onChange={(e) => update(i, { size: e.target.value })} placeholder="2.30m" /></div>
                <div><Label>SKU</Label><Input value={v.sku ?? ""} onChange={(e) => update(i, { sku: e.target.value })} /></div>
                <div><Label>Imagem URL</Label><Input value={v.image_url ?? ""} onChange={(e) => update(i, { image_url: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={v.cost ?? 0} onChange={(e) => update(i, { cost: +e.target.value })} /></div>
                <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={v.sale_price ?? 0} onChange={(e) => update(i, { sale_price: +e.target.value })} /></div>
                <div><Label>Estoque</Label><Input type="number" value={v.stock ?? 0} onChange={(e) => update(i, { stock: +e.target.value })} /></div>
                <div><Label>Estoque mín.</Label><Input type="number" value={v.min_stock ?? 0} onChange={(e) => update(i, { min_stock: +e.target.value })} /></div>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs font-medium mb-2 text-muted-foreground">Medidas desta variação</p>
                <div className="grid grid-cols-5 gap-2">
                  <div><Label className="text-xs">Larg.</Label><Input type="number" value={v.width ?? ""} onChange={(e) => update(i, { width: +e.target.value })} /></div>
                  <div><Label className="text-xs">Alt.</Label><Input type="number" value={v.height ?? ""} onChange={(e) => update(i, { height: +e.target.value })} /></div>
                  <div><Label className="text-xs">Prof.</Label><Input type="number" value={v.depth ?? ""} onChange={(e) => update(i, { depth: +e.target.value })} /></div>
                  <div><Label className="text-xs">Compr.</Label><Input type="number" value={v.length_cm ?? ""} onChange={(e) => update(i, { length_cm: +e.target.value })} /></div>
                  <div><Label className="text-xs">Peso</Label><Input type="number" value={v.weight ?? ""} onChange={(e) => update(i, { weight: +e.target.value })} /></div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" size="sm" variant="outline" onClick={() => duplicate(i)} className="rounded-xl gap-1"><Copy className="h-3.5 w-3.5" />Duplicar</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => remove(i)} className="rounded-xl gap-1 text-rose-600"><Trash2 className="h-3.5 w-3.5" />Remover</Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <Button type="button" onClick={add} variant="outline" className="rounded-xl gap-1 w-full"><Plus className="h-4 w-4" />Adicionar variação</Button>
    </div>
  );
}
