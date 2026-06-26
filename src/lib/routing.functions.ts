import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { haversineKm } from "@/lib/resq/risk-core";

const Mode = z.enum(["driving", "walking", "cycling"]).default("driving");

const RouteInput = z.object({
  origin_lat: z.number(),
  origin_lng: z.number(),
  dest_lat: z.number(),
  dest_lng: z.number(),
  mode: Mode,
});

const FALLBACK_KMH: Record<"driving" | "walking" | "cycling", number> = {
  driving: 30, walking: 5, cycling: 15,
};

/**
 * Calls OSRM public demo server (OpenStreetMap-based). No API key, free.
 * https://project-osrm.org/
 */
export const getEvacuationRoute = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => RouteInput.parse(d))
  .handler(async ({ data }) => {
    const coords = `${data.origin_lng},${data.origin_lat};${data.dest_lng},${data.dest_lat}`;
    const url = `https://router.project-osrm.org/route/v1/${data.mode}/${coords}?overview=full&geometries=geojson&steps=false&alternatives=false`;
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
        source: `OSRM (${data.mode})`,
        mode: data.mode,
        warnings: [] as string[],
      };
    } catch {
      const km = haversineKm([data.origin_lat, data.origin_lng], [data.dest_lat, data.dest_lng]);
      const kmh = FALLBACK_KMH[data.mode];
      return {
        distance_km: +km.toFixed(2),
        duration_min: +((km / kmh) * 60).toFixed(1),
        geometry: { type: "LineString", coordinates: [[data.origin_lng, data.origin_lat], [data.dest_lng, data.dest_lat]] },
        safety_score: 60,
        source: "fallback-straight-line",
        mode: data.mode,
        warnings: ["OSRM unavailable, showing direct path estimate"],
      };
    }
  });

// Batch ETA/distance for many shelters via OSRM /table.
const MatrixInput = z.object({
  origin_lat: z.number(),
  origin_lng: z.number(),
  destinations: z.array(z.object({ id: z.string(), lat: z.number(), lng: z.number() })).min(1).max(50),
  mode: Mode,
});

export const getShelterRouteMatrix = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => MatrixInput.parse(d))
  .handler(async ({ data }) => {
    const coords = [
      `${data.origin_lng},${data.origin_lat}`,
      ...data.destinations.map((d) => `${d.lng},${d.lat}`),
    ].join(";");
    const url = `https://router.project-osrm.org/table/v1/${data.mode}/${coords}?sources=0&annotations=distance,duration`;
    const kmh = FALLBACK_KMH[data.mode];
    try {
      const res = await fetch(url, { headers: { "User-Agent": "ResQNet/1.0" } });
      if (!res.ok) throw new Error(`OSRM ${res.status}`);
      const j = await res.json() as { durations?: number[][]; distances?: number[][] };
      const dur = j.durations?.[0] ?? [];
      const dist = j.distances?.[0] ?? [];
      const results = data.destinations.map((dest, i) => {
        const seconds = dur[i + 1];
        const metres = dist[i + 1];
        if (Number.isFinite(seconds) && Number.isFinite(metres)) {
          return { id: dest.id, distance_km: +(metres / 1000).toFixed(2), duration_min: +(seconds / 60).toFixed(1), source: "OSRM" as const };
        }
        const km = haversineKm([data.origin_lat, data.origin_lng], [dest.lat, dest.lng]);
        return { id: dest.id, distance_km: +km.toFixed(2), duration_min: +((km / kmh) * 60).toFixed(1), source: "fallback" as const };
      });
      return { mode: data.mode, results };
    } catch {
      return {
        mode: data.mode,
        results: data.destinations.map((dest) => {
          const km = haversineKm([data.origin_lat, data.origin_lng], [dest.lat, dest.lng]);
          return { id: dest.id, distance_km: +km.toFixed(2), duration_min: +((km / kmh) * 60).toFixed(1), source: "fallback" as const };
        }),
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
