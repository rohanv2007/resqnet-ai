import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatDistanceToNowStrict } from "date-fns";
import {
  AlertTriangle, Activity, Flame, CloudRain, Wind, Mountain, Droplets,
  Sun, Zap, Cloud, Search, Layers, Radio, Loader2, MapPin,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSkeleton } from "@/components/shared";
import { PageHeader } from "@/components/layout/PageHeader";

import {
  getIndiaRiskBundle, geocodeIndia,
  type HazardKind, type HazardPoint,
} from "@/lib/india-risk.functions";
import { INDIA_CENTER } from "@/lib/india-cities";

const IndiaRiskMap = lazy(() => import("@/components/map/IndiaRiskMap"));

const HAZARDS: { id: HazardKind; label: string; icon: typeof Flame; color: string }[] = [
  { id: "flood",       label: "Flood",       icon: CloudRain, color: "text-sky-400" },
  { id: "earthquake",  label: "Earthquake",  icon: Activity,  color: "text-amber-400" },
  { id: "cyclone",     label: "Cyclone",     icon: Wind,      color: "text-cyan-400" },
  { id: "heatwave",    label: "Heatwave",    icon: Sun,       color: "text-orange-400" },
  { id: "landslide",   label: "Landslide",   icon: Mountain,  color: "text-yellow-700" },
  { id: "drought",     label: "Drought",     icon: Droplets,  color: "text-amber-300" },
  { id: "wildfire",    label: "Wildfire",    icon: Flame,     color: "text-red-500" },
  { id: "lightning",   label: "Lightning",   icon: Zap,       color: "text-yellow-300" },
  { id: "air_quality", label: "Air Quality", icon: Cloud,     color: "text-slate-400" },
];

const SEV_BADGE: Record<string, string> = {
  low: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  watch: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  warning: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  danger: "bg-red-500/15 text-red-300 border-red-500/30",
};

