import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type Address = {
  address_zip?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  address_neighborhood?: string | null;
  address_city?: string | null;
  address_state?: string | null;
};

export function fullAddress(a: Address | null | undefined) {
  if (!a) return "";
  const street = [a.address_street, a.address_number].filter(Boolean).join(", ");
  const tail = [a.address_neighborhood, a.address_city, a.address_state].filter(Boolean).join(" - ");
  return [street, a.address_complement, tail, a.address_zip].filter(Boolean).join(", ");
}

export function AddressFields({ value, onChange }: { value: Address; onChange: (v: Address) => void }) {
  const set = (k: keyof Address, v: string) => onChange({ ...value, [k]: v });
  const lookupCEP = async (cep: string) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const j = await r.json();
      if (j.erro) return;
      onChange({
        ...value,
        address_zip: clean,
        address_street: j.logradouro || value.address_street,
        address_neighborhood: j.bairro || value.address_neighborhood,
        address_city: j.localidade || value.address_city,
        address_state: j.uf || value.address_state,
      });
    } catch {}
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div><Label>CEP</Label><Input value={value.address_zip ?? ""} onChange={(e) => set("address_zip", e.target.value)} onBlur={(e) => lookupCEP(e.target.value)} placeholder="00000-000" /></div>
        <div className="col-span-2"><Label>Cidade / UF</Label>
          <div className="flex gap-2">
            <Input value={value.address_city ?? ""} onChange={(e) => set("address_city", e.target.value)} placeholder="Cidade" />
            <Input value={value.address_state ?? ""} onChange={(e) => set("address_state", e.target.value.toUpperCase().slice(0, 2))} placeholder="UF" className="w-16" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2"><Label>Rua</Label><Input value={value.address_street ?? ""} onChange={(e) => set("address_street", e.target.value)} /></div>
        <div><Label>Número</Label><Input value={value.address_number ?? ""} onChange={(e) => set("address_number", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Bairro</Label><Input value={value.address_neighborhood ?? ""} onChange={(e) => set("address_neighborhood", e.target.value)} /></div>
        <div><Label>Complemento</Label><Input value={value.address_complement ?? ""} onChange={(e) => set("address_complement", e.target.value)} /></div>
      </div>
    </div>
  );
}
