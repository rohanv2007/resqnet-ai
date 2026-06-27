import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Quake = {
  id: string;
  time: number; // epoch ms
  mag: number;
  magType?: string;
  depthKm: number;
  lat: number;
  lng: number;
  place: string;
  country?: string;
  region?: string;
  tsunami: boolean;
  alert?: "green" | "yellow" | "orange" | "red" | null;
  url?: string;
  sources: string[]; // agencies reporting
  confidence: number; // 0-100
  primarySource: string;
};

type SourceStatus = {
  name: string;
  ok: boolean;
  count: number;
  latencyMs: number;
  error?: string;
};

const Input = z.object({
  windowHours: z.number().min(1).max(24 * 30).default(24),
  minMagnitude: z.number().min(0).max(10).default(2.5),
});

// ---------- helpers ----------
const COUNTRY_FROM_PLACE = (place: string): string | undefined => {
  // USGS "10km NE of Town, Country" / EMSC "REGION, COUNTRY"
  const parts = place.split(",").map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1];
};

const haversineKm = (a: [number, number], b: [number, number]) => {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

async function fetchWithTimeout(url: string, ms = 8000, init?: RequestInit) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

// ---------- source adapters ----------
async function fromUSGS(sinceMs: number, minMag: number) {
  const starttime = new Date(sinceMs).toISOString();
  const p = new URLSearchParams({
    format: "geojson",
    starttime,
    minmagnitude: String(minMag),
    orderby: "time",
    limit: "1000",
  });
  const r = await fetchWithTimeout(
    `https://earthquake.usgs.gov/fdsnws/event/1/query?${p}`,
    10000,
  );
  if (!r.ok) throw new Error(`USGS ${r.status}`);
  const j = (await r.json()) as {
    features: Array<{
      id: string;
      properties: {
        mag: number;
        place: string;
        time: number;
        tsunami: number;
        alert: string | null;
        magType: string;
        url: string;
      };
      geometry: { coordinates: [number, number, number] };
    }>;
  };
  return (j.features ?? []).map<Quake>((f) => ({
    id: `usgs:${f.id}`,
    time: f.properties.time,
    mag: f.properties.mag,
    magType: f.properties.magType,
    depthKm: f.geometry.coordinates[2],
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    place: f.properties.place ?? "Unknown",
    country: COUNTRY_FROM_PLACE(f.properties.place ?? ""),
    tsunami: !!f.properties.tsunami,
    alert: (f.properties.alert as Quake["alert"]) ?? null,
    url: f.properties.url,
    sources: ["USGS"],
    confidence: 60,
    primarySource: "USGS",
  }));
}

async function fromEMSC(sinceMs: number, minMag: number) {
  const start = new Date(sinceMs).toISOString();
  const p = new URLSearchParams({
    format: "json",
    starttime: start,
    minmag: String(minMag),
    limit: "1000",
  });
  const r = await fetchWithTimeout(
    `https://www.seismicportal.eu/fdsnws/event/1/query?${p}`,
    10000,
  );
  if (!r.ok) throw new Error(`EMSC ${r.status}`);
  const j = (await r.json()) as {
    features?: Array<{
      id: string;
      properties: {
        mag: number;
        magtype?: string;
        flynn_region?: string;
        time: string;
        depth: number;
        lat: number;
        lon: number;
        source_id?: string;
        auth?: string;
      };
    }>;
  };
  return (j.features ?? []).map<Quake>((f) => ({
    id: `emsc:${f.id}`,
    time: new Date(f.properties.time).getTime(),
    mag: f.properties.mag,
    magType: f.properties.magtype,
    depthKm: f.properties.depth,
    lat: f.properties.lat,
    lng: f.properties.lon,
    place: f.properties.flynn_region ?? "Unknown",
    country: f.properties.flynn_region?.split(",").pop()?.trim(),
    region: f.properties.flynn_region,
    tsunami: false,
    alert: null,
    sources: ["EMSC"],
    confidence: 55,
    primarySource: "EMSC",
  }));
}

async function fromGeoNet(sinceMs: number, minMag: number) {
  // GeoNet returns recent quakes around NZ. Uses MMI; we filter by mag client-side.
  const r = await fetchWithTimeout(
    `https://api.geonet.org.nz/quake?MMI=3`,
    8000,
    { headers: { Accept: "application/vnd.geo+json;version=2" } },
  );
  if (!r.ok) throw new Error(`GeoNet ${r.status}`);
  const j = (await r.json()) as {
    features?: Array<{
      properties: {
        publicID: string;
        time: string;
        depth: number;
        magnitude: number;
        locality: string;
        mmi: number;
      };
      geometry: { coordinates: [number, number] };
    }>;
  };
  return (j.features ?? [])
    .map<Quake>((f) => ({
      id: `geonet:${f.properties.publicID}`,
      time: new Date(f.properties.time).getTime(),
      mag: f.properties.magnitude,
      depthKm: f.properties.depth,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      place: f.properties.locality,
      country: "New Zealand",
      region: "Oceania",
      tsunami: false,
      alert: null,
      sources: ["GeoNet"],
      confidence: 55,
      primarySource: "GeoNet",
    }))
    .filter((q) => q.time >= sinceMs && q.mag >= minMag);
}

async function fromBMKG() {
  // BMKG Indonesia — latest 15 events, no time filter param.
  const r = await fetchWithTimeout(
    "https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json",
    8000,
  );
  if (!r.ok) throw new Error(`BMKG ${r.status}`);
  const j = (await r.json()) as {
    Infogempa?: { gempa?: Array<Record<string, string>> };
  };
  const list = j.Infogempa?.gempa ?? [];
  const parseCoord = (s: string) => {
    const m = s.match(/(-?\d+(?:\.\d+)?)/g);
    return m ? Number(m[0]) : NaN;
  };
  return list
    .map<Quake>((g) => {
      const lat = parseCoord(g.Lintang || "");
      const lng = parseCoord(g.Bujur || "");
      const lintangSign = /LS/i.test(g.Lintang || "") ? -1 : 1;
      const bujurSign = /BB/i.test(g.Bujur || "") ? -1 : 1;
      const depth = Number((g.Kedalaman || "").replace(/[^\d.]/g, "")) || 0;
      const dt = new Date(
        `${(g.Tanggal || "").split("/").reverse().join("-")}T${g.Jam || "00:00:00"}+07:00`,
      ).getTime();
      return {
        id: `bmkg:${g.DateTime || g.Tanggal + g.Jam}`,
        time: Number.isFinite(dt) ? dt : Date.now(),
        mag: Number(g.Magnitude) || 0,
        depthKm: depth,
        lat: Math.abs(lat) * lintangSign,
        lng: Math.abs(lng) * bujurSign,
        place: g.Wilayah || "Indonesia",
        country: "Indonesia",
        region: "Southeast Asia",
        tsunami: /tsunami/i.test(g.Potensi || ""),
        alert: null,
        sources: ["BMKG"],
        confidence: 50,
        primarySource: "BMKG",
      };
    })
    .filter((q) => Number.isFinite(q.lat) && Number.isFinite(q.lng) && q.mag > 0);
}

// ---------- dedup ----------
function dedupe(all: Quake[]): Quake[] {
  // group events within 60s and 100km
  const out: Quake[] = [];
  const sorted = [...all].sort((a, b) => b.mag - a.mag);
  for (const q of sorted) {
    const match = out.find(
      (o) =>
        Math.abs(o.time - q.time) < 90_000 &&
        haversineKm([o.lat, o.lng], [q.lat, q.lng]) < 120,
    );
    if (match) {
      if (!match.sources.includes(q.primarySource)) {
        match.sources.push(q.primarySource);
      }
      // tsunami flag is union
      match.tsunami = match.tsunami || q.tsunami;
      // alert: keep the more severe
      const order = { red: 4, orange: 3, yellow: 2, green: 1 } as const;
      if (q.alert && (!match.alert || order[q.alert] > order[match.alert])) {
        match.alert = q.alert;
      }
      match.confidence = Math.min(100, 40 + match.sources.length * 20);
    } else {
      out.push({ ...q, confidence: 40 + q.sources.length * 20 });
    }
  }
  return out;
}

// ---------- main fn ----------
export const getGlobalQuakes = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const since = Date.now() - data.windowHours * 3600_000;
    const sources: SourceStatus[] = [];

    const adapters: Array<{ name: string; run: () => Promise<Quake[]> }> = [
      { name: "USGS", run: () => fromUSGS(since, data.minMagnitude) },
      { name: "EMSC", run: () => fromEMSC(since, data.minMagnitude) },
      { name: "GeoNet", run: () => fromGeoNet(since, data.minMagnitude) },
      { name: "BMKG", run: () => fromBMKG() },
    ];

    const settled = await Promise.all(
      adapters.map(async (a) => {
        const t0 = Date.now();
        try {
          const list = await a.run();
          sources.push({
            name: a.name,
            ok: true,
            count: list.length,
            latencyMs: Date.now() - t0,
          });
          return list;
        } catch (e) {
          sources.push({
            name: a.name,
            ok: false,
            count: 0,
            latencyMs: Date.now() - t0,
            error: e instanceof Error ? e.message : String(e),
          });
          return [] as Quake[];
        }
      }),
    );

    const merged = dedupe(settled.flat()).filter(
      (q) => q.time >= since && q.mag >= data.minMagnitude,
    );
    merged.sort((a, b) => b.time - a.time);

    // analytics
    const now = Date.now();
    const last24h = merged.filter((q) => q.time >= now - 86_400_000);
    const last7d = merged.filter((q) => q.time >= now - 7 * 86_400_000);
    const strongest = merged.reduce<Quake | null>(
      (m, q) => (!m || q.mag > m.mag ? q : m),
      null,
    );
    const latest = merged[0] ?? null;

    // magnitude distribution buckets
    const buckets = [
      { label: "<3", min: 0, max: 3, count: 0 },
      { label: "3–4", min: 3, max: 4, count: 0 },
      { label: "4–5", min: 4, max: 5, count: 0 },
      { label: "5–6", min: 5, max: 6, count: 0 },
      { label: "6–7", min: 6, max: 7, count: 0 },
      { label: "7+", min: 7, max: 99, count: 0 },
    ];
    for (const q of merged) {
      const b = buckets.find((b) => q.mag >= b.min && q.mag < b.max);
      if (b) b.count++;
    }

    // country leaderboard
    const byCountry = new Map<string, number>();
    for (const q of merged) {
      const c = q.country?.trim() || "Unknown";
      byCountry.set(c, (byCountry.get(c) ?? 0) + 1);
    }
    const topCountries = [...byCountry.entries()]
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // hourly frequency for last 24h
    const hourly = Array.from({ length: 24 }, (_, i) => {
      const start = now - (23 - i) * 3600_000;
      const end = start + 3600_000;
      const slot = last24h.filter((q) => q.time >= start && q.time < end);
      return {
        hour: new Date(start).toISOString().slice(11, 13) + ":00",
        count: slot.length,
        maxMag: slot.reduce((m, q) => Math.max(m, q.mag), 0),
      };
    });

    // top 10 strongest in window
    const top10 = [...merged].sort((a, b) => b.mag - a.mag).slice(0, 10);

    return {
      generatedAt: now,
      windowHours: data.windowHours,
      minMagnitude: data.minMagnitude,
      sources,
      quakes: merged,
      stats: {
        total: merged.length,
        last24h: last24h.length,
        last7d: last7d.length,
        m4plus: merged.filter((q) => q.mag >= 4).length,
        m5plus: merged.filter((q) => q.mag >= 5).length,
        m6plus: merged.filter((q) => q.mag >= 6).length,
        m7plus: merged.filter((q) => q.mag >= 7).length,
        tsunamiEvents: merged.filter((q) => q.tsunami).length,
      },
      strongest,
      latest,
      buckets,
      topCountries,
      hourly,
      top10,
    };
  });
