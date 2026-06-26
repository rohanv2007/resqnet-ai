import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Pause,
  Play,
  RotateCcw,
  TimerReset,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
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
  rainfall_mm: number;       // 24h forecast mm
  wind_speed_kmh: number;
  river_level_pct: number;   // 0-200
  fire_spread_rate: number;  // 0-100
  earthquake_magnitude: number;
  duration_hours: number;
}

interface SimFrame {
  hour: number;
  intensity: number;
  radius_m: number;
  affected_population: number;
  shelters_in_zone: number;
  reports_in_zone: number;
  roads_blocked: number;
  evacuation_time_h: number;
  level: RiskLevel;
  confidence: number;
}

// ===== Real digital-twin (deterministic, client-side) =====
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
  // Each disaster spreads at a different rate per hour.
  const perHour: Record<DisasterType, number> = {
    flood: 0.35,
    rainfall: 0.25,
    cyclone: 1.2,
    urban_fire: 0.18,
    wildfire: 0.55,
    earthquake: 0, // earthquakes don't "spread", magnitude sets fixed radius
  };
  const base =
    disaster === "earthquake"
      ? Math.max(2, intensity / 6)
      : Math.max(1.2, intensity / 14);
  return base + perHour[disaster] * intensity * 0.03 * hoursElapsed;
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

  // Affected pop scales with circle area * local density proxy.
  const areaFactor = Math.PI * radius_km * radius_km;
  const densityProxy = Math.max(800, population / 25); // people per km^2 rough
  const affected_population = Math.min(
    population,
    Math.round(areaFactor * densityProxy * (intensity / 100)),
  );

  const shelters_in_zone = shelters.filter(
    (s) => haversineKm(center, [s.lat, s.lng]) <= radius_km,
  ).length;
  const reports_in_zone = reports.filter(
    (r) => haversineKm(center, [r.lat, r.lng]) <= radius_km,
  ).length;

  const roads_blocked =
    Math.max(1, Math.round(intensity / 10)) +
    Math.round(reports_in_zone * 0.6);

  const evacuation_time_h = +(1.5 + intensity / 28 + radius_km * 0.15).toFixed(1);
  const confidence = Math.min(95, 68 + Math.round(intensity / 7));

  return {
    hour,
    intensity,
    radius_m,
    affected_population,
    shelters_in_zone,
    reports_in_zone,
    roads_blocked,
    evacuation_time_h,
    level: scoreToLevel(intensity),
    confidence,
  };
}

