// Pure helpers: usable on client and server. No secrets, no I/O.
import type { DisasterType, RiskLevel } from "@/types";

export function scoreToLevel(score: number): RiskLevel {
  if (score >= 80) return "danger";
  if (score >= 60) return "warning";
  if (score >= 35) return "watch";
  return "low";
}

export function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export interface RiskInputs {
  disaster: DisasterType;
  rainfall_mm_24h?: number;     // mm
  wind_speed_kmh?: number;
  temperature_c?: number;
  humidity?: number;
  nearby_fire_hotspots?: number;
  nearby_verified_reports?: number;
  blocked_roads_nearby?: number;
  elevation_m?: number | null;
  distance_to_coast_km?: number | null;
  distance_to_river_km?: number | null;
  population_density?: number | null;
}

export interface RiskOutput {
  score: number;
  level: RiskLevel;
  confidence: number;
  trend: "rising" | "stable" | "falling";
  top_factors: string[];
  recommended_action: string;
}

/**
 * Hybrid rules-based risk model. Each disaster has a weighted blend of
 * meteorological inputs + ground-truth (reports, hotspots). Designed to give
 * defensible scores in 0-100 without requiring a trained ML model.
 */
export function computeRisk(i: RiskInputs): RiskOutput {
  const factors: string[] = [];
  let score = 0;
  let confidence = 70;

  const rain = i.rainfall_mm_24h ?? 0;
  const wind = i.wind_speed_kmh ?? 0;
  const reports = i.nearby_verified_reports ?? 0;
  const hotspots = i.nearby_fire_hotspots ?? 0;
  const blocked = i.blocked_roads_nearby ?? 0;
  const elev = i.elevation_m ?? 100;

  if (i.disaster === "flood" || i.disaster === "rainfall") {
    score += Math.min(60, rain * 0.5);                       // 120mm -> 60
    if (elev < 30) { score += 12; factors.push("Low-elevation zone"); }
    if (rain > 80) factors.push(`Heavy rainfall (${rain.toFixed(0)} mm/24h)`);
    if ((i.distance_to_river_km ?? 99) < 1) { score += 10; factors.push("Within 1 km of river"); }
    score += reports * 6;
    score += blocked * 4;
    if (reports > 0) factors.push(`${reports} verified flood report(s) nearby`);
    if (blocked > 0) factors.push(`${blocked} road(s) marked blocked`);
    confidence = 75 + Math.min(15, reports * 3);
  } else if (i.disaster === "cyclone") {
    score += Math.min(55, wind * 0.6);
    score += Math.min(25, rain * 0.25);
    if ((i.distance_to_coast_km ?? 99) < 30) { score += 15; factors.push("Coastal zone (<30 km)"); }
    if (wind > 60) factors.push(`High wind speed (${wind.toFixed(0)} km/h)`);
    confidence = 78;
  } else if (i.disaster === "wildfire" || i.disaster === "urban_fire") {
    score += Math.min(50, hotspots * 12);
    if ((i.temperature_c ?? 25) > 35) { score += 12; factors.push("High temperature"); }
    if ((i.humidity ?? 60) < 30) { score += 12; factors.push("Low humidity (dry)"); }
    if (wind > 25) { score += 8; factors.push("Wind fanning conditions"); }
    if (hotspots > 0) factors.push(`${hotspots} NASA FIRMS hotspot(s) nearby`);
    confidence = 70 + Math.min(20, hotspots * 4);
  } else if (i.disaster === "earthquake") {
    // Without seismic feed, use placeholder population/exposure
    score += 10;
    if ((i.population_density ?? 0) > 10000) { score += 15; factors.push("Dense settlement"); }
    confidence = 50;
  } else if (i.disaster === "landslide") {
    score += Math.min(40, rain * 0.35);
    if (elev > 800) { score += 15; factors.push("Hill/mountain terrain"); }
    if (rain > 60) factors.push("Saturated soil from heavy rain");
    confidence = 65;
  }

  score = clamp(Math.round(score));
  const level = scoreToLevel(score);

  let recommended_action = "Monitor official updates and stay alert.";
  if (level === "danger") recommended_action = "Evacuate to nearest safe shelter immediately. Avoid roads marked blocked.";
  else if (level === "warning") recommended_action = "Prepare emergency kit and identify nearest shelter. Be ready to evacuate.";
  else if (level === "watch") recommended_action = "Stay informed. Check on vulnerable neighbors.";

  if (factors.length === 0) factors.push("No major risk signals at this time");

  return {
    score,
    level,
    confidence: clamp(confidence, 30, 98),
    trend: rain > 50 || wind > 40 ? "rising" : "stable",
    top_factors: factors.slice(0, 5),
    recommended_action,
  };
}

export function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
