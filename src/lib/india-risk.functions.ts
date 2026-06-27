import { createServerFn } from "@tanstack/react-start";
import { INDIA_BBOX, INDIA_CITIES, type IndiaCity } from "@/lib/india-cities";
import { haversineKm } from "@/lib/resq/risk-core";

export type HazardKind =
  | "flood" | "earthquake" | "cyclone" | "heatwave"
  | "landslide" | "drought" | "wildfire" | "lightning" | "air_quality";

export type Severity = "low" | "watch" | "warning" | "danger";

export interface HazardPoint {
  id: string;
  hazard: HazardKind;
  lat: number;
  lng: number;
  severity: Severity;
  score: number;        // 0..100
  title: string;
  detail: string;
  source: string;
  timestamp: string;
  meta?: Record<string, number | string | null>;
}

export interface CityRisk {
  name: string;
  state: string;
  lat: number;
  lng: number;
  population: number;
  scores: Partial<Record<HazardKind, number>>;
  overall: number;
  level: Severity;
}

interface StateRisk {
  state: string;
  population: number;
  max: number;
  cities: number;
  hazards: Record<HazardKind, number>;
  level: Severity;
}

interface SourceStatus {
  id: string;
  name: string;
  status: string;
  events: number;
}

interface IndiaRiskBundle {
  fetched_at: string;
  points: HazardPoint[];
  cityRisks: CityRisk[];
  states: StateRisk[];
  ticker: HazardPoint[];
  counts: Record<HazardKind, number>;
  sources: SourceStatus[];
  stale?: boolean;
}

const WEATHER_HAZARDS = new Set<HazardKind>([
  "flood", "cyclone", "heatwave", "landslide", "drought", "lightning",
]);

let INDIA_RISK_CACHE: { at: number; payload: IndiaRiskBundle } | null = null;
const INDIA_RISK_CACHE_TTL_MS = 8 * 60 * 1000;

function sev(score: number): Severity {
  if (score >= 80) return "danger";
  if (score >= 60) return "warning";
  if (score >= 35) return "watch";
  return "low";
}

interface WeatherSlot {
  city: IndiaCity;
  tmax: number; tmin: number; rain24: number; rain48: number;
  wind: number; gust: number; humidity: number;
  cape?: number; // J/kg (lightning proxy)
}

interface AirSlot {
  city: IndiaCity;
  aqi: number; pm25: number; pm10: number; ozone: number; no2: number;
}

async function fetchJsonRetry(url: string, attempts = 4): Promise<unknown | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "ResQNet/1.0 (national-risk-map)" },
      });
      if (r.ok) return await r.json();
      if (r.status !== 429 && r.status < 500) return null;
    } catch {
      // network blip
    }
    await new Promise((res) => setTimeout(res, 400 * (i + 1)));
  }
  return null;
}

function isRiskBundle(value: unknown): value is IndiaRiskBundle {
  const v = value as Partial<IndiaRiskBundle> | null;
  return !!v && Array.isArray(v.points) && Array.isArray(v.cityRisks) && Array.isArray(v.states);
}

async function loadBundleSnapshot(): Promise<IndiaRiskBundle | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("weather_snapshots")
      .select("raw, created_at")
      .eq("source", "India Risk Bundle")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (isRiskBundle(data?.raw)) {
      return {
        ...data.raw,
        fetched_at: data.raw.fetched_at ?? data.created_at,
        stale: true,
      };
    }
  } catch {
    // cache miss or backend unavailable
  }
  return null;
}

