import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { haversineKm, scoreToLevel } from "@/lib/resq/risk-core";

const SimInput = z.object({
  disaster: z.enum(["flood","cyclone","wildfire","urban_fire","earthquake","rainfall","landslide"]),
  lat: z.number(),
  lng: z.number(),
  scenario_name: z.string().optional(),
  rainfall_mm: z.number().min(0).max(1000).default(80),
  wind_speed_kmh: z.number().min(0).max(300).default(40),
  river_level_pct: z.number().min(0).max(200).default(60),
  fire_spread_rate: z.number().min(0).max(100).default(0),
  earthquake_magnitude: z.number().min(0).max(10).default(0),
  duration_hours: z.number().min(1).max(48).default(6),
});

export const runSimulation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SimInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Simplified digital-twin: combine pressure factors into a 0-100 intensity
    const pressure =
      data.rainfall_mm * 0.4 +
      data.wind_speed_kmh * 0.25 +
      data.river_level_pct * 0.2 +
      data.fire_spread_rate * 0.3 +
      data.earthquake_magnitude * 12;
    const intensity = Math.min(100, Math.round(pressure));
    const horizon = data.duration_hours / 6;

    // Pull nearby shelters + roads to ground the impact estimate
    const [{ data: shelters }, { data: roads }] = await Promise.all([
      supabase.from("shelters").select("id,name,lat,lng,capacity"),
      supabase.from("road_status").select("lat,lng,status"),
    ]);
    const radius_km = Math.max(2, intensity / 8);
    const sheltersInZone = (shelters ?? []).filter((s) => haversineKm([data.lat,data.lng],[s.lat,s.lng]) <= radius_km);
    const roadsInZone = (roads ?? []).filter((r) => haversineKm([data.lat,data.lng],[r.lat,r.lng]) <= radius_km);

    // Affected population estimate: density assumption + pressure
    const affected_population = Math.round(intensity * 480 * horizon);
    const result = {
      intensity,
      level: scoreToLevel(intensity),
      radius_km,
      affected_population,
      roads_blocked: roadsInZone.length + Math.max(1, Math.round(intensity / 12)),
      shelters_at_risk: sheltersInZone.length,
      evacuation_time_hours: +(2.1 + intensity / 30).toFixed(1),
      confidence: Math.min(95, 70 + Math.round(intensity / 6)),
      impact_zones: [
        { lat: data.lat, lng: data.lng, radius_m: Math.round(radius_km * 1000 * 0.6), level: scoreToLevel(intensity) },
        { lat: data.lat + 0.01, lng: data.lng + 0.01, radius_m: Math.round(radius_km * 1000 * 0.35), level: scoreToLevel(Math.max(20, intensity - 25)) },
      ],
      nearby_shelters: sheltersInZone.slice(0, 5),
    };

    const { data: saved, error } = await supabase.from("simulation_runs").insert({
      disaster: data.disaster,
      scenario_name: data.scenario_name ?? `${data.disaster} @${data.lat.toFixed(2)},${data.lng.toFixed(2)}`,
      lat: data.lat, lng: data.lng,
      parameters: data,
      result,
      affected_population: result.affected_population,
      roads_blocked: result.roads_blocked,
      shelters_at_risk: result.shelters_at_risk,
      confidence: result.confidence,
      created_by: userId,
    }).select().single();
    if (error) throw error;
    return saved;
  });

export const listSimulations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("simulation_runs").select("*")
      .order("created_at", { ascending: false }).limit(20);
    if (error) throw error;
    return data;
  });
