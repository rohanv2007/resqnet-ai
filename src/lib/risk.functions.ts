import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { computeRisk, haversineKm } from "@/lib/resq/risk-core";
import type { DisasterType } from "@/types";

const RiskInput = z.object({
  lat: z.number(),
  lng: z.number(),
  disaster: z.enum(["flood","cyclone","wildfire","urban_fire","earthquake","rainfall","landslide"]),
});

/**
 * Real risk: pulls live Open-Meteo + NASA FIRMS + verified reports + road status,
 * runs the hybrid risk model, persists the score, and returns explanation.
 */
export const predictRisk = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RiskInput.parse(d))
  .handler(async ({ data }) => {
    // 1. Weather from Open-Meteo
    const params = new URLSearchParams({
      latitude: String(data.lat), longitude: String(data.lng),
      current: "temperature_2m,relative_humidity_2m,wind_speed_10m",
      hourly: "precipitation",
      forecast_days: "1",
      timezone: "auto",
    });
    let rainfall_mm_24h = 0, wind_speed_kmh = 0, temperature_c = 25, humidity = 60;
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (r.ok) {
        const j = await r.json() as { current?: Record<string,number>; hourly?: { precipitation: number[] } };
        rainfall_mm_24h = (j.hourly?.precipitation ?? []).slice(0, 24).reduce((a,b)=>a+b, 0);
        wind_speed_kmh = j.current?.wind_speed_10m ?? 0;
        temperature_c = j.current?.temperature_2m ?? 25;
        humidity = j.current?.relative_humidity_2m ?? 60;
      }
    } catch { /* offline-friendly */ }

    // 2. NASA FIRMS hotspots within ~50 km
    let nearby_fire_hotspots = 0;
    if (data.disaster === "wildfire" || data.disaster === "urban_fire") {
      const key = process.env.NASA_FIRMS_MAP_KEY;
      if (key) {
        const d = 50 / 111;
        const area = `${data.lng-d},${data.lat-d},${data.lng+d},${data.lat+d}`;
        try {
          const r = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/${area}/2`);
          if (r.ok) {
            const csv = await r.text();
            nearby_fire_hotspots = Math.max(0, csv.trim().split("\n").length - 1);
          }
        } catch { /* ignore */ }
      }
    }

    // 3. Verified citizen reports + road blockages within 5 km
    const { createClient } = await import("@supabase/supabase-js");
    const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const [{ data: reports }, { data: roads }] = await Promise.all([
      supa.from("citizen_reports").select("lat,lng,status").eq("status","verified"),
      supa.from("road_status").select("lat,lng,status").in("status",["blocked","flooded"]),
    ]);
    const nearby_verified_reports = (reports ?? []).filter((r) => haversineKm([data.lat,data.lng],[r.lat,r.lng]) < 5).length;
    const blocked_roads_nearby = (roads ?? []).filter((r) => haversineKm([data.lat,data.lng],[r.lat,r.lng]) < 5).length;

    const result = computeRisk({
      disaster: data.disaster as DisasterType,
      rainfall_mm_24h, wind_speed_kmh, temperature_c, humidity,
      nearby_fire_hotspots, nearby_verified_reports, blocked_roads_nearby,
    });

    // Persist (best-effort)
    try {
      await supa.from("risk_scores").insert({
        lat: data.lat, lng: data.lng, disaster: data.disaster,
        score: result.score, level: result.level, confidence: result.confidence,
        trend: result.trend, top_factors: result.top_factors,
        recommended_action: result.recommended_action,
      });
    } catch { /* ignore */ }

    return {
      ...result,
      inputs: { rainfall_mm_24h, wind_speed_kmh, temperature_c, humidity,
                nearby_fire_hotspots, nearby_verified_reports, blocked_roads_nearby },
    };
  });