async function saveBundleSnapshot(payload: IndiaRiskBundle) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("weather_snapshots").insert({
      lat: INDIA_CENTER[0],
      lng: INDIA_CENTER[1],
      source: "India Risk Bundle",
      temperature: null,
      humidity: null,
      wind_speed_kmh: null,
      pressure: null,
      rainfall_mm: null,
      raw: payload as never,
    });
  } catch {
    // best-effort cache only
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchWeatherChunk(cities: IndiaCity[]): Promise<WeatherSlot[]> {
  const lat = cities.map((c) => c.lat).join(",");
  const lng = cities.map((c) => c.lng).join(",");
  const p = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    current: "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,cape",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
    forecast_days: "2",
    timezone: "auto",
  });
  const raw = await fetchJsonRetry(`https://api.open-meteo.com/v1/forecast?${p}`);
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return cities.map((city, i) => {
    const j = (arr[i] ?? {}) as Record<string, any>;
    const cur = j.current ?? {};
    const d = j.daily ?? {};
    return {
      city,
      tmax: d.temperature_2m_max?.[0] ?? cur.temperature_2m ?? 30,
      tmin: d.temperature_2m_min?.[0] ?? 20,
      rain24: d.precipitation_sum?.[0] ?? 0,
      rain48: (d.precipitation_sum?.[0] ?? 0) + (d.precipitation_sum?.[1] ?? 0),
      wind: d.wind_speed_10m_max?.[0] ?? cur.wind_speed_10m ?? 0,
      gust: cur.wind_gusts_10m ?? 0,
      humidity: cur.relative_humidity_2m ?? 60,
      cape: cur.cape ?? 0,
    };
  });
}

async function fetchWeatherGrid(cities: IndiaCity[]): Promise<WeatherSlot[]> {
  const chunks = chunk(cities, 25);
  const out: WeatherSlot[] = [];
  for (const c of chunks) {
    const slot = await fetchWeatherChunk(c);
    out.push(...slot);
    await new Promise((r) => setTimeout(r, 250));
  }
  return out;
}

async function fetchAirChunk(cities: IndiaCity[]): Promise<AirSlot[]> {
  const lat = cities.map((c) => c.lat).join(",");
  const lng = cities.map((c) => c.lng).join(",");
  const p = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    current: "us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide",
    timezone: "auto",
  });
  const raw = await fetchJsonRetry(`https://air-quality-api.open-meteo.com/v1/air-quality?${p}`);
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return cities.map((city, i) => {
    const cur = ((arr[i] ?? {}) as Record<string, any>).current ?? {};
    return {
      city,
      aqi: Number(cur.us_aqi ?? 0),
      pm25: Number(cur.pm2_5 ?? 0),
      pm10: Number(cur.pm10 ?? 0),
      ozone: Number(cur.ozone ?? 0),
      no2: Number(cur.nitrogen_dioxide ?? 0),
    };
  });
}

async function fetchAirGrid(cities: IndiaCity[]): Promise<AirSlot[]> {
  const chunks = chunk(cities, 25);
  const out: AirSlot[] = [];
  for (const c of chunks) {
    const slot = await fetchAirChunk(c);
    out.push(...slot);
    await new Promise((r) => setTimeout(r, 250));
  }
  return out;
}



async function fetchUSGSQuakes() {
  // Last 30 days, mag ≥ 3.0, India region.
  const start = new Date(Date.now() - 30 * 86400_000).toISOString();
  const p = new URLSearchParams({
    format: "geojson", starttime: start,
    minlatitude: String(INDIA_BBOX.minLat - 3),
    maxlatitude: String(INDIA_BBOX.maxLat + 3),
    minlongitude: String(INDIA_BBOX.minLng - 3),
    maxlongitude: String(INDIA_BBOX.maxLng + 3),
    minmagnitude: "3.0",
    orderby: "time",
    limit: "500",
  });
  try {
    const r = await fetch(`https://earthquake.usgs.gov/fdsnws/event/1/query?${p}`);
    if (!r.ok) return [];
    const j = await r.json() as { features?: Array<{ id: string; properties: { mag: number; place: string; time: number; url?: string }; geometry: { coordinates: [number, number, number] } }> };
    return (j.features ?? []).map((f) => {
      const [lng, lat, depth] = f.geometry.coordinates;
      const m = f.properties.mag ?? 0;
      const score = Math.min(100, Math.max(0, m * 14 - 5));
      const point: HazardPoint = {
        id: `usgs-${f.id}`,
        hazard: "earthquake",
        lat, lng,
        score,
        severity: sev(score),
        title: `M${m.toFixed(1)} earthquake`,
        detail: `${f.properties.place} · depth ${depth?.toFixed?.(0) ?? "?"} km`,
        source: "USGS",
        timestamp: new Date(f.properties.time).toISOString(),
        meta: { magnitude: m, depth_km: depth, place: f.properties.place },
      };
      return point;
    });
  } catch {
    return [];
  }
}

