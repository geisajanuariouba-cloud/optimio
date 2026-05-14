import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PageHeader, MetricsRow } from "@/components/app/PageHeader";
import { Truck, MapPin, Check, Route, Factory } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Lazy-load leaflet to avoid SSR/initial-render crash
const MapContainer = lazy(() => import("react-leaflet").then(m => ({ default: m.MapContainer })));
const TileLayer = lazy(() => import("react-leaflet").then(m => ({ default: m.TileLayer })));
const Marker = lazy(() => import("react-leaflet").then(m => ({ default: m.Marker })));
const Popup = lazy(() => import("react-leaflet").then(m => ({ default: m.Popup })));
const Polyline = lazy(() => import("react-leaflet").then(m => ({ default: m.Polyline })));

let __leafletReady = false;
async function ensureLeaflet() {
  if (__leafletReady) return;
  const L = (await import("leaflet")).default;
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
  __leafletReady = true;
}

function makeIcons(L: any) {
  return {
    factory: L.divIcon({
      className: "",
      html: `<div style="background:hsl(24 95% 58%);color:white;padding:6px;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.3);font-size:14px">🏭</div>`,
      iconSize: [28, 28], iconAnchor: [14, 14],
    }),
    client: L.divIcon({
      className: "",
      html: `<div style="background:hsl(271 91% 65%);color:white;padding:6px;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.3);font-size:14px">📦</div>`,
      iconSize: [28, 28], iconAnchor: [14, 14],
    }),
  };
}

type Delivery = { id: string; financial_id: string | null; client_id: string | null; supplier_id: string | null; needs_pickup: boolean; destination_address: string; pickup_address: string | null; status: string; route_order: number | null; distance_km: number | null; scheduled_for: string | null; delivered_at: string | null; notes: string | null };

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`);
    const j = await r.json();
    if (j[0]) return { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon) };
  } catch {}
  return null;
}

async function osrmRoute(coords: { lat: number; lng: number }[]) {
  if (coords.length < 2) return null;
  const path = coords.map(c => `${c.lng},${c.lat}`).join(";");
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson`);
    const j = await r.json();
    if (j.routes?.[0]) {
      const coordsLatLng = j.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]);
      return { coords: coordsLatLng, distance: j.routes[0].distance / 1000, duration: j.routes[0].duration / 60 };
    }
  } catch {}
  return null;
}

