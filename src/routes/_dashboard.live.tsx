import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, CloudRain, Flame, MapPin, Megaphone, Route as RouteIcon, Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/PageHeader";
import { toast } from "sonner";

import { getDashboardSummary } from "@/lib/dashboard.functions";
import { getWeather } from "@/lib/weather.functions";
import { getFireHotspots } from "@/lib/firms.functions";
import { predictRisk } from "@/lib/risk.functions";
import { getEvacuationRoute, getNearbyShelters } from "@/lib/routing.functions";
import { draftAlert, sendAlert, listAlerts, getSubscriberCount } from "@/lib/alerts.functions";
import { translateText } from "@/lib/translate.functions";

export const Route = createFileRoute("/_dashboard/live")({
  component: LiveBackendPage,
});

const PRESET_LOCATIONS = [
  { name: "Aluva, Kerala", lat: 10.1004, lng: 76.3570 },
  { name: "Kuttanad, Kerala", lat: 9.5333, lng: 76.4167 },
  { name: "Puri, Odisha", lat: 19.8135, lng: 85.8312 },
  { name: "Chennai T. Nagar", lat: 13.0418, lng: 80.2341 },
  { name: "Majuli, Assam", lat: 26.95, lng: 94.17 },
  { name: "Joshimath, Uttarakhand", lat: 30.5667, lng: 79.5667 },
];

