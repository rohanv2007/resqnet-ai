import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { haversineKm } from "@/lib/resq/risk-core";

const RouteInput = z.object({
  origin_lat: z.number(),
  origin_lng: z.number(),
  dest_lat: z.number(),
  dest_lng: z.number(),
});

/**
 * Calls OSRM public demo server (OpenStreetMap-based). No API key, free.
 * https://project-osrm.org/
 */
export const getEvacuationRoute = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => RouteInput.parse(d))
  .handler(async ({ data }) => {
    const coords = `${data.origin_lng},${data.origin_lat};${data.dest_lng},${data.dest_lat}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false&alternatives=false`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": "ResQNet/1.0" } });
      if (!res.ok) throw new Error(`OSRM ${res.status}`);
      const j = await res.json() as {
        routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
      };
      const route = j.routes?.[0];
      if (!route) throw new Error("no route");
      return {
        distance_km: +(route.distance / 1000).toFixed(2),
        duration_min: +(route.duration / 60).toFixed(1),
        geometry: route.geometry,
        safety_score: 85,
        source: "OSRM",
        warnings: [] as string[],
      };
    } catch {
      // Fallback: straight-line estimate
      const km = haversineKm([data.origin_lat, data.origin_lng], [data.dest_lat, data.dest_lng]);
      return {
        distance_km: +km.toFixed(2),
        duration_min: +(km * 2).toFixed(1), // ~30 km/h
        geometry: { type: "LineString", coordinates: [[data.origin_lng, data.origin_lat], [data.dest_lng, data.dest_lat]] },
        safety_score: 60,
        source: "fallback-straight-line",
        warnings: ["OSRM unavailable, showing direct path estimate"],
      };
    }
  });

const NearbyShelters = z.object({
  lat: z.number(),
  lng: z.number(),
  limit: z.number().min(1).max(20).default(5),
});

export const getNearbyShelters = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => NearbyShelters.parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const { data: shelters } = await supa.from("shelters").select("*");
    const ranked = (shelters ?? [])
      .map((s) => ({ ...s, distance_km: +haversineKm([data.lat, data.lng], [s.lat, s.lng]).toFixed(2) }))
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, data.limit);
    return ranked;
  });
