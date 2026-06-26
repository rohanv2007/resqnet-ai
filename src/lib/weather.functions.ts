import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LatLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/**
 * Real-time current weather + 3-day forecast from Open-Meteo (free, no key).
 * Docs: https://open-meteo.com/en/docs
 */
// Simple in-memory cache to avoid Open-Meteo 429s (free tier ~600 req/min, but
// the dashboard fans out per panel + per location, so we cache per coord.).
const WEATHER_CACHE = new Map<string, { at: number; payload: unknown }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

type WeatherPayload = {
  current: {
    temperature_c: number | null;
    humidity: number | null;
    precipitation_mm: number | null;
    wind_speed_kmh: number | null;
    pressure: number | null;
  };
  rainfall_mm_24h: number;
  daily: Array<{ date: string; rainfall_mm: number; temp_max: number | null; temp_min: number | null; wind_max_kmh: number | null }>;
  source: string;
  fetched_at: string;
  stale?: boolean;
};

async function loadFromSupabase(lat: number, lng: number): Promise<WeatherPayload | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("weather_snapshots")
      .select("raw, created_at")
      .gte("lat", lat - 0.05).lte("lat", lat + 0.05)
      .gte("lng", lng - 0.05).lte("lng", lng + 0.05)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.raw) return { ...(data.raw as WeatherPayload), stale: true };
  } catch { /* ignore */ }
  return null;
}

async function saveToSupabase(lat: number, lng: number, payload: WeatherPayload) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("weather_snapshots").insert({
      lat, lng,
      source: payload.source,
      temperature: payload.current.temperature_c,
      humidity: payload.current.humidity,
      wind_speed_kmh: payload.current.wind_speed_kmh,
      pressure: payload.current.pressure,
      rainfall_mm: payload.rainfall_mm_24h,
      raw: payload as never,
    });
  } catch { /* ignore */ }
}

export const getWeather = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => LatLngSchema.parse(d))
  .handler(async ({ data }) => {
    const key = `${data.lat.toFixed(2)},${data.lng.toFixed(2)}`;
    const cached = WEATHER_CACHE.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return cached.payload as WeatherPayload;
    }
    const params = new URLSearchParams({
      latitude: String(data.lat),
      longitude: String(data.lng),
      current: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,pressure_msl",
      hourly: "precipitation,temperature_2m,wind_speed_10m",
      daily: "precipitation_sum,temperature_2m_max,temperature_2m_min,wind_speed_10m_max",
      forecast_days: "3",
      timezone: "auto",
    });
    const hosts = [
      "https://api.open-meteo.com/v1/forecast",
      "https://customer-api.open-meteo.com/v1/forecast",
    ];
    let res: Response | null = null;
    let lastErr: string | null = null;
    outer: for (const host of hosts) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          res = await fetch(`${host}?${params}`, {
            headers: { "User-Agent": "ResQNet/1.0 (disaster-alerts)" },
          });
          if (res.ok) break outer;
          lastErr = `Open-Meteo ${res.status}`;
          if (res.status !== 429 && res.status < 500) break;
        } catch (e) {
          lastErr = (e as Error).message;
        }
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    }
    if (!res || !res.ok) {
      if (cached) return cached.payload as WeatherPayload;
      const fromDb = await loadFromSupabase(data.lat, data.lng);
      if (fromDb) {
        WEATHER_CACHE.set(key, { at: Date.now(), payload: fromDb });
        return fromDb;
      }
      const anyMem = WEATHER_CACHE.values().next().value;
      if (anyMem) return anyMem.payload as WeatherPayload;
      throw new Error(lastErr ?? "Open-Meteo unavailable");
    }
    const json = await res.json() as {
      current?: Record<string, number>;
      hourly?: { time: string[]; precipitation: number[]; temperature_2m: number[]; wind_speed_10m: number[] };
      daily?: { time: string[]; precipitation_sum: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; wind_speed_10m_max: number[] };
    };

    const rainfall_mm_24h = (json.hourly?.precipitation ?? []).slice(0, 24).reduce((a, b) => a + b, 0);

    const payload: WeatherPayload = {
      current: {
        temperature_c: json.current?.temperature_2m ?? null,
        humidity: json.current?.relative_humidity_2m ?? null,
        precipitation_mm: json.current?.precipitation ?? null,
        wind_speed_kmh: json.current?.wind_speed_10m ?? null,
        pressure: json.current?.pressure_msl ?? null,
      },
      rainfall_mm_24h,
      daily: (json.daily?.time ?? []).map((t, i) => ({
        date: t,
        rainfall_mm: json.daily?.precipitation_sum[i] ?? 0,
        temp_max: json.daily?.temperature_2m_max[i] ?? null,
        temp_min: json.daily?.temperature_2m_min[i] ?? null,
        wind_max_kmh: json.daily?.wind_speed_10m_max[i] ?? null,
      })),
      source: "Open-Meteo",
      fetched_at: new Date().toISOString(),
    };
    WEATHER_CACHE.set(key, { at: Date.now(), payload });
    void saveToSupabase(data.lat, data.lng, payload);
    return payload;
  });