function LiveBackendPage() {
  const [loc, setLoc] = useState(PRESET_LOCATIONS[0]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Backend Console"
        description="Real APIs powered by Open-Meteo, NASA FIRMS, OSRM, Lovable Cloud, and Telegram. No mocked seed data."
      />

      <Card>
        <CardHeader>
          <CardTitle>Target location</CardTitle>
          <CardDescription>All panels below act on this point.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {PRESET_LOCATIONS.map((p) => (
            <Button key={p.name} size="sm" variant={p.name === loc.name ? "default" : "outline"} onClick={() => setLoc(p)}>
              <MapPin className="mr-1 h-3 w-3" /> {p.name}
            </Button>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardSummaryCard />
        <WeatherCard loc={loc} />
        <FireCard loc={loc} />
        <RiskCard loc={loc} />
        <RoutingCard loc={loc} />
        <TranslateCard />
        <AlertCard />
      </div>
    </div>
  );
}

function DashboardSummaryCard() {
  const fn = useServerFn(getDashboardSummary);
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["live:dashboard"],
    queryFn: () => fn(),
  });
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" /> Dashboard Summary</CardTitle>
          <CardDescription>Aggregated from Lovable Cloud</CardDescription>
        </div>
        <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isRefetching}>{isRefetching ? <Loader2 className="h-3 w-3 animate-spin"/> : "Refresh"}</Button>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {isLoading && <p>Loading...</p>}
        {data && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Active alerts" value={data.active_alerts.length} />
              <Stat label="Verified reports" value={data.verified_reports.length} />
              <Stat label="Pending reports" value={data.pending_reports.length} />
              <Stat label="Shelters" value={data.shelters.length} />
              <Stat label="Beds available" value={data.shelter_available_beds} />
              <Stat label="Beds occupied" value={data.shelter_occupancy_total} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function WeatherCard({ loc }: { loc: { lat: number; lng: number; name: string } }) {
  const fn = useServerFn(getWeather);
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["live:weather", loc.lat, loc.lng],
    queryFn: () => fn({ data: { lat: loc.lat, lng: loc.lng } }),
    retry: 3,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 8000),
    staleTime: 10 * 60 * 1000,
    refetchOnMount: "always",
  });
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><CloudRain className="h-4 w-4" /> Open-Meteo Live Weather</CardTitle>
          <CardDescription>{loc.name}</CardDescription>
        </div>
        <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isRefetching}>{isRefetching ? <Loader2 className="h-3 w-3 animate-spin"/> : "Refresh"}</Button>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {isLoading && <p>Loading...</p>}
        {error && <Badge variant="destructive">Error: {String((error as Error).message || error)}</Badge>}
        {data && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Temperature" value={`${data.current.temperature_c ?? "-"}°C`} />
              <Stat label="Wind" value={`${data.current.wind_speed_kmh ?? "-"} km/h`} />
              <Stat label="Humidity" value={`${data.current.humidity ?? "-"}%`} />
              <Stat label="Rainfall 24h" value={`${data.rainfall_mm_24h.toFixed(1)} mm`} />
            </div>
            <div className="pt-2">
              <p className="mb-1 text-xs text-muted-foreground">3-day forecast</p>
              {data.daily.map((d) => (
                <div key={d.date} className="flex justify-between text-xs">
                  <span>{d.date}</span>
                  <span>{d.rainfall_mm.toFixed(1)} mm · {d.temp_min}–{d.temp_max}°C · {d.wind_max_kmh} km/h</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FireCard({ loc }: { loc: { lat: number; lng: number; name: string } }) {
  const fn = useServerFn(getFireHotspots);
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["live:firms", loc.lat, loc.lng],
    queryFn: () => fn({ data: { lat: loc.lat, lng: loc.lng, radius_km: 200, days: 2 } }),
  });
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Flame className="h-4 w-4" /> NASA FIRMS Hotspots</CardTitle>
          <CardDescription>VIIRS_SNPP_NRT, 200 km radius, last 2 days</CardDescription>
        </div>
        <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isRefetching}>{isRefetching ? <Loader2 className="h-3 w-3 animate-spin"/> : "Refresh"}</Button>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {isLoading && <p>Loading...</p>}
        {data?.error && <Badge variant="destructive">{data.error}</Badge>}
        {data && (
          <>
            <p><strong>{data.hotspots.length}</strong> active hotspots</p>
            {data.hotspots.slice(0, 5).map((h, i) => (
              <div key={i} className="text-xs text-muted-foreground">
                {h.lat.toFixed(3)}, {h.lng.toFixed(3)} · FRP {h.frp.toFixed(1)} · conf {h.confidence}
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RiskCard({ loc }: { loc: { lat: number; lng: number; name: string } }) {
  const fn = useServerFn(predictRisk);
  const [disaster, setDisaster] = useState<"flood" | "cyclone" | "wildfire" | "earthquake" | "landslide">("flood");
  const m = useMutation({
    mutationFn: () => fn({ data: { lat: loc.lat, lng: loc.lng, disaster } }),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" /> Hyperlocal Risk Prediction</CardTitle>
        <CardDescription>Blends Open-Meteo + FIRMS + verified reports + road blockages</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex gap-2">
          <Select value={disaster} onValueChange={(v) => setDisaster(v as typeof disaster)}>
            <SelectTrigger className="w-40"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="flood">Flood</SelectItem>
              <SelectItem value="cyclone">Cyclone</SelectItem>
              <SelectItem value="wildfire">Wildfire</SelectItem>
              <SelectItem value="landslide">Landslide</SelectItem>
              <SelectItem value="earthquake">Earthquake</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>{m.isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : "Predict"}</Button>
        </div>
        {m.data && (
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{m.data.score}/100</span>
              <Badge variant={m.data.level === "danger" ? "destructive" : "secondary"}>{m.data.level.toUpperCase()}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Confidence {m.data.confidence}% · Trend {m.data.trend}</p>
            <ul className="list-disc pl-4 text-xs">
              {m.data.top_factors.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
            <p className="text-xs font-medium">→ {m.data.recommended_action}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RoutingCard({ loc }: { loc: { lat: number; lng: number; name: string } }) {
  const nearby = useServerFn(getNearbyShelters);
  const route = useServerFn(getEvacuationRoute);
  const { data: shelters } = useQuery({
    queryKey: ["live:shelters", loc.lat, loc.lng],
    queryFn: () => nearby({ data: { lat: loc.lat, lng: loc.lng, limit: 3 } }),
  });
  const m = useMutation({
    mutationFn: (s: { lat: number; lng: number; id: string }) =>
      route({ data: { origin_lat: loc.lat, origin_lng: loc.lng, dest_lat: s.lat, dest_lng: s.lng } }),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><RouteIcon className="h-4 w-4" /> OSRM Evacuation Routing</CardTitle>
        <CardDescription>OpenStreetMap-based, no Google Maps</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {shelters?.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded border px-2 py-1">
            <span className="text-xs">{s.name} · {s.distance_km} km</span>
            <Button size="sm" variant="outline" onClick={() => m.mutate({ id: s.id, lat: s.lat, lng: s.lng })}>Route</Button>
          </div>
        ))}
        {m.data && (
          <div className="rounded border p-2 text-xs">
            <p><strong>{m.data.distance_km} km</strong> · {m.data.duration_min} min · safety {m.data.safety_score}</p>
            <p className="text-muted-foreground">Source: {m.data.source}</p>
            {m.data.warnings.map((w, i) => <p key={i} className="text-amber-600">⚠ {w}</p>)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TranslateCard() {
  const fn = useServerFn(translateText);
  const [text, setText] = useState("Heavy rainfall warning — Move to nearest shelter immediately");
  const [target, setTarget] = useState<"hindi" | "malayalam" | "tamil" | "telugu" | "bengali" | "odia">("malayalam");
  const m = useMutation({ mutationFn: () => fn({ data: { text, target } }) });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Languages className="h-4 w-4" /> Multilingual Alerts</CardTitle>
        <CardDescription>Template-based translation fallback (Bhashini-ready)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} />
        <div className="flex gap-2">
          <Select value={target} onValueChange={(v) => setTarget(v as typeof target)}>
            <SelectTrigger className="w-40"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="hindi">हिन्दी</SelectItem>
              <SelectItem value="malayalam">മലയാളം</SelectItem>
              <SelectItem value="tamil">தமிழ்</SelectItem>
              <SelectItem value="telugu">తెలుగు</SelectItem>
              <SelectItem value="bengali">বাংলা</SelectItem>
              <SelectItem value="odia">ଓଡ଼ିଆ</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>Translate</Button>
        </div>
        {m.data && <p className="rounded border p-2">{m.data.text} <span className="text-muted-foreground text-xs">({m.data.engine})</span></p>}
      </CardContent>
    </Card>
  );
}

function AlertCard() {
  const draft = useServerFn(draftAlert);
  const send = useServerFn(sendAlert);
  const list = useServerFn(listAlerts);
  const subsFn = useServerFn(getSubscriberCount);
  const { data: alerts, refetch } = useQuery({ queryKey: ["live:alerts"], queryFn: () => list() });
  const { data: subs, refetch: refetchSubs } = useQuery({ queryKey: ["live:subs"], queryFn: () => subsFn(), refetchInterval: 15000 });
  const [chatId, setChatId] = useState("");
  const [title, setTitle] = useState("Flood risk in your area");
  const [message, setMessage] = useState("Heavy rainfall expected. Move to nearest shelter immediately.");

  const m = useMutation({
    mutationFn: async () => {
      const a = await draft({ data: {
        title, message, severity: "warning", disaster: "flood",
        channels: ["telegram"], language: "english",
      } });
      const r = await send({ data: { id: a.id, telegram_chat_id: chatId || undefined } });
      return r;
    },
    onSuccess: (r) => {
      const summary = r.deliveries.map(d => `${d.channel}:${d.status}`).join(", ");
      const failed = r.deliveries.find(d => d.status === "failed");
      if (failed) {
        toast.error(`Broadcast failed — ${failed.provider_response.slice(0, 200)}`);
      } else {
        toast.success(`Alert sent: ${summary}`);
      }
      refetch();
    },
    onError: (e) => toast.error(String(e)),
  });

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Megaphone className="h-4 w-4" /> Alert Broadcast (real Telegram)</CardTitle>
        <CardDescription>Requires authority/admin role + Telegram chat_id</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="grid gap-2 md:grid-cols-2">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Telegram chat_id</Label>
            <Input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="123456789" />
          </div>
        </div>
        <div>
          <Label>Message</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} />
        </div>
        <Button onClick={() => m.mutate()} disabled={m.isPending}>{m.isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : "Draft & Broadcast"}</Button>
        <p className="pt-2 text-xs text-muted-foreground">Recent alerts:</p>
        <div className="space-y-1">
          {alerts?.slice(0, 5).map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded border px-2 py-1 text-xs">
              <span>{a.title}</span>
              <Badge variant="outline">{a.status} · {a.severity}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded border bg-muted/30 p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
