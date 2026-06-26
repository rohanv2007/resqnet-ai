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
export const getWeather = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => LatLngSchema.parse(d))
  .handler(async ({ data }) => {
    const params = new URLSearchParams({
      latitude: String(data.lat),
      longitude: String(data.lng),
      current: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,pressure_msl",
      hourly: "precipitation,temperature_2m,wind_speed_10m",
      daily: "precipitation_sum,temperature_2m_max,temperature_2m_min,wind_speed_10m_max",
      forecast_days: "3",
      timezone: "auto",
    });
    const url = `https://api.open-meteo.com/v1/forecast?${params}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo error ${res.status}`);
    const json = await res.json() as {
      current?: Record<string, number>;
      hourly?: { time: string[]; precipitation: number[]; temperature_2m: number[]; wind_speed_10m: number[] };
      daily?: { time: string[]; precipitation_sum: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; wind_speed_10m_max: number[] };
    };

    // Sum rainfall over next 24 hourly slots for risk model
    const rainfall_mm_24h = (json.hourly?.precipitation ?? []).slice(0, 24).reduce((a, b) => a + b, 0);

    // (Removed best-effort snapshot insert — was a source of intermittent failures.)


    return {
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
  });
