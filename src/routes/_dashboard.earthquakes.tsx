import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Globe2,
  RefreshCw,
  Search,
  Waves,
  XCircle,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingSkeleton } from "@/components/shared";
import { getGlobalQuakes, type Quake } from "@/lib/earthquakes.functions";

const QuakeMap = lazy(() => import("@/components/map/QuakeMap"));

export const Route = createFileRoute("/_dashboard/earthquakes")({
  component: EarthquakesPage,
});

function severity(mag: number): { label: string; color: string } {
  if (mag >= 7) return { label: "Critical", color: "bg-red-900 text-white" };
  if (mag >= 6) return { label: "Severe", color: "bg-red-600 text-white" };
  if (mag >= 5) return { label: "Major", color: "bg-orange-500 text-white" };
  if (mag >= 4) return { label: "Moderate", color: "bg-amber-500 text-white" };
  return { label: "Minor", color: "bg-emerald-600 text-white" };
}

function impactRadiusKm(mag: number) {
  return Math.round(Math.pow(10, 0.5 * mag - 1.8));
}

function relativeTime(t: number) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

function EarthquakesPage() {
  const fetchQuakes = useServerFn(getGlobalQuakes);
  const [windowHours, setWindowHours] = useState(24);
  const [minMag, setMinMag] = useState(2.5);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState<string>("all");
  const [alertOnly, setAlertOnly] = useState<string>("any");
  const [selected, setSelected] = useState<Quake | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ["global-quakes", windowHours, minMag],
    queryFn: () => fetchQuakes({ data: { windowHours, minMagnitude: minMag } }),
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  // detect newly arrived events between polls
  const prevIdsRef = useMemo(() => ({ current: new Set<string>() }), []);
  useEffect(() => {
    if (!query.data) return;
    const ids = new Set(query.data.quakes.map((q) => q.id));
    const fresh = new Set<string>();
    if (prevIdsRef.current.size) {
      for (const id of ids) if (!prevIdsRef.current.has(id)) fresh.add(id);
    }
    prevIdsRef.current = ids;
    if (fresh.size) {
      setNewIds(fresh);
      const t = setTimeout(() => setNewIds(new Set()), 8000);
      return () => clearTimeout(t);
    }
  }, [query.data, prevIdsRef]);

  const data = query.data;
  const filtered = useMemo(() => {
    if (!data) return [] as Quake[];
    const q = search.trim().toLowerCase();
    return data.quakes.filter((x) => {
      if (country !== "all" && (x.country ?? "Unknown") !== country) return false;
      if (alertOnly === "tsunami" && !x.tsunami) return false;
      if (alertOnly === "alerted" && !x.alert) return false;
      if (q && !`${x.place} ${x.country ?? ""} ${x.id}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [data, search, country, alertOnly]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Global Earthquake Intelligence"
        description="Multi-agency seismic monitoring — USGS, EMSC, GeoNet, BMKG. Auto-refresh every 60s."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`}
            />
            Sync now
          </Button>
        }
      />

      {/* Ticker */}
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="flex items-center gap-3 border-b bg-muted/40 px-3 py-1.5 text-xs">
          <Activity className="h-3.5 w-3.5 text-emerald-500" />
          <span className="font-semibold uppercase tracking-wider">Live Wire</span>
          <span className="text-muted-foreground">
            {data ? `${data.stats.total} events · last sync ${relativeTime(data.generatedAt)}` : "syncing…"}
          </span>
        </div>
        <div className="relative h-9 overflow-hidden">
          <div className="absolute inset-y-0 left-0 flex animate-[ticker_60s_linear_infinite] items-center gap-8 whitespace-nowrap px-4 text-xs">
            {(data?.quakes ?? []).slice(0, 30).map((q) => {
              const s = severity(q.mag);
              return (
                <span key={q.id} className="flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 font-bold ${s.color}`}>
                    M{q.mag.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">{q.place}</span>
                  <span className="text-muted-foreground/70">· {relativeTime(q.time)}</span>
                  {q.tsunami && (
                    <span className="rounded bg-sky-700 px-1.5 py-0.5 text-white">TSUNAMI</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Source health */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Data feed status</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(data?.sources ?? []).map((s) => (
            <div
              key={s.name}
              className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
            >
              <div>
                <p className="text-xs text-muted-foreground">{s.name}</p>
                <p className="text-sm font-semibold">
                  {s.ok ? `${s.count} events` : "offline"}
                </p>
                <p className="text-[10px] text-muted-foreground">{s.latencyMs}ms</p>
              </div>
              {s.ok ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          ))}
          {!data && <LoadingSkeleton variant="card" />}
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <KPI label="Total" value={data?.stats.total} icon={<Globe2 className="h-4 w-4" />} />
        <KPI label="Last 24h" value={data?.stats.last24h} />
        <KPI label="M 4+" value={data?.stats.m4plus} tone="amber" />
        <KPI label="M 5+" value={data?.stats.m5plus} tone="orange" />
        <KPI label="M 6+" value={data?.stats.m6plus} tone="red" />
        <KPI label="M 7+" value={data?.stats.m7plus} tone="crimson" />
        <KPI label="Tsunami" value={data?.stats.tsunamiEvents} icon={<Waves className="h-4 w-4" />} tone="sky" />
      </div>

      {/* Strongest panel + map */}
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <StrongestPanel quake={data?.strongest ?? null} />
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm font-semibold">
                <span>Global seismic map</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Tectonic plates · heat halo · click markers
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<LoadingSkeleton variant="map" />}>
                <QuakeMap
                  quakes={filtered}
                  strongest={data?.strongest}
                  onSelect={setSelected}
                  height="520px"
                />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Search</label>
            <div className="relative mt-1">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Place, country, event ID…"
                className="pl-8"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Min magnitude: {minMag.toFixed(1)}
            </label>
            <Slider
              className="mt-3"
              min={1}
              max={7}
              step={0.5}
              value={[minMag]}
              onValueChange={(v) => setMinMag(v[0])}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Time window</label>
            <Select
              value={String(windowHours)}
              onValueChange={(v) => setWindowHours(Number(v))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 1h</SelectItem>
                <SelectItem value="6">Last 6h</SelectItem>
                <SelectItem value="24">Last 24h</SelectItem>
                <SelectItem value="72">Last 3 days</SelectItem>
                <SelectItem value="168">Last 7 days</SelectItem>
                <SelectItem value="720">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Country</label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {(data?.topCountries ?? []).map((c) => (
                    <SelectItem key={c.country} value={c.country}>
                      {c.country} ({c.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Alert</label>
              <Select value={alertOnly} onValueChange={setAlertOnly}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="alerted">PAGER alerted</SelectItem>
                  <SelectItem value="tsunami">Tsunami only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Frequency — last 24 hours
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer>
              <LineChart data={data?.hourly ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Magnitude distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer>
              <BarChart data={data?.buckets ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Most active countries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(data?.topCountries ?? []).slice(0, 8).map((c, i) => (
                <div key={c.country} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-5 text-xs text-muted-foreground">#{i + 1}</span>
                    {c.country}
                  </span>
                  <Badge variant="secondary">{c.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard + live feed */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Top 10 strongest — window
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <div className="space-y-2 pr-3">
                {(data?.top10 ?? []).map((q, i) => {
                  const s = severity(q.mag);
                  return (
                    <button
                      key={q.id}
                      onClick={() => setSelected(q)}
                      className="flex w-full items-center gap-3 rounded-lg border bg-card p-2 text-left transition hover:bg-muted/40"
                    >
                      <span className="w-6 text-xs text-muted-foreground">#{i + 1}</span>
                      <span className={`rounded px-2 py-1 text-xs font-bold ${s.color}`}>
                        M{q.mag.toFixed(1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{q.place}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {q.depthKm.toFixed(0)} km · {relativeTime(q.time)} · {q.sources.join("+")}
                        </p>
                      </div>
                      {q.tsunami && (
                        <Waves className="h-4 w-4 text-sky-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-semibold">
              <span>Live event feed</span>
              <Badge variant="outline" className="text-[10px]">
                {filtered.length} matching
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <div className="space-y-2 pr-3">
                {filtered.slice(0, 80).map((q) => {
                  const s = severity(q.mag);
                  const isNew = newIds.has(q.id);
                  return (
                    <button
                      key={q.id}
                      onClick={() => setSelected(q)}
                      className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition hover:bg-muted/40 ${
                        isNew ? "border-emerald-500 bg-emerald-500/10 animate-pulse" : "bg-card"
                      }`}
                    >
                      <span className={`rounded px-2 py-1 text-xs font-bold ${s.color}`}>
                        M{q.mag.toFixed(1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{q.place}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {q.depthKm.toFixed(0)} km · {relativeTime(q.time)} · conf {q.confidence}%
                        </p>
                      </div>
                      {isNew && <Badge className="bg-emerald-600 text-[10px]">NEW</Badge>}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Detail drawer */}
      {selected && (
        <Card className="border-orange-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm font-semibold">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Event detail
              </span>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                Close
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QuakeDetail q={selected} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPI({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value?: number;
  icon?: React.ReactNode;
  tone?: "amber" | "orange" | "red" | "crimson" | "sky";
}) {
  const toneCls =
    tone === "crimson"
      ? "text-red-900"
      : tone === "red"
        ? "text-red-600"
        : tone === "orange"
          ? "text-orange-500"
          : tone === "amber"
            ? "text-amber-500"
            : tone === "sky"
              ? "text-sky-500"
              : "text-foreground";
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <p className={`mt-1 text-2xl font-bold ${toneCls}`}>
          {value ?? "—"}
        </p>
      </CardContent>
    </Card>
  );
}

function StrongestPanel({ quake }: { quake: Quake | null }) {
  if (!quake) {
    return (
      <Card className="border-red-500/40">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Strongest event</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Awaiting data…</p>
        </CardContent>
      </Card>
    );
  }
  const s = severity(quake.mag);
  return (
    <Card className="border-red-500/50 bg-gradient-to-b from-red-500/10 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-500">
          <Zap className="h-4 w-4 animate-pulse" />
          Strongest event
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <span className={`rounded-md px-3 py-1.5 text-lg font-black ${s.color}`}>
            M {quake.mag.toFixed(1)}
          </span>
          <div>
            <p className="text-sm font-semibold">{quake.place}</p>
            <p className="text-[11px] text-muted-foreground">
              {new Date(quake.time).toUTCString()}
            </p>
          </div>
        </div>
        <Separator />
        <dl className="grid grid-cols-2 gap-y-1.5 text-xs">
          <dt className="text-muted-foreground">Country</dt>
          <dd>{quake.country ?? "—"}</dd>
          <dt className="text-muted-foreground">Depth</dt>
          <dd>{quake.depthKm.toFixed(1)} km</dd>
          <dt className="text-muted-foreground">Coords</dt>
          <dd>{quake.lat.toFixed(3)}, {quake.lng.toFixed(3)}</dd>
          <dt className="text-muted-foreground">Tsunami</dt>
          <dd>
            {quake.tsunami ? (
              <Badge className="bg-sky-700 text-white">YES</Badge>
            ) : (
              "No"
            )}
          </dd>
          <dt className="text-muted-foreground">Sources</dt>
          <dd>{quake.sources.join(", ")}</dd>
          <dt className="text-muted-foreground">Confidence</dt>
          <dd>{quake.confidence}%</dd>
          <dt className="text-muted-foreground">Impact radius</dt>
          <dd>~{impactRadiusKm(quake.mag)} km</dd>
        </dl>
        <Separator />
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recommended actions
          </p>
          <ul className="space-y-1 text-xs">
            {quake.mag >= 7 && <li>• Activate national response — request EOC coordination</li>}
            {quake.mag >= 6 && <li>• Dispatch USAR teams & damage assessment crews</li>}
            {quake.tsunami && <li>• Issue coastal evacuation, monitor tide gauges</li>}
            {quake.mag >= 5 && <li>• Inspect critical infrastructure within {impactRadiusKm(quake.mag)} km</li>}
            <li>• Cross-verify with {quake.sources.length} reporting agencies</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function QuakeDetail({ q }: { q: Quake }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <dl className="grid grid-cols-2 gap-y-1.5 text-xs">
        <dt className="text-muted-foreground">Event ID</dt>
        <dd className="font-mono">{q.id}</dd>
        <dt className="text-muted-foreground">Magnitude</dt>
        <dd>{q.mag.toFixed(2)} {q.magType ? `(${q.magType})` : ""}</dd>
        <dt className="text-muted-foreground">Location</dt>
        <dd>{q.place}</dd>
        <dt className="text-muted-foreground">Country</dt>
        <dd>{q.country ?? "—"}</dd>
        <dt className="text-muted-foreground">Depth</dt>
        <dd>{q.depthKm.toFixed(1)} km</dd>
        <dt className="text-muted-foreground">Coordinates</dt>
        <dd>{q.lat.toFixed(4)}, {q.lng.toFixed(4)}</dd>
        <dt className="text-muted-foreground">Time (UTC)</dt>
        <dd>{new Date(q.time).toUTCString()}</dd>
        <dt className="text-muted-foreground">Tsunami</dt>
        <dd>{q.tsunami ? "Warning issued" : "No warning"}</dd>
        <dt className="text-muted-foreground">PAGER alert</dt>
        <dd>{q.alert ?? "—"}</dd>
      </dl>
      <div className="space-y-3 text-xs">
        <div>
          <p className="font-semibold">Reporting agencies ({q.sources.length})</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {q.sources.map((s) => (
              <Badge key={s} variant="outline">{s}</Badge>
            ))}
          </div>
          <p className="mt-1 text-muted-foreground">
            Confidence: <span className="font-semibold text-foreground">{q.confidence}%</span>
          </p>
        </div>
        <div>
          <p className="font-semibold">Estimated impact</p>
          <p className="text-muted-foreground">
            Felt radius ≈ {impactRadiusKm(q.mag)} km · severity {severity(q.mag).label}
          </p>
        </div>
        {q.url && (
          <a
            href={q.url}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-xs font-medium text-sky-600 hover:underline"
          >
            Open authoritative report →
          </a>
        )}
      </div>
    </div>
  );
}
