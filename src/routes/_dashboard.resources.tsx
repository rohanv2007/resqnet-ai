import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity, AlertTriangle, ArrowRight, Bot, Brain, Building2, Filter,
  MapPin, Phone, Search, Sparkles, Users, Waves, Wind, Flame, HeartPulse, Mountain,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingSkeleton } from "@/components/shared";

import {
  EMERGENCY_PLAYBOOK, RESOURCE_META, STATUS_META,
  generateResources, haversineKm,
  type EmergencyResource, type EmergencyResourceType, type ResourceStatus,
} from "@/lib/resources-engine";
import { INDIA_CENTER, INDIA_CITIES } from "@/lib/india-cities";
import { useRiskData } from "@/lib/hooks/useRiskData";
import { getResourceAIRecommendations } from "@/lib/resources-ai.functions";

const ResourceMap = lazy(() => import("@/components/map/ResourceMap"));

const ALL_TYPES = Object.keys(RESOURCE_META) as EmergencyResourceType[];
const ALL_STATUSES = Object.keys(STATUS_META) as ResourceStatus[];

function Page() {
  const { selectedLocation } = useRiskData();
  const [allResources] = useState(() => generateResources());

  // Filters
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<EmergencyResourceType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ResourceStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EmergencyResource | null>(null);
  const [scenario, setScenario] = useState<keyof typeof EMERGENCY_PLAYBOOK>("flood");

  const states = useMemo(
    () => Array.from(new Set(INDIA_CITIES.map((c) => c.state))).sort(),
    [],
  );
  const citiesInState = useMemo(
    () =>
      stateFilter === "all"
        ? []
        : INDIA_CITIES.filter((c) => c.state === stateFilter).map((c) => c.name).sort(),
    [stateFilter],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allResources.filter((r) => {
      if (stateFilter !== "all" && r.state !== stateFilter) return false;
      if (cityFilter !== "all" && r.city !== cityFilter) return false;
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (q && !`${r.name} ${r.city} ${r.state} ${r.district}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allResources, stateFilter, cityFilter, typeFilter, statusFilter, search]);

  // KPIs (over filtered scope)
  const kpis = useMemo(() => {
    const total = filtered.length;
    let available = 0, deployed = 0, enroute = 0, maintenance = 0, offline = 0, full = 0;
    let totalPersonnel = 0;
    for (const r of filtered) {
      totalPersonnel += r.personnel;
      switch (r.status) {
        case "available": available++; break;
        case "deployed": deployed++; break;
        case "en_route": enroute++; break;
        case "maintenance": maintenance++; break;
        case "offline": offline++; break;
        case "fully_utilized": full++; break;
      }
    }
    return { total, available, deployed, enroute, maintenance, offline, full, totalPersonnel };
  }, [filtered]);

  // State-wise distribution
  const stateBreakdown = useMemo(() => {
    const acc = new Map<string, { total: number; available: number; deployed: number }>();
    for (const r of filtered) {
      const e = acc.get(r.state) ?? { total: 0, available: 0, deployed: 0 };
      e.total++;
      if (r.status === "available") e.available++;
      if (r.status === "deployed" || r.status === "en_route") e.deployed++;
      acc.set(r.state, e);
    }
    return [...acc.entries()].map(([state, v]) => ({ state, ...v })).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [filtered]);

  // Nearest-N recommendation for active scenario, centered on selected location
  const recommendedDeployment = useMemo(() => {
    const playbook = EMERGENCY_PLAYBOOK[scenario];
    const center: [number, number] = [selectedLocation.lat, selectedLocation.lng];
    const result: Array<{ type: EmergencyResourceType; picks: Array<EmergencyResource & { distanceKm: number; etaMin: number }> }> = [];
    for (const t of playbook) {
      const pool = allResources
        .filter((r) => r.type === t && (r.status === "available" || r.status === "en_route"))
        .map((r) => {
          const distanceKm = haversineKm(center, [r.lat, r.lng]);
          const etaMin = Math.round((distanceKm / 50) * 60); // 50km/h surface
          return { ...r, distanceKm, etaMin };
        })
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 3);
      if (pool.length) result.push({ type: t, picks: pool });
    }
    return result.slice(0, 6);
  }, [allResources, scenario, selectedLocation.lat, selectedLocation.lng]);

  // Shelter & hospital intel
  const shelters = useMemo(() => filtered.filter((r) => r.type === "shelter" || r.type === "relief_camp"), [filtered]);
  const hospitals = useMemo(() => filtered.filter((r) => r.type === "hospital"), [filtered]);

  // AI recommendations (live)
  const aiFn = useServerFn(getResourceAIRecommendations);
  const aiCtx = useMemo(() => {
    const totals: Record<string, number> = {};
    const available: Record<string, number> = {};
    let deployed = 0;
    for (const r of filtered) {
      totals[r.type] = (totals[r.type] ?? 0) + 1;
      if (r.status === "available") available[r.type] = (available[r.type] ?? 0) + 1;
      if (r.status === "deployed" || r.status === "en_route") deployed++;
    }
    const shortages = ALL_TYPES.filter((t) => (totals[t] ?? 0) > 0 && (available[t] ?? 0) / Math.max(1, totals[t]) < 0.3);
    return {
      state: stateFilter !== "all" ? stateFilter : undefined,
      city: cityFilter !== "all" ? cityFilter : undefined,
      totals, available, deployed, shortages,
    };
  }, [filtered, stateFilter, cityFilter]);

  const { data: ai } = useQuery({
    queryKey: ["resource-ai", stateFilter, cityFilter],
    queryFn: () => aiFn({ data: { context: aiCtx } }),
    staleTime: 5 * 60_000,
  });

  const mapCenter: [number, number] = stateFilter === "all" && cityFilter === "all"
    ? INDIA_CENTER
    : [selectedLocation.lat, selectedLocation.lng];
  const mapZoom = cityFilter !== "all" ? 10 : stateFilter !== "all" ? 7 : 5;

  return (
    <div className="space-y-6">
      <PageHeader
        title="National Resource Operations"
        description="Real-time tracking, deployment intelligence, and nationwide coverage for NDMA · NDRF · SDRF · State EOCs."
        actions={
          <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1 text-xs">
            <Activity className="h-3.5 w-3.5 text-emerald-500" />
            Live · {kpis.total.toLocaleString()} assets in scope
          </Badge>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {[
          { label: "Total", value: kpis.total, color: "text-foreground" },
          { label: "Available", value: kpis.available, color: "text-emerald-600" },
          { label: "Deployed", value: kpis.deployed, color: "text-blue-600" },
          { label: "En Route", value: kpis.enroute, color: "text-cyan-600" },
          { label: "Maintenance", value: kpis.maintenance, color: "text-amber-600" },
          { label: "Fully Utilized", value: kpis.full, color: "text-red-600" },
          { label: "Offline", value: kpis.offline, color: "text-slate-500" },
          { label: "Personnel", value: kpis.totalPersonnel, color: "text-foreground" },
        ].map((k) => (
          <Card key={k.label} className="rounded-lg">
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k.label}</p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums ${k.color}`}>{k.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="rounded-lg">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search resource, city, district…" className="pl-8" />
          </div>
          <Select value={stateFilter} onValueChange={(v) => { setStateFilter(v); setCityFilter("all"); }}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All states" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All India</SelectItem>
              {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={cityFilter} onValueChange={setCityFilter} disabled={stateFilter === "all"}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All cities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All districts</SelectItem>
              {citiesInState.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as EmergencyResourceType | "all")}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All resource types</SelectItem>
              {ALL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{RESOURCE_META[t].emoji} {RESOURCE_META[t].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ResourceStatus | "all")}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => { setStateFilter("all"); setCityFilter("all"); setTypeFilter("all"); setStatusFilter("all"); setSearch(""); }}>Reset</Button>
        </CardContent>
      </Card>

      {/* Main: map + details */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="rounded-lg">
            <CardContent className="p-3">
              <Suspense fallback={<LoadingSkeleton variant="map" />}>
                <ResourceMap
                  resources={filtered}
                  center={mapCenter}
                  zoom={mapZoom}
                  onSelect={setSelected}
                  highlightId={selected?.id}
                />
              </Suspense>
              <Legend />
            </CardContent>
          </Card>
        </div>
        <DetailPanel resource={selected} center={[selectedLocation.lat, selectedLocation.lng]} />
      </div>

      <Tabs defaultValue="deployment">
        <TabsList>
          <TabsTrigger value="deployment"><Sparkles className="mr-1 h-3.5 w-3.5" /> Deployment Engine</TabsTrigger>
          <TabsTrigger value="list">Resource List</TabsTrigger>
          <TabsTrigger value="shelters"><Building2 className="mr-1 h-3.5 w-3.5" /> Shelters</TabsTrigger>
          <TabsTrigger value="hospitals"><HeartPulse className="mr-1 h-3.5 w-3.5" /> Hospitals</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="ai"><Brain className="mr-1 h-3.5 w-3.5" /> AI Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="deployment" className="mt-4 space-y-3">
          <Card className="rounded-lg">
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <p className="text-sm font-medium">Scenario:</p>
              {[
                { k: "flood", l: "Flood", I: Waves },
                { k: "cyclone", l: "Cyclone", I: Wind },
                { k: "earthquake", l: "Earthquake", I: Mountain },
                { k: "fire", l: "Fire", I: Flame },
                { k: "medical", l: "Medical Surge", I: HeartPulse },
                { k: "landslide", l: "Landslide", I: AlertTriangle },
              ].map(({ k, l, I }) => (
                <Button key={k} size="sm" variant={scenario === k ? "default" : "outline"} onClick={() => setScenario(k as keyof typeof EMERGENCY_PLAYBOOK)}>
                  <I className="h-3.5 w-3.5" /> {l}
                </Button>
              ))}
              <span className="ml-auto text-xs text-muted-foreground">Incident origin: <strong>{selectedLocation.name}, {selectedLocation.state}</strong></span>
            </CardContent>
          </Card>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recommendedDeployment.map(({ type, picks }) => (
              <Card key={type} className="rounded-lg">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{RESOURCE_META[type].emoji} {RESOURCE_META[type].label}</p>
                    <Badge variant="outline" className="text-[10px]">priority {picks.length ? "high" : "low"}</Badge>
                  </div>
                  {picks.map((p) => (
                    <div key={p.id} className="rounded-md border bg-muted/30 p-2.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">{p.name}</p>
                        <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-700">{STATUS_META[p.status].label}</span>
                      </div>
                      <p className="mt-0.5 text-muted-foreground">{p.city}, {p.state}</p>
                      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>📍 {p.distanceKm.toFixed(0)} km</span>
                        <span>⏱ ETA {p.etaMin} min</span>
                        <span>👥 {p.personnel}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.slice(0, 60).map((r) => <ResourceCard key={r.id} r={r} onClick={() => setSelected(r)} />)}
          </div>
          {filtered.length > 60 && (
            <p className="mt-3 text-center text-xs text-muted-foreground">Showing first 60 of {filtered.length.toLocaleString()} — narrow filters to see more.</p>
          )}
        </TabsContent>

        <TabsContent value="shelters" className="mt-4">
          <ShelterIntel shelters={shelters} />
        </TabsContent>

        <TabsContent value="hospitals" className="mt-4">
          <HospitalIntel hospitals={hospitals} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Analytics breakdown={stateBreakdown} resources={filtered} />
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <AIPanel items={ai?.items ?? []} live={ai?.ok ?? false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------- subcomponents ----------------

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
      {ALL_STATUSES.map((s) => (
        <span key={s} className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5">
          <span className="h-2 w-2 rounded-full" style={{ background: STATUS_META[s].color }} />
          {STATUS_META[s].label}
        </span>
      ))}
    </div>
  );
}

function ResourceCard({ r, onClick }: { r: EmergencyResource; onClick: () => void }) {
  const meta = RESOURCE_META[r.type];
  const load = r.capacity ? Math.round((r.currentLoad / r.capacity) * 100) : 0;
  return (
    <button onClick={onClick} className="text-left">
      <Card className="rounded-lg transition hover:shadow-md">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-md text-lg" style={{ background: `${meta.color}22`, color: meta.color }}>{meta.emoji}</span>
              <div>
                <p className="text-sm font-medium leading-tight">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.city}, {r.state}</p>
              </div>
            </div>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: `${STATUS_META[r.status].color}1a`, color: STATUS_META[r.status].color }}>{STATUS_META[r.status].label}</span>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
              <span>Capacity</span><span>{r.currentLoad}/{r.capacity}</span>
            </div>
            <Progress value={load} className="h-1.5" />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {r.personnel}</span>
            <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {r.contact}</span>
          </div>
          {r.assignment && <p className="text-[11px] text-blue-700 dark:text-blue-300">→ {r.assignment}</p>}
        </CardContent>
      </Card>
    </button>
  );
}

function DetailPanel({ resource, center }: { resource: EmergencyResource | null; center: [number, number] }) {
  if (!resource) {
    return (
      <Card className="rounded-lg">
        <CardContent className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center text-sm text-muted-foreground">
          <MapPin className="h-6 w-6" />
          <p>Click any resource on the map or list to view full details, assignment, contact, and distance from the incident origin.</p>
        </CardContent>
      </Card>
    );
  }
  const meta = RESOURCE_META[resource.type];
  const status = STATUS_META[resource.status];
  const distance = haversineKm(center, [resource.lat, resource.lng]);
  const eta = Math.round((distance / 50) * 60);
  return (
    <Card className="rounded-lg">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl" style={{ background: `${meta.color}22`, color: meta.color }}>{meta.emoji}</span>
          <div className="flex-1">
            <p className="text-base font-semibold leading-tight">{resource.name}</p>
            <p className="text-xs text-muted-foreground">{meta.label} · {resource.city}, {resource.state}</p>
          </div>
          <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: `${status.color}1a`, color: status.color }}>{status.label}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Capacity" value={`${resource.currentLoad}/${resource.capacity}`} />
          <Stat label="Personnel" value={resource.personnel} />
          <Stat label="Distance" value={`${distance.toFixed(1)} km`} />
          <Stat label="ETA (road)" value={`${eta} min`} />
        </div>
        {resource.type === "hospital" && (
          <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/40 p-3 text-sm">
            <Stat label="Beds free" value={`${resource.bedsAvailable ?? 0}/${resource.beds ?? 0}`} />
            <Stat label="ICU free" value={`${resource.icuAvailable ?? 0}/${resource.icu ?? 0}`} />
            <Stat label="Trauma" value={resource.trauma ? "Yes" : "No"} />
            <Stat label="Ambulances" value="Linked" />
          </div>
        )}
        {(resource.type === "shelter" || resource.type === "relief_camp") && (
          <div className="grid grid-cols-3 gap-3 rounded-md border bg-muted/40 p-3 text-sm">
            <Stat label="Food" value={resource.food ?? "—"} />
            <Stat label="Water" value={resource.water ?? "—"} />
            <Stat label="Medical" value={resource.medical ?? "—"} />
          </div>
        )}
        {resource.assignment && (
          <div className="rounded-md border-l-4 border-blue-500 bg-blue-500/10 p-3 text-xs">
            <p className="font-medium text-blue-700 dark:text-blue-200">Active assignment</p>
            <p className="text-blue-700/80 dark:text-blue-200/80">{resource.assignment}</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <a href={`tel:${resource.contact.replace(/\s+/g, "")}`}>
            <Button size="sm"><Phone className="h-3.5 w-3.5" /> {resource.contact}</Button>
          </a>
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${resource.lat},${resource.lng}`} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline"><MapPin className="h-3.5 w-3.5" /> Directions</Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}

function ShelterIntel({ shelters }: { shelters: EmergencyResource[] }) {
  const total = shelters.length;
  const occupied = shelters.filter((s) => s.currentLoad / s.capacity > 0.85).length;
  const available = total - occupied;
  const capacity = shelters.reduce((a, s) => a + s.capacity, 0);
  const occupancy = shelters.reduce((a, s) => a + s.currentLoad, 0);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiSmall label="Total shelters" value={total} />
        <KpiSmall label="Open beds" value={(capacity - occupancy).toLocaleString()} accent="text-emerald-600" />
        <KpiSmall label="Capacity" value={capacity.toLocaleString()} />
        <KpiSmall label="At capacity" value={occupied} accent="text-red-600" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shelters.slice(0, 30).map((s) => {
          const pct = s.capacity ? Math.round((s.currentLoad / s.capacity) * 100) : 0;
          return (
            <Card key={s.id} className="rounded-lg">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.city}, {s.state}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{pct}%</Badge>
                </div>
                <Progress value={pct} className="h-1.5" />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Beds {s.capacity - s.currentLoad}/{s.capacity}</span>
                  <span>👨‍⚕️ {s.medical}</span>
                </div>
                <div className="flex gap-1.5 text-[10px]">
                  <Badge variant="outline">🍱 {s.food}</Badge>
                  <Badge variant="outline">💧 {s.water}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function HospitalIntel({ hospitals }: { hospitals: EmergencyResource[] }) {
  const totalBeds = hospitals.reduce((a, h) => a + (h.beds ?? 0), 0);
  const freeBeds = hospitals.reduce((a, h) => a + (h.bedsAvailable ?? 0), 0);
  const icuFree = hospitals.reduce((a, h) => a + (h.icuAvailable ?? 0), 0);
  const trauma = hospitals.filter((h) => h.trauma).length;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiSmall label="Hospitals" value={hospitals.length} />
        <KpiSmall label="Free beds" value={freeBeds.toLocaleString()} accent="text-emerald-600" />
        <KpiSmall label="Free ICU" value={icuFree.toLocaleString()} accent="text-cyan-600" />
        <KpiSmall label="Trauma centers" value={trauma} accent="text-red-600" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {hospitals.slice(0, 30).map((h) => {
          const occ = h.beds ? Math.round((h.currentLoad / h.beds) * 100) : 0;
          return (
            <Card key={h.id} className="rounded-lg">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{h.name}</p>
                    <p className="text-xs text-muted-foreground">{h.city}, {h.state}</p>
                  </div>
                  {h.trauma && <Badge className="bg-red-500/15 text-red-600">Trauma</Badge>}
                </div>
                <Progress value={occ} className="h-1.5" />
                <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                  <span>Beds {h.bedsAvailable}/{h.beds}</span>
                  <span>ICU {h.icuAvailable}/{h.icu}</span>
                  <span>{occ}% occ</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        <p className="col-span-full text-center text-xs text-muted-foreground">{hospitals.length > 30 && `Showing 30 of ${hospitals.length} hospitals.`}</p>
      </div>
    </div>
  );
}

function Analytics({ breakdown, resources }: { breakdown: { state: string; total: number; available: number; deployed: number }[]; resources: EmergencyResource[] }) {
  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of resources) m[r.type] = (m[r.type] ?? 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [resources]);
  const max = breakdown[0]?.total ?? 1;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-lg">
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-semibold">Top states by resources in scope</p>
          {breakdown.map((s) => (
            <div key={s.state}>
              <div className="flex justify-between text-xs">
                <span>{s.state}</span>
                <span className="tabular-nums text-muted-foreground">{s.total} · <span className="text-emerald-600">{s.available} free</span> · <span className="text-blue-600">{s.deployed} active</span></span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded bg-muted">
                <div className="h-full bg-brand" style={{ width: `${(s.total / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="rounded-lg">
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-semibold">Resource mix in scope</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {typeCounts.map(([t, n]) => {
              const meta = RESOURCE_META[t as EmergencyResourceType];
              return (
                <div key={t} className="flex items-center justify-between rounded border bg-muted/40 px-2 py-1.5">
                  <span>{meta.emoji} {meta.label}</span>
                  <span className="font-semibold tabular-nums">{n.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AIPanel({ items, live }: { items: Array<{ title: string; detail: string; priority?: string; tag?: string }>; live: boolean }) {
  return (
    <Card className="rounded-lg">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-brand" />
          <p className="text-sm font-semibold">AI-driven resource recommendations</p>
          <Badge variant="outline" className="ml-auto text-[10px]">{live ? "Live · Lovable AI" : "Heuristic fallback"}</Badge>
        </div>
        <div className="space-y-2">
          {items.length === 0 && <p className="text-sm text-muted-foreground">Analyzing posture…</p>}
          {items.map((it, i) => (
            <div key={i} className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
              <ArrowRight className="mt-0.5 h-4 w-4 text-brand" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{it.title}</p>
                  {it.priority && <Badge variant="outline" className="text-[10px] capitalize">{it.priority}</Badge>}
                  {it.tag && <Badge variant="outline" className="text-[10px] capitalize">{it.tag}</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{it.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function KpiSmall({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <Card className="rounded-lg">
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 text-xl font-semibold tabular-nums ${accent ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

// Mount-only mounting guard for lazy map.
function MapMount(props: React.ComponentProps<typeof ResourceMap>) {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  if (!m) return <LoadingSkeleton variant="map" />;
  return <ResourceMap {...props} />;
}
// keep referenced to satisfy bundler if needed
void MapMount;

export const Route = createFileRoute("/_dashboard/resources")({ component: Page });
