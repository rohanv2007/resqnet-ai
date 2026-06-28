import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Ambulance,
  CheckCircle2,
  CloudRain,
  Gauge,
  LifeBuoy,
  MapPin,
  Megaphone,
  Pause,
  Play,
  Radar,
  Radio,
  RotateCcw,
  Ship,
  Siren,
  Truck,
  Users,
  Wind,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/PageHeader";
import { MapView } from "@/components/map";
import { ConfidenceBar, StatusBadge } from "@/components/shared";
import { disasterIcons, disasterLabels } from "@/lib/labels";
import { useRiskData } from "@/lib/hooks/useRiskData";
import { haversineKm, scoreToLevel } from "@/lib/resq/risk-core";
import type { DisasterType, RiskLevel } from "@/types";

const disasterTypes: DisasterType[] = [
  "flood",
  "cyclone",
  "rainfall",
  "urban_fire",
  "earthquake",
  "wildfire",
];

const horizons = [3, 6, 12, 24] as const;

interface SimParams {
  disaster: DisasterType;
  rainfall_mm: number;
  wind_speed_kmh: number;
  river_level_pct: number;
  fire_spread_rate: number;
  earthquake_magnitude: number;
  duration_hours: number;
}

interface SimFrame {
  hour: number;
  intensity: number;
  radius_m: number;
  flood_depth_cm: number;
  rainfall_rate: number;
  wind_now: number;
  affected_population: number;
  evacuated: number;
  shelters_in_zone: number;
  reports_in_zone: number;
  roads_blocked: number;
  power_outages: number;
  medical_cases: number;
  rescue_requests: number;
  distress_reports: number;
  evacuation_time_h: number;
  level: RiskLevel;
  confidence: number;
}