export default function Deliveries() {
  const { user } = useAuth();
  const [list, setList] = useState<Delivery[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [building, setBuilding] = useState(false);

  const load = async () => {
    const [d, c, s] = await Promise.all([
      supabase.from("deliveries").select("*").order("scheduled_for", { ascending: true }).order("created_at"),
      supabase.from("clients").select("id,full_name").is("deleted_at", null),
      supabase.from("suppliers").select("id,name,full_address").is("deleted_at", null),
    ]);
    setList((d.data ?? []) as Delivery[]);
    setClients(c.data ?? []); setSuppliers(s.data ?? []);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const togglePickup = async (d: Delivery) => {
    const newVal = !d.needs_pickup;
    const sup = suppliers.find(s => s.id === d.supplier_id);
    await supabase.from("deliveries").update({ needs_pickup: newVal, pickup_address: newVal ? sup?.full_address ?? null : null }).eq("id", d.id);
    load();
  };

  const setSupplier = async (d: Delivery, supplierId: string) => {
    const sup = suppliers.find(s => s.id === supplierId);
    await supabase.from("deliveries").update({ supplier_id: supplierId, pickup_address: d.needs_pickup ? sup?.full_address ?? null : null }).eq("id", d.id);
    load();
  };

  const markDone = async (d: Delivery) => {
    await supabase.from("deliveries").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("id", d.id);
    if (d.financial_id) {
      // mark financial as delivered via notes? For now we just update the delivery.
    }
    toast.success("Entrega concluída"); load();
  };

  const buildRoute = async () => {
    setBuilding(true); setRouteCoords([]); setRouteInfo(null);
    const pending = list.filter(d => d.status === "pending" || d.status === "in_route");
    const stops: { lat: number; lng: number; label: string }[] = [];
    // Pickup first if needed
    for (const d of pending) {
      if (d.needs_pickup && d.pickup_address) {
        const p = await geocode(d.pickup_address);
        if (p) stops.push({ ...p, label: "pickup" });
      }
    }
    for (const d of pending) {
      const p = await geocode(d.destination_address);
      if (p) stops.push({ ...p, label: "dest" });
    }
    if (stops.length < 2) {
      toast.error("Sem endereços suficientes para montar rota");
      setBuilding(false); return;
    }
    const r = await osrmRoute(stops);
    if (r) {
      setRouteCoords(r.coords);
      setRouteInfo({ distance: r.distance, duration: r.duration });
      toast.success(`Rota gerada: ${r.distance.toFixed(1)} km · ${r.duration.toFixed(0)} min`);
    } else {
      toast.error("OSRM indisponível");
    }
    setBuilding(false);
  };

  const pending = list.filter(d => d.status === "pending");
  const inRoute = list.filter(d => d.status === "in_route");
  const delivered = list.filter(d => d.status === "delivered");
  const today = list.filter(d => d.scheduled_for && d.scheduled_for === new Date().toISOString().slice(0, 10));

  // Compute simple markers from geocoding cache (lazy)
  const [markers, setMarkers] = useState<{ id: string; lat: number; lng: number; type: "client" | "factory"; label: string }[]>([]);
  useEffect(() => {
    (async () => {
      const m: any[] = [];
      for (const d of list.slice(0, 20)) {
        if (d.status === "delivered") continue;
        const dest = await geocode(d.destination_address);
        if (dest) m.push({ id: d.id + "-d", lat: dest.lat, lng: dest.lng, type: "client", label: d.destination_address });
        if (d.needs_pickup && d.pickup_address) {
          const p = await geocode(d.pickup_address);
          if (p) m.push({ id: d.id + "-p", lat: p.lat, lng: p.lng, type: "factory", label: d.pickup_address });
        }
      }
      setMarkers(m);
    })();
  }, [list.length]);

  const center: [number, number] = markers[0] ? [markers[0].lat, markers[0].lng] : [-23.5505, -46.6333];

  return (
    <div>
      <PageHeader title="Logística & Entregas" description="Rota do dia, coleta na fábrica e entregas concluídas." actionLabel="Gerar rota do dia" onAction={buildRoute} />
      <MetricsRow items={[
        { label: "Pendentes", value: String(pending.length), tone: pending.length > 0 ? "warning" : "primary" },
        { label: "Em rota", value: String(inRoute.length), tone: "primary" },
        { label: "Entregues", value: String(delivered.length), tone: "success" },
        { label: "Para hoje", value: String(today.length), tone: "primary" },
      ]} />

      <div className="grid lg:grid-cols-[1fr_400px] gap-4">
        <Card className="rounded-3xl border-0 shadow-sm overflow-hidden h-[460px] relative">
          <MapContainer center={center} zoom={12} className="h-full w-full" scrollWheelZoom={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            {markers.map(m => (
              <Marker key={m.id} position={[m.lat, m.lng]} icon={m.type === "factory" ? factoryIcon : clientIcon}>
                <Popup>{m.type === "factory" ? "🏭 Coleta: " : "📦 Entrega: "}{m.label}</Popup>
              </Marker>
            ))}
            {routeCoords.length > 0 && <Polyline positions={routeCoords} pathOptions={{ color: "hsl(271 91% 65%)", weight: 4 }} />}
          </MapContainer>
          {routeInfo && (
            <div className="absolute top-3 left-3 bg-card/95 backdrop-blur rounded-2xl px-4 py-2 shadow-md text-sm">
              <Route className="h-4 w-4 inline mr-1 text-primary" />
              <strong>{routeInfo.distance.toFixed(1)} km</strong> · {routeInfo.duration.toFixed(0)} min
            </div>
          )}
          {building && <div className="absolute inset-0 bg-background/60 grid place-items-center">Calculando rota…</div>}
        </Card>

        <Card className="rounded-3xl border-0 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-border text-sm font-semibold">Entregas</div>
          <div className="divide-y divide-border max-h-[420px] overflow-auto">
            {list.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">Sem entregas. Marque "Necessita entrega" em vendas.</div>}
            {list.map(d => {
              const cli = clients.find(c => c.id === d.client_id);
              return (
                <div key={d.id} className="p-3 text-sm space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{cli?.full_name ?? "Cliente"}</div>
                      <div className="text-xs text-muted-foreground flex items-start gap-1"><MapPin className="h-3 w-3 mt-0.5" />{d.destination_address}</div>
                    </div>
                    <Badge className={
                      d.status === "delivered" ? "bg-emerald-500/15 text-emerald-600" :
                      d.status === "in_route" ? "bg-primary/15 text-primary" :
                      "bg-amber-500/15 text-amber-600"
                    }>{d.status}</Badge>
                  </div>
                  {d.status !== "delivered" && (
                    <>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <label className="flex items-center gap-1.5">
                          <Switch checked={d.needs_pickup} onCheckedChange={() => togglePickup(d)} />
                          Coletar na fábrica
                        </label>
                      </div>
                      {d.needs_pickup && (
                        <select className="w-full bg-secondary/50 rounded-xl text-xs p-2 border-0" value={d.supplier_id ?? ""} onChange={(e) => setSupplier(d, e.target.value)}>
                          <option value="">Selecione fábrica…</option>
                          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      )}
                      <Button size="sm" onClick={() => markDone(d)} className="w-full rounded-2xl gap-1"><Check className="h-3.5 w-3.5" />Entrega feita</Button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
