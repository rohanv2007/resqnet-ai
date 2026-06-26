import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BboxSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  radius_km: z.number().min(1).max(500).default(100),
  days: z.number().min(1).max(10).default(2),
});

interface FirePoint {
  lat: number;
  lng: number;
  brightness: number;
  confidence: number;
  acq_datetime: string;
  satellite: string;
  frp: number;
}

/**
 * Active fire hotspots from NASA FIRMS (VIIRS_SNPP_NRT). Requires a free MAP_KEY.
 * Docs: https://firms.modaps.eosdis.nasa.gov/api/area/
 */
export const getFireHotspots = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => BboxSchema.parse(d))
  .handler(async ({ data }): Promise<{ hotspots: FirePoint[]; source: string; error?: string }> => {
    const key = process.env.NASA_FIRMS_MAP_KEY;
    if (!key) return { hotspots: [], source: "NASA FIRMS", error: "MAP_KEY not configured" };

    // Convert radius to a rough degrees bbox (1deg ~= 111km)
    const d = data.radius_km / 111;
    const west = data.lng - d;
    const south = data.lat - d;
    const east = data.lng + d;
    const north = data.lat + d;
    const area = `${west},${south},${east},${north}`;
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/${area}/${data.days}`;

    const res = await fetch(url);
    if (!res.ok) return { hotspots: [], source: "NASA FIRMS", error: `HTTP ${res.status}` };
    const csv = await res.text();
    const lines = csv.trim().split("\n");
    if (lines.length < 2) return { hotspots: [], source: "NASA FIRMS" };

    const headers = lines[0].split(",");
    const idx = (k: string) => headers.indexOf(k);
    const iLat = idx("latitude"), iLng = idx("longitude");
    const iBri = idx("bright_ti4"), iConf = idx("confidence");
    const iDate = idx("acq_date"), iTime = idx("acq_time"), iSat = idx("satellite"), iFrp = idx("frp");

    const hotspots: FirePoint[] = lines.slice(1).map((row) => {
      const c = row.split(",");
      const confRaw = c[iConf] ?? "nominal";
      // Confidence in VIIRS is l/n/h; map to integer
      const confInt = confRaw === "h" ? 90 : confRaw === "n" ? 60 : confRaw === "l" ? 30 : Number(confRaw) || 50;
      return {
        lat: Number(c[iLat]),
        lng: Number(c[iLng]),
        brightness: Number(c[iBri]) || 0,
        confidence: confInt,
        acq_datetime: `${c[iDate]}T${(c[iTime] ?? "0000").padStart(4, "0").slice(0,2)}:${(c[iTime] ?? "0000").padStart(4, "0").slice(2,4)}:00Z`,
        satellite: c[iSat] ?? "",
        frp: Number(c[iFrp]) || 0,
      };
    }).filter((h) => Number.isFinite(h.lat) && Number.isFinite(h.lng));

    // Cache best-effort
    try {
      if (hotspots.length) {
        const { createClient } = await import("@supabase/supabase-js");
        const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });
        await supa.from("fire_hotspots").insert(hotspots.slice(0, 200).map(h => ({
          lat: h.lat, lng: h.lng, brightness: h.brightness, confidence: h.confidence,
          acq_datetime: h.acq_datetime, satellite: h.satellite, frp: h.frp,
        })));
      }
    } catch { /* ignore */ }

    return { hotspots, source: "NASA FIRMS VIIRS_SNPP_NRT" };
  });