// Seeded PRNG so events are stable per scenario but vary across scenarios.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashParams(p: SimParams) {
  const s = `${p.disaster}|${p.rainfall_mm}|${p.wind_speed_kmh}|${p.river_level_pct}|${p.fire_spread_rate}|${p.earthquake_magnitude}|${p.duration_hours}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pressureFor(p: SimParams): number {
  switch (p.disaster) {
    case "flood":
      return p.rainfall_mm * 0.5 + p.river_level_pct * 0.6 + p.wind_speed_kmh * 0.05;
    case "rainfall":
      return p.rainfall_mm * 0.85 + p.wind_speed_kmh * 0.1;
    case "cyclone":
      return p.wind_speed_kmh * 0.85 + p.rainfall_mm * 0.25;
    case "urban_fire":
      return p.fire_spread_rate * 1.1 + p.wind_speed_kmh * 0.25;
    case "wildfire":
      return p.fire_spread_rate * 0.9 + p.wind_speed_kmh * 0.4;
    case "earthquake":
      return p.earthquake_magnitude * 14 + 10;
  }
}

function radiusKmFor(disaster: DisasterType, intensity: number, hoursElapsed: number) {
  const perHour: Record<DisasterType, number> = {
    flood: 0.35,
    rainfall: 0.25,
    cyclone: 1.2,
    urban_fire: 0.18,
    wildfire: 0.55,
    earthquake: 0,
  };
  const base =
    disaster === "earthquake"
      ? Math.max(2, intensity / 6)
      : Math.max(1.2, intensity / 14);
  return base + perHour[disaster] * intensity * 0.03 * hoursElapsed;
}

// Asymmetric impact lobes — wind-driven plume + secondary fronts.
function buildLobes(
  center: [number, number],
  radiusM: number,
  windKmh: number,
  level: RiskLevel,
  intensity: number,
): { lat: number; lng: number; radius: number; level: RiskLevel }[] {
  const windFactor = Math.min(1.5, 0.6 + windKmh / 120);
  const elongate = radiusM * windFactor;
  const off = elongate / 111_000; // approx deg per meter (lat)
  return [
    { lat: center[0], lng: center[1], radius: radiusM, level },
    {
      lat: center[0] + off * 0.45,
      lng: center[1] + off * 0.6,
      radius: Math.round(radiusM * 0.7),
      level: scoreToLevel(Math.min(100, intensity + 10)),
    },
    {
      lat: center[0] - off * 0.3,
      lng: center[1] + off * 0.4,
      radius: Math.round(radiusM * 0.5),
      level: scoreToLevel(Math.max(20, intensity - 15)),
    },
    {
      lat: center[0] + off * 0.2,
      lng: center[1] - off * 0.55,
      radius: Math.round(radiusM * 0.4),
      level: scoreToLevel(Math.max(20, intensity - 25)),
    },
  ];
}

function computeFrame(
  p: SimParams,
  hour: number,
  population: number,
  shelters: { lat: number; lng: number }[],
  reports: { lat: number; lng: number }[],
  center: [number, number],
): SimFrame {
  const intensity = Math.min(100, Math.round(pressureFor(p)));
  const radius_km = radiusKmFor(p.disaster, intensity, hour);
  const radius_m = Math.round(radius_km * 1000);

  const areaFactor = Math.PI * radius_km * radius_km;
  const densityProxy = Math.max(800, population / 25);
  const affected_population = Math.min(
    population,
    Math.round(areaFactor * densityProxy * (intensity / 100)),
  );

  // Evacuation ramp — accelerates after T+1h, caps at 78% of affected.
  const evacRate = Math.max(0, Math.min(0.78, (hour - 0.6) * 0.18));
  const evacuated = Math.round(affected_population * evacRate);

  const shelters_in_zone = shelters.filter(
    (s) => haversineKm(center, [s.lat, s.lng]) <= radius_km,
  ).length;
  const reports_in_zone = reports.filter(
    (r) => haversineKm(center, [r.lat, r.lng]) <= radius_km,
  ).length;

  // Flood depth (cm) — driven by rainfall + river + duration
  const flood_depth_cm =
    p.disaster === "flood" || p.disaster === "rainfall"
      ? Math.round(
          (p.rainfall_mm * 0.18 + p.river_level_pct * 0.25) *
            Math.min(1.4, 0.4 + hour / 4),
        )
      : 0;

  // Road blockages from flood depth + rainfall intensity + traffic proxy (reports)
  const roads_blocked =
    Math.round(
      flood_depth_cm * 0.18 +
        (p.rainfall_mm / 10) +
        intensity / 14 +
        reports_in_zone * 0.5,
    ) + 1;

  const power_outages = Math.round(intensity / 8 + p.wind_speed_kmh / 18 + hour);
  const medical_cases = Math.round(affected_population * 0.0008 * (intensity / 60));
  const rescue_requests = Math.round(affected_population * 0.0012 * (intensity / 50));
  const distress_reports = Math.round(rescue_requests * 1.6 + medical_cases * 1.1);

  const evacuation_time_h = +(1.5 + intensity / 28 + radius_km * 0.15).toFixed(1);
  const confidence = Math.min(
    95,
    62 + Math.round(intensity / 8) + Math.round(hour / 2),
  );

  return {
    hour,
    intensity,
    radius_m,
    flood_depth_cm,
    rainfall_rate: Math.round(p.rainfall_mm * (0.4 + Math.sin(hour / 2) * 0.3) * 0.6),
    wind_now: Math.round(p.wind_speed_kmh * (0.7 + Math.sin(hour / 3) * 0.25)),
    affected_population,
    evacuated,
    shelters_in_zone,
    reports_in_zone,
    roads_blocked,
    power_outages,
    medical_cases,
    rescue_requests,
    distress_reports,
    evacuation_time_h,
    level: scoreToLevel(intensity),
    confidence,
  };
}

type SimEvent = {
  t: number; // hour
  kind: "flood" | "power" | "rescue" | "medical" | "road" | "shelter" | "alert" | "deploy";
  text: string;
};

function buildEventTimeline(
  p: SimParams,
  frames: SimFrame[],
  rng: () => number,
  locName: string,
): SimEvent[] {
  const events: SimEvent[] = [];
  const wards = [
    "Adyar", "Velachery", "T. Nagar", "Mylapore", "Triplicane", "Royapuram",
    "Tondiarpet", "Anna Nagar", "Perambur", "Vyasarpadi", "Kotturpuram", "Saidapet",
  ];
  const ward = () => wards[Math.floor(rng() * wards.length)];

  events.push({ t: 0, kind: "alert", text: `Scenario initialized for ${locName}. Monitoring active.` });
  events.push({ t: 0.1, kind: "deploy", text: `EOC opened. NDRF Team Alpha on standby.` });

  frames.forEach((f, i) => {
    if (i === 0) return;
    const prev = frames[i - 1];
    if (f.flood_depth_cm >= 30 && prev.flood_depth_cm < 30)
      events.push({ t: f.hour, kind: "flood", text: `Knee-deep water reported in ${ward()} (${f.flood_depth_cm} cm).` });
    if (f.flood_depth_cm >= 60 && prev.flood_depth_cm < 60)
      events.push({ t: f.hour, kind: "flood", text: `Waist-deep flooding in ${ward()}. Vehicles stranded.` });
    if (f.roads_blocked > prev.roads_blocked && rng() > 0.5)
      events.push({ t: f.hour, kind: "road", text: `Arterial road in ${ward()} blocked — traffic diverted.` });
    if (f.power_outages > prev.power_outages && rng() > 0.55)
      events.push({ t: f.hour, kind: "power", text: `Power feeder tripped in ${ward()} sector.` });
    if (f.rescue_requests > prev.rescue_requests + 4 && rng() > 0.4)
      events.push({ t: f.hour, kind: "rescue", text: `Rescue request: family stranded on rooftop, ${ward()}.` });
    if (f.medical_cases > prev.medical_cases + 1 && rng() > 0.5)
      events.push({ t: f.hour, kind: "medical", text: `Medical emergency dispatch to ${ward()}.` });
    if (i === Math.floor(frames.length * 0.25))
      events.push({ t: f.hour, kind: "deploy", text: `5 rescue boats deployed to low-lying zones.` });
    if (i === Math.floor(frames.length * 0.4))
      events.push({ t: f.hour, kind: "shelter", text: `Community shelter opened. Capacity 800.` });
    if (i === Math.floor(frames.length * 0.55))
      events.push({ t: f.hour, kind: "alert", text: `Red alert broadcast via SMS + Telegram to subscribers.` });
    if (i === Math.floor(frames.length * 0.7))
      events.push({ t: f.hour, kind: "deploy", text: `Chennai Corp + NDRF: 3 ambulances + 2 relief trucks dispatched.` });
  });
  return events.sort((a, b) => a.t - b.t);
}

function Page_simulation() {
  const { selectedLocation, shelters, reports, resources, weather } = useRiskData();
  const center: [number, number] = [selectedLocation.lat, selectedLocation.lng];

  const [params, setParams] = useState<SimParams>({
    disaster: "flood",
    rainfall_mm: 120,
    wind_speed_kmh: 45,
    river_level_pct: 75,
    fire_spread_rate: 20,
    earthquake_magnitude: 4.5,
    duration_hours: 6,
  });
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !weather) return;
    seededRef.current = true;
    setParams((p) => ({
      ...p,
      rainfall_mm: Math.max(p.rainfall_mm, Math.round((weather.rainfall_mm_24h ?? 0) + 30)),
      wind_speed_kmh: Math.max(p.wind_speed_kmh, Math.round(weather.wind_speed_kmh ?? 30)),
    }));
  }, [weather]);

  const frames = useMemo<SimFrame[]>(() => {
    const out: SimFrame[] = [];
    const totalSteps = Math.max(24, params.duration_hours * 4); // 15-min resolution
    for (let i = 0; i <= totalSteps; i++) {
      const hour = (i / totalSteps) * params.duration_hours;
      out.push(
        computeFrame(
          params,
          hour,
          selectedLocation.population ?? 250_000,
          shelters,
          reports,
          center,
        ),
      );
    }
    return out;
  }, [params, selectedLocation, shelters, reports, center]);

  const eventsAll = useMemo(
    () => buildEventTimeline(params, frames, mulberry32(hashParams(params)), selectedLocation.name),
    [params, frames, selectedLocation.name],
  );

  const [running, setRunning] = useState(false);
  const [replay, setReplay] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    if (!running) return;
    const DURATION_MS = replay ? 18_000 : 9_000;
    startedAtRef.current = performance.now() - (stepIndex / (frames.length - 1)) * DURATION_MS;
    const tick = (t: number) => {
      const progress = Math.min(1, (t - startedAtRef.current) / DURATION_MS);
      const idx = Math.round(progress * (frames.length - 1));
      setStepIndex(idx);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
      else setRunning(false);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, frames.length]);

  const current = frames[Math.min(stepIndex, frames.length - 1)];

  const impactZones = useMemo(() => {
    if (!current) return [];
    return buildLobes(center, current.radius_m, current.wind_now, current.level, current.intensity);
  }, [current, center]);

  const chartData = frames.slice(0, stepIndex + 1).map((f) => ({
    hour: +f.hour.toFixed(2),
    affected: f.affected_population,
    evacuated: f.evacuated,
    intensity: f.intensity,
    rainfall: f.rainfall_rate,
    wind: f.wind_now,
    flood: f.flood_depth_cm,
    roads: f.roads_blocked,
  }));

  const peak = frames.reduce((a, b) => (b.affected_population > a.affected_population ? b : a), frames[0]);
  const visibleEvents = eventsAll.filter((e) => e.t <= (current?.hour ?? 0)).slice(-12).reverse();

  // Real-time shelter occupancy: cumulative evacuated distributed across nearest shelters.
  const sheltersLive = useMemo(() => {
    if (!current) return [];
    const ranked = shelters
      .map((s) => ({ s, km: haversineKm(center, [s.lat, s.lng]) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 8);
    const totalCap = ranked.reduce((sum, r) => sum + (r.s.capacity || 200), 0) || 1;
    return ranked.map(({ s, km }) => {
      const share = (s.capacity || 200) / totalCap;
      const incoming = Math.round(current.evacuated * share);
      const occupancy = Math.min((s.capacity || 200), (s.occupancy || 0) + incoming);
      return { s, km, occupancy, incoming };
    });
  }, [current, shelters, center]);

  // Resource deployment derived from intensity ramp + available pool.
  const resourceDeployment = useMemo(() => {
    if (!current) return [];
    const ramp = Math.min(1, current.hour / Math.max(1, params.duration_hours * 0.6));
    const pool = (resources?.length ?? 0) || 24;
    const boats = Math.round(Math.min(12, (current.flood_depth_cm / 12 + 2) * ramp));
    const ambulances = Math.round(Math.min(15, (current.medical_cases / 3 + 2) * ramp));
    const rescueTeams = Math.round(Math.min(10, (current.rescue_requests / 8 + 2) * ramp));
    const reliefTrucks = Math.round(Math.min(20, (current.affected_population / 8000 + 1) * ramp));
    return [
      { label: "Rescue Boats", icon: Ship, deployed: boats, total: 14, color: "#2563EB" },
      { label: "Ambulances", icon: Ambulance, deployed: ambulances, total: 18, color: "#DC2626" },
      { label: "Rescue Teams", icon: LifeBuoy, deployed: rescueTeams, total: 12, color: "#7C3AED" },
      { label: "Relief Trucks", icon: Truck, deployed: reliefTrucks, total: Math.max(20, pool), color: "#16A34A" },
    ];
  }, [current, params.duration_hours, resources]);

  // Live distress markers — sample reports + synthetic injection inside zone.
  const distressMarkers = useMemo(() => {
    if (!current) return [];
    const inZone = reports.filter((r) => haversineKm(center, [r.lat, r.lng]) <= current.radius_m / 1000);
    const rng = mulberry32(hashParams(params) ^ stepIndex);
    const synthetic = Array.from({ length: Math.min(8, Math.round(current.distress_reports / 6)) }, (_, i) => {
      const r = (current.radius_m / 1000) * 0.85 * Math.sqrt(rng());
      const a = rng() * Math.PI * 2;
      return {
        id: `syn-${i}-${stepIndex}`,
        lat: center[0] + (r / 111) * Math.sin(a),
        lng: center[1] + (r / 111) * Math.cos(a),
        locationName: "Distress signal",
        description: "Citizen distress beacon",
        status: "new" as const,
      };
    });
    return [...inZone, ...synthetic] as typeof reports;
  }, [current, reports, center, params, stepIndex]);

  // Decision-support recommendations
  const recs = useMemo(() => {
    if (!current) return [];
    const out: { priority: "critical" | "high" | "medium"; text: string; icon: React.ElementType }[] = [];
    if (current.intensity >= 75)
      out.push({ priority: "critical", text: `Issue RED alert via SMS+Telegram to ${selectedLocation.name} subscribers`, icon: Megaphone });
    if (current.flood_depth_cm >= 45)
      out.push({ priority: "critical", text: `Deploy ${Math.min(10, Math.round(current.flood_depth_cm / 10))} rescue boats to low-lying wards`, icon: Ship });
    if (current.shelters_in_zone < 3 && current.affected_population > 5000)
      out.push({ priority: "high", text: `Open additional relief shelters — current capacity insufficient`, icon: MapPin });
    if (current.roads_blocked >= 6)
      out.push({ priority: "high", text: `Close ${current.roads_blocked} arterial roads, route via alternates`, icon: Siren });
    if (current.medical_cases >= 4)
      out.push({ priority: "high", text: `Pre-position ${current.medical_cases + 2} ambulances near zone perimeter`, icon: Ambulance });
    if (current.power_outages >= 6)
      out.push({ priority: "medium", text: `Coordinate with TANGEDCO for ${current.power_outages} feeder restorations`, icon: Zap });
    if (out.length === 0)
      out.push({ priority: "medium", text: "Maintain monitoring posture. No critical action required.", icon: CheckCircle2 });
    return out;
  }, [current, selectedLocation.name]);

  const handleRun = () => { setReplay(false); setStepIndex(0); setRunning(true); };
  const handleReplay = () => { setReplay(true); setStepIndex(0); setRunning(true); };
  const handleReset = () => { setRunning(false); setStepIndex(0); };

  const evacProgress = current && current.affected_population > 0
    ? Math.round((current.evacuated / current.affected_population) * 100)
    : 0;
  const remaining = current ? current.affected_population - current.evacuated : 0;
  const etaCompletion = current && current.evacuated > 0
    ? +(remaining / Math.max(1, current.evacuated / Math.max(0.5, current.hour))).toFixed(1)
    : current?.evacuation_time_h ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emergency Operations Center"
        description="Digital twin simulation — live geospatial spread, resource tracking, decision support."
      />

      {/* Top status strip */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card px-3 py-2.5 text-xs sm:px-4 sm:py-3 sm:text-sm">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 animate-pulse rounded-full ${running ? "bg-risk-danger" : "bg-risk-low"}`} />
          <span className="font-semibold">
            {running ? (replay ? "REPLAY" : "LIVE SIM") : "STANDBY"}
          </span>
        </div>
        <span className="truncate"><span className="text-muted-foreground">EOC:</span> <strong>{selectedLocation.name}</strong></span>
        <span className="font-mono">T+{current?.hour.toFixed(2)}h / {params.duration_hours}h</span>
        <StatusBadge status={current?.level ?? "low"}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        </StatusBadge>
        <span><span className="text-muted-foreground">Conf</span> <strong className="font-mono">{current?.confidence}%</strong></span>
        <div className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground md:flex">
          <Radio className="h-3.5 w-3.5" /> NDRF · Chennai Corp · TN SDMA
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        {/* ===== Scenario Builder ===== */}
        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Scenario Builder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-2">
              {disasterTypes.map((type) => {
                const Icon = disasterIcons[type];
                const active = params.disaster === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setParams((c) => ({ ...c, disaster: type }))}
                    className={`rounded-lg border p-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active ? "border-brand bg-brand-light text-brand" : "bg-card"
                    }`}
                  >
                    <Icon className="mb-2 h-4 w-4" />
                    {disasterLabels[type]}
                  </button>
                );
              })}
            </div>

            {(() => {
              const ALL = [
                ["rainfall_mm", "Rainfall (24h)", "mm", 300],
                ["wind_speed_kmh", "Wind Speed", "km/h", 250],
                ["river_level_pct", "River Level", "%", 200],
                ["fire_spread_rate", "Fire Spread", "%", 100],
                ["earthquake_magnitude", "Earthquake M", "", 10],
              ] as const;
              const RELEVANT: Record<DisasterType, ReadonlyArray<typeof ALL[number][0]>> = {
                flood: ["rainfall_mm", "river_level_pct", "wind_speed_kmh"],
                rainfall: ["rainfall_mm", "wind_speed_kmh"],
                cyclone: ["wind_speed_kmh", "rainfall_mm"],
                urban_fire: ["fire_spread_rate", "wind_speed_kmh"],
                wildfire: ["fire_spread_rate", "wind_speed_kmh"],
                earthquake: ["earthquake_magnitude"],
              };
              const keys = RELEVANT[params.disaster];
              return ALL.filter(([k]) => keys.includes(k)).map(([key, label, suffix, max]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{label}</Label>
                    <span className="font-mono text-sm">
                      {params[key]}{suffix}
                    </span>
                  </div>
                  <Slider
                    value={[params[key]]}
                    max={max}
                    step={key === "earthquake_magnitude" ? 0.1 : 1}
                    onValueChange={(v) => {
                      const nv = Array.isArray(v) ? v[0] ?? 0 : v;
                      setParams((c) => ({ ...c, [key]: nv }));
                    }}
                  />
                </div>
              ));
            })()}

            <div className="space-y-3">
              <Label>Time Horizon</Label>
              <div className="grid grid-cols-4 gap-2">
                {horizons.map((h) => (
                  <Button
                    key={h}
                    type="button"
                    variant={params.duration_hours === h ? "default" : "outline"}
                    onClick={() => setParams((c) => ({ ...c, duration_hours: h }))}
                  >
                    {h}h
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="h-10 flex-1" onClick={handleRun} disabled={running}>
                {running && !replay ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {running && !replay ? "Running…" : "Run"}
              </Button>
              <Button variant="secondary" className="h-10 flex-1" onClick={handleReplay} disabled={running}>
                <Radar className="h-4 w-4" /> Replay
              </Button>
              <Button variant="outline" className="h-10" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* Weather panel — real Open-Meteo */}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <CloudRain className="h-3.5 w-3.5" /> Live Weather Feed
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <WStat icon={<CloudRain className="h-3 w-3" />} label="Rainfall 24h" val={`${Math.round(weather?.rainfall_mm_24h ?? 0)} mm`} />
                <WStat icon={<Wind className="h-3 w-3" />} label="Wind" val={`${Math.round(weather?.wind_speed_kmh ?? 0)} km/h`} />
                <WStat icon={<Gauge className="h-3 w-3" />} label="Temp" val={`${Math.round(weather?.temperature_c ?? 0)}°C`} />
                <WStat icon={<Activity className="h-3 w-3" />} label="Forecast Conf." val={`${current?.confidence ?? 70}%`} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== Main panel ===== */}
        <div className="space-y-4">
          {/* Live KPIs */}
          <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
            <KPI title="Affected Population" value={current?.affected_population.toLocaleString("en-IN") ?? "0"}
              detail={`peak ${peak?.affected_population.toLocaleString("en-IN")} @ T+${peak?.hour.toFixed(1)}h`}
              icon={<Users className="h-4 w-4" />} live={running} />
            <KPI title="Evacuated" value={current?.evacuated.toLocaleString("en-IN") ?? "0"}
              detail={`${evacProgress}% complete · ${remaining.toLocaleString("en-IN")} remaining`}
              icon={<LifeBuoy className="h-4 w-4" />} live={running} accent="text-risk-low" />
            <KPI title="Roads Blocked" value={current?.roads_blocked ?? 0}
              detail={`flood depth ${current?.flood_depth_cm ?? 0} cm`}
              icon={<Siren className="h-4 w-4" />} live={running} accent="text-risk-warning" />
            <KPI title="ETA to Complete Evac" value={`${etaCompletion}h`}
              detail={`zone radius ${((current?.radius_m ?? 0) / 1000).toFixed(1)} km`}
              icon={<Activity className="h-4 w-4" />} live={running} />
          </div>

          {/* Map + scrubber */}
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base">Geospatial Impact Map</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Wind-driven plume · flood depth heat · live distress beacons
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {disasterLabels[params.disaster]} · intensity {current?.intensity}/100
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <ConfidenceBar confidence={current?.confidence ?? 70} />
              <MapView
                center={center}
                shelters={shelters}
                reports={distressMarkers}
                simulationZones={impactZones}
                height="430px"
              />
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>T+0h</span>
                  <span className="font-mono">
                    Step {stepIndex + 1} / {frames.length} · hour-by-hour replay
                  </span>
                  <span>T+{params.duration_hours}h</span>
                </div>
                <Slider
                  value={[stepIndex]}
                  max={frames.length - 1}
                  step={1}
                  onValueChange={(v) => {
                    setRunning(false);
                    setStepIndex(Array.isArray(v) ? v[0] ?? 0 : v);
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Evacuation Progress + Decision Support */}
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <Card className="rounded-lg shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <LifeBuoy className="h-4 w-4 text-risk-low" /> Evacuation Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-semibold tabular-nums">{evacProgress}%</p>
                    <p className="text-xs text-muted-foreground">
                      {current?.evacuated.toLocaleString("en-IN")} of {current?.affected_population.toLocaleString("en-IN")} moved
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">ETA {etaCompletion}h</Badge>
                </div>
                <Progress value={evacProgress} className="h-2" />
                <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                  <Mini label="Remaining" value={remaining.toLocaleString("en-IN")} />
                  <Mini label="Shelters Open" value={current?.shelters_in_zone ?? 0} />
                  <Mini label="Distress" value={current?.distress_reports ?? 0} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-lg shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-brand" /> Decision Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recs.map((r, i) => {
                  const Icon = r.icon;
                  const color =
                    r.priority === "critical" ? "border-risk-danger/40 bg-risk-danger/5 text-risk-danger"
                    : r.priority === "high" ? "border-risk-warning/40 bg-risk-warning/5"
                    : "border-border bg-muted/30";
                  return (
                    <div key={i} className={`flex items-start gap-2 rounded-lg border p-2.5 text-sm ${color}`}>
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p>{r.text}</p>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">
                          Priority: {r.priority}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Live charts grid */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Affected vs Evacuated">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#DC2626" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#DC2626" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16A34A" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#16A34A" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" tickFormatter={(v) => `${v}h`} fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => v.toLocaleString("en-IN")} labelFormatter={(l) => `T+${l}h`} />
                  <Area type="monotone" dataKey="affected" stroke="#DC2626" strokeWidth={2} fill="url(#g1)" />
                  <Area type="monotone" dataKey="evacuated" stroke="#16A34A" strokeWidth={2} fill="url(#g2)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Weather: Rainfall & Wind">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" tickFormatter={(v) => `${v}h`} fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip labelFormatter={(l) => `T+${l}h`} />
                  <Line type="monotone" dataKey="rainfall" stroke="#2563EB" strokeWidth={2} dot={false} name="Rain mm/h" />
                  <Line type="monotone" dataKey="wind" stroke="#7C3AED" strokeWidth={2} dot={false} name="Wind km/h" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Flood Depth (cm)">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" tickFormatter={(v) => `${v}h`} fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip labelFormatter={(l) => `T+${l}h`} />
                  <Area type="monotone" dataKey="flood" stroke="#2563EB" strokeWidth={2} fill="url(#g3)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Roads Blocked Over Time">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" tickFormatter={(v) => `${v}h`} fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip labelFormatter={(l) => `T+${l}h`} />
                  <Bar dataKey="roads" fill="#EA580C" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Resource deployment + Shelters + Event timeline */}
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="rounded-lg shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Resource Deployment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {resourceDeployment.map((r) => {
                  const Icon = r.icon;
                  const pct = Math.round((r.deployed / r.total) * 100);
                  return (
                    <div key={r.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" style={{ color: r.color }} />
                          {r.label}
                        </span>
                        <span className="font-mono text-xs">{r.deployed}/{r.total}</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  );
                })}
                <p className="pt-2 text-[11px] text-muted-foreground">
                  NDRF + Chennai Corp + TN Fire & Rescue
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-lg shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Shelter Occupancy — Live</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[360px] overflow-y-auto">
                {sheltersLive.length === 0 && (
                  <p className="text-sm text-muted-foreground">No shelters in range.</p>
                )}
                {sheltersLive.map(({ s, km, occupancy, incoming }) => {
                  const pct = Math.round((occupancy / (s.capacity || 200)) * 100);
                  const tone =
                    pct >= 95 ? "text-risk-danger" : pct >= 75 ? "text-risk-warning" : "text-risk-low";
                  return (
                    <div key={s.id} className="rounded-lg border bg-card p-2.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-medium">{s.name}</span>
                        <span className={`font-mono text-xs ${tone}`}>{pct}%</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{occupancy}/{s.capacity || 200} occupied</span>
                        <span>+{incoming} incoming · {km.toFixed(1)} km</span>
                      </div>
                      <Progress value={pct} className="h-1 mt-1.5" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="rounded-lg shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Live Event Timeline</CardTitle>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full ${running ? "bg-risk-danger animate-pulse" : "bg-muted-foreground"}`} />
                  {visibleEvents.length} events
                </span>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[360px] overflow-y-auto">
                {visibleEvents.length === 0 && (
                  <p className="text-sm text-muted-foreground">No events yet. Start the simulation.</p>
                )}
                {visibleEvents.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border bg-card p-2 text-sm animate-fade-in">
                    <EventIcon kind={e.kind} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] leading-snug">{e.text}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">T+{e.t.toFixed(2)}h</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {current && current.intensity >= 60 && (
            <div className="flex items-center gap-2 rounded-lg border border-risk-warning/40 bg-risk-warning/5 px-4 py-2.5 text-sm text-risk-warning">
              <AlertTriangle className="h-4 w-4" />
              Intensity above warning threshold. Pre-position resources and notify district control room.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KPI({
  title, value, detail, icon, live, accent,
}: {
  title: string; value: string | number; detail: string;
  icon?: React.ReactNode; live?: boolean; accent?: string;
}) {
  return (
    <Card className="rounded-lg shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="flex items-center gap-1.5">
            {live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-risk-danger" />}
            {icon && <span className="text-muted-foreground">{icon}</span>}
          </div>
        </div>
        <p className={`mt-3 text-3xl font-semibold tabular-nums ${accent ?? ""}`}>{value}</p>
        <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function WStat({ icon, label, val }: { icon: React.ReactNode; label: string; val: string }) {
  return (
    <div className="rounded-md bg-background p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <div className="font-mono text-sm font-semibold">{val}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono text-sm font-semibold">{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[200px]">{children}</CardContent>
    </Card>
  );
}

function EventIcon({ kind }: { kind: SimEvent["kind"] }) {
  const map: Record<SimEvent["kind"], { Icon: React.ElementType; color: string }> = {
    flood: { Icon: CloudRain, color: "text-blue-600" },
    power: { Icon: Zap, color: "text-yellow-600" },
    rescue: { Icon: LifeBuoy, color: "text-purple-600" },
    medical: { Icon: Ambulance, color: "text-red-600" },
    road: { Icon: Siren, color: "text-orange-600" },
    shelter: { Icon: MapPin, color: "text-green-600" },
    alert: { Icon: Megaphone, color: "text-brand" },
    deploy: { Icon: Truck, color: "text-indigo-600" },
  };
  const { Icon, color } = map[kind];
  return <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />;
}

export const Route = createFileRoute("/_dashboard/simulation")({
  component: Page_simulation,
});