function Page() {
  const fn = useServerFn(getIndiaRiskBundle);
  const geocode = useServerFn(geocodeIndia);

  const { data, isLoading, dataUpdatedAt, refetch, isFetching } = useQuery({
    queryKey: ["india-risk-bundle"],
    queryFn: () => fn(),
    refetchInterval: 120_000,
    staleTime: 60_000,
  });

  const [enabled, setEnabled] = useState<Set<HazardKind>>(
    () => new Set(HAZARDS.map((h) => h.id)),
  );
  const [heatmap, setHeatmap] = useState(true);
  const [view, setView] = useState<{ center: [number, number]; zoom: number }>({
    center: INDIA_CENTER, zoom: 5,
  });
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [searching, setSearching] = useState(false);
  const [focus, setFocus] = useState<{ lat: number; lng: number; label?: string } | null>(null);
  const [selected, setSelected] = useState<HazardPoint | null>(null);
  const [minSeverity, setMinSeverity] = useState<"low" | "watch" | "warning" | "danger">("low");

  // Debounced search
  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = window.setTimeout(async () => {
      setSearching(true);
      try {
        const r = await geocode({ data: { q: search } });
        setResults(r);
      } finally { setSearching(false); }
    }, 350);
    return () => window.clearTimeout(t);
  }, [search, geocode]);

  const points = data?.points ?? [];
  const sevRank = { low: 0, watch: 1, warning: 2, danger: 3 };
  const filteredPoints = useMemo(
    () => points.filter((p) => sevRank[p.severity] >= sevRank[minSeverity]),
    [points, minSeverity],
  );

  const toggleHazard = (h: HazardKind) => {
    setEnabled((cur) => {
      const next = new Set(cur);
      if (next.has(h)) next.delete(h); else next.add(h);
      return next;
    });
  };

  const stats = data?.counts ?? ({} as Record<HazardKind, number>);
  const ticker = data?.ticker ?? [];
  const states = data?.states ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="India Risk Map"
        description="Live national disaster intelligence — USGS · NASA FIRMS · Open-Meteo (IMD-aligned thresholds) · OSM"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">
              <Radio className="mr-1 h-3 w-3 animate-pulse" /> LIVE
            </Badge>
            {dataUpdatedAt ? (
              <span className="text-xs text-muted-foreground">
                Updated {formatDistanceToNowStrict(new Date(dataUpdatedAt), { addSuffix: true })}
              </span>
            ) : null}
            <Button size="sm" variant="outline" disabled={isFetching} onClick={() => refetch()}>
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>
        }
      />

      {/* National status strip */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {[
          { label: "Active hazards", value: filteredPoints.length, sub: "across India" },
          { label: "Critical events", value: filteredPoints.filter((p) => p.severity === "danger").length, sub: "severity = danger" },
          { label: "Earthquakes 30d", value: stats.earthquake ?? 0, sub: "M ≥ 3.0" },
          { label: "Wildfires 24h", value: stats.wildfire ?? 0, sub: "FIRMS hotspots" },
          { label: "Cities monitored", value: data?.cityRisks.length ?? 0, sub: "all states & UTs" },
        ].map((s) => (
          <Card key={s.label} className="rounded-lg">
            <CardContent className="p-3">
              <div className="text-xs uppercase text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-semibold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_1fr_320px]">
        {/* LEFT — layers, search, sources */}
        <div className="space-y-3">
          <Card className="rounded-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Search className="h-4 w-4" /> Search any location in India
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                placeholder="e.g. Wayanad, Patna, Sundarbans…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {searching ? <p className="text-xs text-muted-foreground">Searching…</p> : null}
              {results.length > 0 ? (
                <ScrollArea className="max-h-48">
                  <div className="space-y-1">
                    {results.map((r) => (
                      <button
                        key={`${r.lat}-${r.lng}`}
                        className="w-full rounded border border-border/60 bg-background/60 px-2 py-1.5 text-left text-xs hover:bg-muted"
                        onClick={() => {
                          setFocus({ lat: r.lat, lng: r.lng, label: r.name });
                          setView({ center: [r.lat, r.lng], zoom: 10 });
                          setResults([]); setSearch(r.name.split(",")[0]);
                        }}
                      >
                        <MapPin className="mr-1 inline h-3 w-3" /> {r.name}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              ) : null}
              <Button size="sm" variant="outline" className="w-full"
                onClick={() => { setView({ center: INDIA_CENTER, zoom: 5 }); setFocus(null); }}>
                Reset to India view
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Layers className="h-4 w-4" /> Hazard layers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {HAZARDS.map((h) => {
                const Icon = h.icon;
                const count = stats[h.id] ?? 0;
                return (
                  <label key={h.id} className="flex items-center justify-between rounded-md border border-border/50 bg-background/40 px-2 py-1.5 text-sm">
                    <span className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${h.color}`} />
                      {h.label}
                      <Badge variant="outline" className="ml-1 text-[10px]">{count}</Badge>
                    </span>
                    <Switch checked={enabled.has(h.id)} onCheckedChange={() => toggleHazard(h.id)} />
                  </label>
                );
              })}
              <label className="mt-2 flex items-center justify-between rounded-md border border-border/50 bg-background/40 px-2 py-1.5 text-sm">
                <span>Heatmap halos</span>
                <Switch checked={heatmap} onCheckedChange={setHeatmap} />
              </label>
              <div className="pt-2">
                <p className="mb-1 text-xs uppercase text-muted-foreground">Minimum severity</p>
                <div className="flex flex-wrap gap-1">
                  {(["low","watch","warning","danger"] as const).map((s) => (
                    <button key={s}
                      onClick={() => setMinSeverity(s)}
                      className={`rounded-full border px-2 py-0.5 text-[11px] capitalize ${minSeverity === s ? SEV_BADGE[s] : "border-border/40 text-muted-foreground"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Data source health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-xs">
              {(data?.sources ?? []).map((s) => (
                <div key={s.id} className="flex items-center justify-between">
                  <span>{s.name}</span>
                  <Badge variant="outline" className={
                    s.status === "live" ? "border-emerald-500/40 text-emerald-300"
                    : s.status === "advisory-only" || s.status === "cross-checked via USGS" ? "border-slate-500/40 text-slate-400"
                    : s.status === "unconfigured" ? "border-red-500/40 text-red-300"
                    : "border-amber-500/40 text-amber-300"
                  }>
                    {s.status}
                  </Badge>
                </div>
              ))}
              <p className="pt-1 text-[11px] text-muted-foreground">
                IMD / CWC / NCS / NDMA bulletins are cross-referenced; live APIs require government partnership.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CENTER — map */}
        <div className="space-y-3">
          {isLoading ? (
            <LoadingSkeleton variant="map" />
          ) : (
            <Suspense fallback={<LoadingSkeleton variant="map" />}>
              <IndiaRiskMap
                center={view.center}
                zoom={view.zoom}
                points={filteredPoints}
                enabledLayers={enabled}
                showHeatmap={heatmap}
                focusMarker={focus}
                onSelect={setSelected}
              />
            </Suspense>
          )}

          {selected ? (
            <Card className="rounded-lg border-amber-500/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{selected.title}</span>
                  <Badge variant="outline" className={SEV_BADGE[selected.severity]}>
                    {selected.severity.toUpperCase()} · {selected.score.toFixed(0)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>{selected.detail}</p>
                <p className="text-xs text-muted-foreground">
                  {selected.source} · {new Date(selected.timestamp).toLocaleString()} ·{" "}
                  {selected.lat.toFixed(3)}, {selected.lng.toFixed(3)}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* RIGHT — live feed + states */}
        <div className="space-y-3">
          <Card className="rounded-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-400" /> Live incident feed
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-80">
                <div className="divide-y divide-border/50">
                  {ticker.map((p) => (
                    <button key={p.id}
                      className="w-full px-3 py-2 text-left hover:bg-muted/40"
                      onClick={() => { setFocus({ lat: p.lat, lng: p.lng, label: p.title }); setView({ center: [p.lat, p.lng], zoom: 8 }); setSelected(p); }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{p.title}</span>
                        <Badge variant="outline" className={`text-[10px] ${SEV_BADGE[p.severity]}`}>{p.severity}</Badge>
                      </div>
                      <p className="line-clamp-1 text-[11px] text-muted-foreground">{p.detail}</p>
                      <p className="text-[10px] text-muted-foreground/70">
                        {p.source} · {formatDistanceToNowStrict(new Date(p.timestamp), { addSuffix: true })}
                      </p>
                    </button>
                  ))}
                  {ticker.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs text-muted-foreground">No active hazards detected.</p>
                  ) : null}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Highest-risk states</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-64">
                <div className="divide-y divide-border/50">
                  {states.slice(0, 18).map((s) => (
                    <div key={s.state} className="flex items-center justify-between px-3 py-2 text-xs">
                      <div>
                        <div className="font-medium">{s.state}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {(s.population / 1_000_000).toFixed(1)}M people · {s.cities} cities
                        </div>
                      </div>
                      <Badge variant="outline" className={SEV_BADGE[s.level]}>
                        {s.max.toFixed(0)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_dashboard/risk-map")({
  component: Page,
});