async function fetchFIRMS(): Promise<HazardPoint[]> {
  const key = process.env.NASA_FIRMS_MAP_KEY;
  if (!key) return [];
  const area = `${INDIA_BBOX.minLng},${INDIA_BBOX.minLat},${INDIA_BBOX.maxLng},${INDIA_BBOX.maxLat}`;
  try {
    const r = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/${area}/1`);
    if (!r.ok) return [];
    const csv = await r.text();
    const lines = csv.trim().split("\n");
    if (lines.length < 2) return [];
    const h = lines[0].split(",");
    const iLat = h.indexOf("latitude"), iLng = h.indexOf("longitude");
    const iFrp = h.indexOf("frp"), iConf = h.indexOf("confidence"), iDt = h.indexOf("acq_date"), iTm = h.indexOf("acq_time");
    const out: HazardPoint[] = [];
    for (const row of lines.slice(1)) {
      const c = row.split(",");
      const lat = Number(c[iLat]), lng = Number(c[iLng]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const frp = Number(c[iFrp]) || 0;
      const conf = c[iConf];
      const confScore = conf === "h" ? 90 : conf === "n" ? 60 : conf === "l" ? 30 : Number(conf) || 50;
      const score = Math.min(100, frp * 1.4 + confScore * 0.4);
      out.push({
        id: `firms-${lat.toFixed(3)}-${lng.toFixed(3)}-${c[iDt]}-${c[iTm]}`,
        hazard: "wildfire",
        lat, lng,
        score,
        severity: sev(score),
        title: `Active fire (FRP ${frp.toFixed(0)})`,
        detail: `VIIRS SNPP · confidence ${conf}`,
        source: "NASA FIRMS",
        timestamp: `${c[iDt]}T${(c[iTm] ?? "0000").toString().padStart(4, "0").replace(/(\d{2})(\d{2})/, "$1:$2")}:00Z`,
        meta: { frp, confidence: confScore },
      });
    }
    return out.slice(0, 800);
  } catch {
    return [];
  }
}

interface NominatimResult { lat: string; lon: string; display_name: string; type: string }
export const geocodeIndia = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => {
    const q = (d as { q?: string })?.q ?? "";
    return { q: String(q).slice(0, 120) };
  })
  .handler(async ({ data }) => {
    if (!data.q.trim()) return [] as Array<{ name: string; lat: number; lng: number }>;
    const p = new URLSearchParams({
      q: data.q, format: "json", limit: "8",
      countrycodes: "in", "accept-language": "en", addressdetails: "0",
    });
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?${p}`, {
        headers: { "User-Agent": "ResQNet/1.0 (disaster-intelligence)" },
      });
      if (!r.ok) return [];
      const j = await r.json() as NominatimResult[];
      return j.map((x) => ({ name: x.display_name, lat: Number(x.lat), lng: Number(x.lon) }));
    } catch {
      return [];
    }
  });