function Page_simulation() {
  const { selectedLocation, shelters, reports, weather } = useRiskData();
  const center: [number, number] = [selectedLocation.lat, selectedLocation.lng];

  // Seed parameters from real weather as soon as it arrives.
  const [params, setParams] = useState<SimParams>({
    disaster: "flood",
    rainfall_mm: 60,
    wind_speed_kmh: 30,
    river_level_pct: 55,
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

  // Build the full timeline of frames for the current params.
  const frames = useMemo<SimFrame[]>(() => {
    const out: SimFrame[] = [];
    const totalSteps = Math.max(8, params.duration_hours * 2); // half-hour resolution
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

  // Animation state.
  const [running, setRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    if (!running) return;
    const DURATION_MS = 9000; // ~9 seconds real-time playthrough
    startedAtRef.current = performance.now() - (stepIndex / (frames.length - 1)) * DURATION_MS;
    const tick = (t: number) => {
      const progress = Math.min(1, (t - startedAtRef.current) / DURATION_MS);
      const idx = Math.round(progress * (frames.length - 1));
      setStepIndex(idx);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setRunning(false);
      }
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
    return [
      {
        lat: center[0],
        lng: center[1],
        radius: current.radius_m,
        level: current.level,
      },
      {
        lat: center[0],
        lng: center[1],
        radius: Math.round(current.radius_m * 0.55),
        level: scoreToLevel(Math.min(100, current.intensity + 15)),
      },
      {
        lat: center[0] + 0.008,
        lng: center[1] + 0.01,
        radius: Math.round(current.radius_m * 0.4),
        level: scoreToLevel(Math.max(20, current.intensity - 20)),
      },
    ];
  }, [current, center]);

  const chartData = frames.map((f) => ({
    hour: +f.hour.toFixed(1),
    affected: f.affected_population,
    intensity: f.intensity,
  }));

  const peak = frames.reduce((a, b) => (b.affected_population > a.affected_population ? b : a), frames[0]);

  const affectedShelters = shelters
    .map((s) => ({ s, km: haversineKm(center, [s.lat, s.lng]) }))
    .filter((x) => x.km <= (current?.radius_m ?? 0) / 1000)
    .sort((a, b) => a.km - b.km)
    .slice(0, 6);

  const handleRun = () => {
    setStepIndex(0);
    setRunning(true);
  };
  const handleReset = () => {
    setRunning(false);
    setStepIndex(0);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disaster Simulation"
        description="Hyperlocal digital-twin. Real shelters, real reports, real weather-seeded inputs."
      />

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
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

            {(
              [
                ["rainfall_mm", "Rainfall (24h)", "mm", 300],
                ["wind_speed_kmh", "Wind Speed", "km/h", 250],
                ["river_level_pct", "River Level", "%", 200],
                ["fire_spread_rate", "Fire Spread", "%", 100],
                ["earthquake_magnitude", "Earthquake M", "", 10],
              ] as const
            ).map(([key, label, suffix, max]) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{label}</Label>
                  <span className="font-mono text-sm">
                    {params[key]}
                    {suffix}
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
            ))}

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
                {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {running ? "Running…" : "Run Simulation"}
              </Button>
              <Button variant="outline" className="h-10" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {weather && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="h-3.5 w-3.5" />
                Seeded from live weather: {Math.round(weather.temperature_c ?? 0)}°C,
                {" "}{Math.round(weather.wind_speed_kmh ?? 0)} km/h wind
              </p>
            )}
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <TimerReset className="h-3.5 w-3.5" />
              Hit Run to animate spread over {params.duration_hours}h.
            </p>
          </CardContent>
        </Card>

        {/* ===== Output ===== */}
        <div className="space-y-4">
          {/* Live KPIs */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ResultCard
              title="Affected Population"
              value={current?.affected_population.toLocaleString("en-IN") ?? "0"}
              detail={`peak ${peak?.affected_population.toLocaleString("en-IN")} @ ${peak?.hour.toFixed(1)}h`}
              icon={<Users className="h-4 w-4" />}
            />
            <ResultCard
              title="Roads Likely Blocked"
              value={current?.roads_blocked ?? 0}
              detail={`${current?.reports_in_zone ?? 0} citizen reports in zone`}
            />
            <ResultCard
              title="Shelters At Risk"
              value={current?.shelters_in_zone ?? 0}
              detail={`of ${shelters.length} nearby`}
            />
            <ResultCard
              title="Evacuation Time"
              value={`${current?.evacuation_time_h ?? 0}h`}
              detail={`radius ${((current?.radius_m ?? 0) / 1000).toFixed(1)} km`}
            />
          </div>

          {/* Map + Timeline */}
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base">Impact Map — Live Spread</CardTitle>
                <p className="text-xs text-muted-foreground">
                  T+{current?.hour.toFixed(1)}h · intensity {current?.intensity}/100
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {disasterLabels[params.disaster]}
                </Badge>
                <StatusBadge status={current?.level ?? "low"}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                </StatusBadge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ConfidenceBar confidence={current?.confidence ?? 70} />
              <MapView
                center={center}
                shelters={shelters}
                reports={reports}
                simulationZones={impactZones}
                height="430px"
              />
              {/* Timeline scrubber */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>T+0h</span>
                  <span className="font-mono">
                    Step {stepIndex + 1} / {frames.length}
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

          {/* Population over time + impacted shelters */}
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card className="rounded-lg shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Affected Population Over Time</CardTitle>
              </CardHeader>
              <CardContent className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="popGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#DC2626" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#DC2626" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hour" tickFormatter={(v) => `${v}h`} fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(v: number) => v.toLocaleString("en-IN")}
                      labelFormatter={(l) => `T+${l}h`}
                    />
                    <Area
                      type="monotone"
                      dataKey="affected"
                      stroke="#DC2626"
                      strokeWidth={2}
                      fill="url(#popGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-lg shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Shelters Inside Impact Zone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {affectedShelters.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No shelters currently inside the impact radius.
                  </p>
                )}
                {affectedShelters.map(({ s, km }) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.occupancy}/{s.capacity} occupied
                      </p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {km.toFixed(1)} km
                    </Badge>
                  </div>
                ))}
                {current && current.intensity >= 60 && (
                  <p className="flex items-center gap-2 pt-2 text-xs text-warning">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Pre-position resources — intensity above warning threshold.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string | number;
  detail: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="rounded-lg shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p>
        <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute("/_dashboard/simulation")({
  component: Page_simulation,
});
