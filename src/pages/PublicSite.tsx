import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function PublicSite() {
  const { slug } = useParams();
  const [site, setSite] = useState<any>(null);
  const [form, setForm] = useState({ customer_name: "", customer_email: "", customer_phone: "" });

  useEffect(() => {
    if (!slug) return;
    supabase.from("sites").select("*").eq("slug", slug).eq("published", true).maybeSingle().then(({ data }) => setSite(data));
  }, [slug]);

  const submit = async (sectionType: string) => {
    if (!site) return;
    if (!form.customer_name) return toast.error("Informe seu nome");
    const { error } = await supabase.from("site_orders").insert({
      user_id: site.user_id, site_id: site.id,
      customer_name: form.customer_name, customer_email: form.customer_email, customer_phone: form.customer_phone,
      type: sectionType === "booking" ? "booking" : "sale",
    });
    if (error) return toast.error(error.message);
    toast.success("Pedido enviado! Em breve entraremos em contato.");
    setForm({ customer_name: "", customer_email: "", customer_phone: "" });
  };

  if (!site) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Site não encontrado.</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4"><h1 className="font-bold text-lg">{site.title}</h1></header>
      <main className="max-w-4xl mx-auto p-6 space-y-8">
        {site.sections.map((s: any) => (
          <section key={s.id}>
            {s.type === "hero" && (
              <div className="text-center py-16 rounded-3xl bg-gradient-brand text-white">
                <h2 className="text-5xl font-bold mb-3">{s.data.title}</h2>
                <p className="text-lg opacity-90">{s.data.subtitle}</p>
              </div>
            )}
            {s.type === "text" && <p className="text-lg">{s.data.content}</p>}
            {(s.type === "services" || s.type === "products") && <h2 className="text-3xl font-bold">{s.data.title}</h2>}
            {s.type === "booking" && (
              <Card className="p-6 rounded-3xl">
                <h2 className="text-2xl font-bold mb-4">{s.data.title}</h2>
                <div className="space-y-3">
                  <Input placeholder="Seu nome" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                  <Input placeholder="E-mail" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
                  <Input placeholder="WhatsApp" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
                  <Button onClick={() => submit("booking")} className="w-full bg-gradient-brand text-white border-0">Solicitar agendamento</Button>
                </div>
              </Card>
            )}
          </section>
        ))}
      </main>
    </div>
  );
}