export const getIndiaRiskBundle = createServerFn({ method: "GET" }).handler(async () => {
  const now = new Date().toISOString();

  const [quakes, fires, weather, air] = await Promise.all([
    fetchUSGSQuakes(),
    fetchFIRMS(),
    fetchWeatherGrid(INDIA_CITIES),
    fetchAirGrid(INDIA_CITIES),
  ]);
  const airByCity = new Map(air.map((a) => [a.city.name, a]));


  const points: HazardPoint[] = [];

  // ---- Earthquake & wildfire come straight from real feeds
  points.push(...quakes, ...fires);

  // ---- Derived per-city hazards from weather
  const cityRisks: CityRisk[] = [];
  for (const w of weather) {
    const c = w.city;
    const scores: Partial<Record<HazardKind, number>> = {};

    // FLOOD: rainfall + riverine flag
    const floodScore = Math.min(100,
      w.rain24 * 1.1 + w.rain48 * 0.4 + (c.riverine ? 12 : 0) + (c.coastal ? 6 : 0)
    );
    if (floodScore >= 25) {
      scores.flood = floodScore;
      points.push({
        id: `flood-${c.name}`, hazard: "flood",
        lat: c.lat, lng: c.lng, score: floodScore, severity: sev(floodScore),
        title: `${c.name} flood risk`,
        detail: `${w.rain24.toFixed(0)} mm/24h, ${w.rain48.toFixed(0)} mm/48h${c.riverine ? " · riverine zone" : ""}`,
        source: "Open-Meteo + terrain", timestamp: now,
        meta: { rain24_mm: w.rain24, rain48_mm: w.rain48 },
      });
    }

    // CYCLONE: only meaningful for coastal cities; wind + gust + pressure proxy
    if (c.coastal) {
      const cycloneScore = Math.min(100, w.wind * 0.9 + w.gust * 0.6);
      if (cycloneScore >= 30) {
        scores.cyclone = cycloneScore;
        points.push({
          id: `cyclone-${c.name}`, hazard: "cyclone",
          lat: c.lat, lng: c.lng, score: cycloneScore, severity: sev(cycloneScore),
          title: `${c.name} cyclonic winds`,
          detail: `Sustained ${w.wind.toFixed(0)} km/h · gusts ${w.gust.toFixed(0)} km/h`,
          source: "Open-Meteo", timestamp: now,
          meta: { wind_kmh: w.wind, gust_kmh: w.gust },
        });
      }
    }

    // HEATWAVE: IMD-style — Tmax thresholds for plains vs hills/coast
    const plainsThreshold = c.hilly ? 30 : c.coastal ? 37 : 40;
    const heatScore = Math.min(100, Math.max(0, (w.tmax - plainsThreshold) * 12 + 30));
    if (w.tmax >= plainsThreshold) {
      scores.heatwave = heatScore;
      points.push({
        id: `heat-${c.name}`, hazard: "heatwave",
        lat: c.lat, lng: c.lng, score: heatScore, severity: sev(heatScore),
        title: `${c.name} heatwave (${w.tmax.toFixed(0)}°C)`,
        detail: `Max ${w.tmax.toFixed(1)}°C vs threshold ${plainsThreshold}°C · RH ${w.humidity.toFixed(0)}%`,
        source: "Open-Meteo · IMD thresholds", timestamp: now,
        meta: { tmax_c: w.tmax, humidity: w.humidity },
      });
    }

    // LANDSLIDE: hilly + 48h rainfall
    if (c.hilly) {
      const landslideScore = Math.min(100, w.rain48 * 1.6 + 20);
      if (landslideScore >= 35) {
        scores.landslide = landslideScore;
        points.push({
          id: `land-${c.name}`, hazard: "landslide",
          lat: c.lat, lng: c.lng, score: landslideScore, severity: sev(landslideScore),
          title: `${c.name} landslide risk`,
          detail: `${w.rain48.toFixed(0)} mm in 48h on hill terrain`,
          source: "Open-Meteo + DEM tag", timestamp: now,
          meta: { rain48_mm: w.rain48 },
        });
      }
    }

    // DROUGHT: low rainfall + high temp (only inland, non-monsoon proxy)
    if (!c.coastal && w.rain48 < 1 && w.tmax > 35) {
      const droughtScore = Math.min(100, (w.tmax - 35) * 8 + 35);
      scores.drought = droughtScore;
      points.push({
        id: `drought-${c.name}`, hazard: "drought",
        lat: c.lat, lng: c.lng, score: droughtScore, severity: sev(droughtScore),
        title: `${c.name} dry spell`,
        detail: `<1 mm rain in 48h, Tmax ${w.tmax.toFixed(0)}°C`,
        source: "Open-Meteo", timestamp: now,
        meta: { tmax_c: w.tmax, rain48_mm: w.rain48 },
      });
    }

    // LIGHTNING: CAPE-based (J/kg)
    if ((w.cape ?? 0) > 1000) {
      const ltScore = Math.min(100, ((w.cape ?? 0) - 1000) / 30 + 35);
      scores.lightning = ltScore;
      points.push({
        id: `lt-${c.name}`, hazard: "lightning",
        lat: c.lat, lng: c.lng, score: ltScore, severity: sev(ltScore),
        title: `${c.name} thunderstorm potential`,
        detail: `CAPE ${(w.cape ?? 0).toFixed(0)} J/kg · gusts ${w.gust.toFixed(0)} km/h`,
        source: "Open-Meteo", timestamp: now,
        meta: { cape: w.cape ?? 0 },
      });
    }

    // Earthquake city score: nearest quake within 300 km
    const nearby = quakes
      .map((q) => ({ q, km: haversineKm([c.lat, c.lng], [q.lat, q.lng]) }))
      .filter((x) => x.km < 300)
      .sort((a, b) => b.q.score - a.q.score)[0];
    if (nearby) scores.earthquake = Math.round(nearby.q.score * (1 - Math.min(0.7, nearby.km / 400)));

    // Wildfire city score: hotspot count within 60 km
    const fireCount = fires.filter((f) => haversineKm([c.lat, c.lng], [f.lat, f.lng]) < 60).length;
    if (fireCount > 0) scores.wildfire = Math.min(100, fireCount * 10 + 25);

    // AIR QUALITY: US AQI thresholds (EPA)
    const a = airByCity.get(c.name);
    if (a && a.aqi > 0) {
      const aqScore = Math.min(100, Math.max(0, (a.aqi - 50) * 0.7 + 25));
      if (a.aqi >= 50) {
        scores.air_quality = aqScore;
        points.push({
          id: `aq-${c.name}`, hazard: "air_quality",
          lat: c.lat, lng: c.lng, score: aqScore, severity: sev(aqScore),
          title: `${c.name} air quality (US AQI ${a.aqi.toFixed(0)})`,
          detail: `PM2.5 ${a.pm25.toFixed(0)} · PM10 ${a.pm10.toFixed(0)} · NO₂ ${a.no2.toFixed(0)} µg/m³`,
          source: "Open-Meteo Air Quality (CAMS)", timestamp: now,
          meta: { us_aqi: a.aqi, pm25: a.pm25, pm10: a.pm10, no2: a.no2, ozone: a.ozone },
        });
      }
    }


    const overall = Math.max(0, ...Object.values(scores).map((n) => n ?? 0));
    cityRisks.push({
      name: c.name, state: c.state, lat: c.lat, lng: c.lng,
      population: c.population, scores, overall, level: sev(overall),
    });
  }

  // State aggregation
  const byState = new Map<string, { state: string; population: number; max: number; cities: number; hazards: Record<HazardKind, number> }>();
  for (const r of cityRisks) {
    const cur = byState.get(r.state) ?? { state: r.state, population: 0, max: 0, cities: 0, hazards: {} as Record<HazardKind, number> };
    cur.population += r.population;
    cur.cities += 1;
    cur.max = Math.max(cur.max, r.overall);
    for (const [h, s] of Object.entries(r.scores)) {
      cur.hazards[h as HazardKind] = Math.max(cur.hazards[h as HazardKind] ?? 0, s ?? 0);
    }
    byState.set(r.state, cur);
  }
  const states = Array.from(byState.values())
    .map((s) => ({ ...s, level: sev(s.max) }))
    .sort((a, b) => b.max - a.max);

  // Top events ticker
  const ticker = [...points]
    .sort((a, b) => b.score - a.score)
    .slice(0, 40);

  const counts = points.reduce((acc, p) => {
    acc[p.hazard] = (acc[p.hazard] ?? 0) + 1;
    return acc;
  }, {} as Record<HazardKind, number>);

  return {
    fetched_at: now,
    points,
    cityRisks,
    states,
    ticker,
    counts,
    sources: [
      { id: "usgs", name: "USGS Earthquakes", status: quakes.length ? "live" : "degraded", events: quakes.length },
      { id: "firms", name: "NASA FIRMS (VIIRS)", status: fires.length ? "live" : (process.env.NASA_FIRMS_MAP_KEY ? "quiet" : "unconfigured"), events: fires.length },
      { id: "openmeteo", name: "Open-Meteo (IMD-aligned thresholds)", status: weather.length ? "live" : "degraded", events: weather.length },
      { id: "openmeteo-aq", name: "Open-Meteo Air Quality (CAMS)", status: air.length ? "live" : "degraded", events: air.length },
      { id: "imd", name: "IMD bulletins", status: "advisory-only", events: 0 },
      { id: "cwc", name: "CWC river levels", status: "advisory-only", events: 0 },
      { id: "ncs", name: "NCS India seismology", status: "cross-checked via USGS", events: 0 },
    ],
  };
});
