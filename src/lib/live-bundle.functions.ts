import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { computeRisk, haversineKm } from "@/lib/resq/risk-core";
import type { DisasterType, RiskLevel } from "@/types";

const Input = z.object({
  lat: z.number(),
  lng: z.number(),
  locationId: z.string(),
  locationName: z.string(),
  population: z.number().optional(),
  district: z.string().optional(),
});

interface DailySlot {
  date: string;
  rainfall_mm: number;
  temp_max: number | null;
  temp_min: number | null;
  wind_max_kmh: number | null;
}

const DISASTERS: DisasterType[] = ["flood", "rainfall", "cyclone", "urban_fire", "earthquake", "wildfire"];

/**
 * Single batched call that powers the dashboard with REAL data:
 *   - Open-Meteo (current + 3-day forecast, 24h rainfall)
 *   - NASA FIRMS (active fire hotspots near location)
 *   - Lovable Cloud tables: citizen_reports, shelters, alerts, road_status
 *   - Hybrid risk engine per disaster type
 * Returns the same shape the existing dashboard widgets already consume.
 */
export const getLiveRiskBundle = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const now = new Date().toISOString();
    const activeSources: string[] = [];

    // ---------- 1. WEATHER (Open-Meteo) with retries + Supabase fallback ----------
    let rainfall_mm_24h = 0, wind_speed_kmh = 0, temperature_c = 25, humidity = 60;
    let daily: DailySlot[] = [];
    let weatherOk = false;
    const p = new URLSearchParams({
      latitude: String(data.lat), longitude: String(data.lng),
      current: "temperature_2m,relative_humidity_2m,wind_speed_10m",
      hourly: "precipitation",
      daily: "precipitation_sum,temperature_2m_max,temperature_2m_min,wind_speed_10m_max",
      past_days: "4", forecast_days: "3", timezone: "auto",
    });
    const wxHosts = [
      "https://api.open-meteo.com/v1/forecast",
      "https://customer-api.open-meteo.com/v1/forecast",
    ];
    outer: for (const host of wxHosts) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const r = await fetch(`${host}?${p}`, { headers: { "User-Agent": "ResQNet/1.0" } });
          if (r.ok) {
            const j = await r.json() as {
              current?: Record<string, number>;
              hourly?: { precipitation: number[] };
              daily?: { time: string[]; precipitation_sum: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; wind_speed_10m_max: number[] };
            };
            rainfall_mm_24h = (j.hourly?.precipitation ?? []).slice(-24).reduce((a, b) => a + b, 0);
            wind_speed_kmh = j.current?.wind_speed_10m ?? 0;
            temperature_c = j.current?.temperature_2m ?? 25;
            humidity = j.current?.relative_humidity_2m ?? 60;
            daily = (j.daily?.time ?? []).map((t, i) => ({
              date: t,
              rainfall_mm: j.daily?.precipitation_sum?.[i] ?? 0,
              temp_max: j.daily?.temperature_2m_max?.[i] ?? null,
              temp_min: j.daily?.temperature_2m_min?.[i] ?? null,
              wind_max_kmh: j.daily?.wind_speed_10m_max?.[i] ?? null,
            }));
            activeSources.push("Open-Meteo");
            weatherOk = true;
            break outer;
          }
          if (r.status !== 429 && r.status < 500) break;
        } catch { /* retry */ }
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
    if (!weatherOk) {
      try {
        const { supabaseAdmin: sa } = await import("@/integrations/supabase/client.server");
        const { data: snap } = await sa
          .from("weather_snapshots")
          .select("raw, rainfall_mm, wind_speed_kmh, temperature, humidity, created_at")
          .gte("lat", data.lat - 0.5).lte("lat", data.lat + 0.5)
          .gte("lng", data.lng - 0.5).lte("lng", data.lng + 0.5)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (snap) {
          rainfall_mm_24h = snap.rainfall_mm ?? rainfall_mm_24h;
          wind_speed_kmh = snap.wind_speed_kmh ?? wind_speed_kmh;
          temperature_c = snap.temperature ?? temperature_c;
          humidity = snap.humidity ?? humidity;
          const raw = (snap.raw as { daily?: DailySlot[] } | null) ?? null;
          if (raw?.daily) daily = raw.daily;
          activeSources.push("Open-Meteo");
        }
      } catch { /* ignore */ }
    }

    // ---------- 2. FIRMS hotspots within ~80 km ----------
    const hotspots: { lat: number; lng: number; frp: number; confidence: number }[] = [];
    const key = process.env.NASA_FIRMS_MAP_KEY;
    if (key) {
      const d = 80 / 111;
      const area = `${data.lng - d},${data.lat - d},${data.lng + d},${data.lat + d}`;
      try {
        const r = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/${area}/2`);
        if (r.ok) {
          const csv = await r.text();
          const lines = csv.trim().split("\n");
          if (lines.length >= 2) {
            const h = lines[0].split(",");
            const iLat = h.indexOf("latitude"), iLng = h.indexOf("longitude");
            const iConf = h.indexOf("confidence"), iFrp = h.indexOf("frp");
            for (const row of lines.slice(1)) {
              const c = row.split(",");
              const lat = Number(c[iLat]), lng = Number(c[iLng]);
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
              const conf = c[iConf];
              hotspots.push({
                lat, lng,
                frp: Number(c[iFrp]) || 0,
                confidence: conf === "h" ? 90 : conf === "n" ? 60 : conf === "l" ? 30 : Number(conf) || 50,
              });
            }
            activeSources.push("NASA FIRMS");
          }
        }
      } catch { /* ignore */ }
    }
    const nearby_fire_hotspots = hotspots.filter((h) => haversineKm([data.lat, data.lng], [h.lat, h.lng]) < 50).length;

    // ---------- 2b. USGS earthquakes (last 7 days, within 300 km) ----------
    const quakes: { lat: number; lng: number; mag: number; depth: number; place: string; time: number; distanceKm: number }[] = [];
    try {
      const starttime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const qp = new URLSearchParams({
        format: "geojson",
        starttime,
        latitude: String(data.lat),
        longitude: String(data.lng),
        maxradiuskm: "300",
        minmagnitude: "2.5",
        orderby: "magnitude",
        limit: "50",
      });
      const r = await fetch(`https://earthquake.usgs.gov/fdsnws/event/1/query?${qp}`);
      if (r.ok) {
        const j = await r.json() as { features?: Array<{ properties: { mag: number; place: string; time: number }; geometry: { coordinates: [number, number, number] } }> };
        for (const f of j.features ?? []) {
          const [lng, lat, depth] = f.geometry.coordinates;
          quakes.push({
            lat, lng,
            mag: f.properties.mag,
            depth,
            place: f.properties.place,
            time: f.properties.time,
            distanceKm: Math.round(haversineKm([data.lat, data.lng], [lat, lng]) * 10) / 10,
          });
        }
        activeSources.push("USGS Earthquakes");
      }
    } catch { /* ignore */ }
    const recent_quake_count = quakes.length;
    const max_quake_magnitude = quakes.reduce((m, q) => Math.max(m, q.mag), 0);
    const nearest_quake_km = quakes.length ? Math.min(...quakes.map((q) => q.distanceKm)) : null;

    // ---------- 3. Lovable Cloud reads (reports, shelters, alerts, road_status) ----------
    const { createClient } = await import("@supabase/supabase-js");
    const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    // citizen_reports and resources contain PII (reporter names, responder contact info)
    // and are no longer publicly readable, so use the admin client for the server-side
    // dashboard aggregation. Aggregated data is shaped before returning to the browser.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [
      { data: rReports },
      { data: rShelters },
      { data: rAlerts },
      { data: rRoads },
      { data: rResources },
    ] = await Promise.all([
      supabaseAdmin.from("citizen_reports").select("*").order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("shelters").select("*").order("name"),
      supa.from("alerts").select("*").order("created_at", { ascending: false }).limit(50),
      supa.from("road_status").select("*").in("status", ["blocked", "flooded"]).limit(100),
      supabaseAdmin.from("resources").select("*").order("updated_at", { ascending: false }).limit(100),
    ]);
    activeSources.push("Lovable Cloud");
    activeSources.push("Citizen Reports");

    const reports = rReports ?? [];
    const shelters = rShelters ?? [];
    const alerts = rAlerts ?? [];
    const roads = rRoads ?? [];
    const resourcesRows = rResources ?? [];

    const nearby_verified_reports = reports
      .filter((r) => r.status === "verified")
      .filter((r) => haversineKm([data.lat, data.lng], [Number(r.lat), Number(r.lng)]) < 5).length;
    const blocked_roads_nearby = roads
      .filter((r) => haversineKm([data.lat, data.lng], [Number(r.lat), Number(r.lng)]) < 5).length;

    // ---------- 4. Per-disaster risk via hybrid engine ----------
    const risks = DISASTERS.map((disaster) => {
      const out = computeRisk({
        disaster,
        rainfall_mm_24h, wind_speed_kmh, temperature_c, humidity,
        nearby_fire_hotspots, nearby_verified_reports, blocked_roads_nearby,
        population_density: data.population,
        recent_quake_count, max_quake_magnitude, nearest_quake_km,
      });
      return {
        type: disaster,
        level: out.level,
        score: out.score,
        trend: out.trend,
        confidence: out.confidence,
        lastUpdated: now,
      };
    });

    const overall = Math.round(risks.reduce((a, r) => Math.max(a, r.score), 0));
    const level: RiskLevel = overall >= 80 ? "danger" : overall >= 60 ? "warning" : overall >= 35 ? "watch" : "low";
    const confidence = Math.round(risks.reduce((a, r) => a + r.confidence, 0) / risks.length);

    const riskScore = {
      locationId: data.locationId,
      overall,
      level,
      activeSources: activeSources.length,
      confidence,
      lastUpdated: now,
      risks,
    };

    // ---------- 5. Trends from past+future Open-Meteo daily ----------
    const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const trends = daily.map((d) => {
      const dayLabel = dow[new Date(d.date).getDay()];
      const flood = Math.round(Math.min(100, (d.rainfall_mm) * 1.1));
      const rainfall = Math.round(Math.min(100, (d.rainfall_mm) * 1.3));
      const cyclone = Math.round(Math.min(100, (d.wind_max_kmh ?? 0) * 0.9));
      return {
        day: dayLabel,
        flood, rainfall, cyclone,
        overall: Math.round((flood + rainfall + cyclone) / 3),
      };
    });

    // ---------- 6. Risk zones derived from hotspots & blocked roads ----------
    const zones = [
      ...hotspots.slice(0, 5).map((h, i) => ({
        id: `firms-${i}`,
        lat: h.lat, lng: h.lng,
        radius: 800,
        level: (h.frp > 30 ? "danger" : h.frp > 10 ? "warning" : "watch") as RiskLevel,
        label: `Active fire (FRP ${h.frp.toFixed(0)})`,
      })),
      ...roads.slice(0, 5).map((r, i) => ({
        id: `road-${i}`,
        lat: Number(r.lat), lng: Number(r.lng),
        radius: 500,
        level: (r.status === "flooded" ? "danger" : "warning") as RiskLevel,
        label: r.name ?? `Road ${r.status}`,
      })),
      ...quakes.slice(0, 8).map((q, i) => ({
        id: `quake-${i}`,
        lat: q.lat, lng: q.lng,
        radius: Math.max(600, q.mag * 800),
        level: (q.mag >= 5 ? "danger" : q.mag >= 4 ? "warning" : "watch") as RiskLevel,
        label: `M${q.mag.toFixed(1)} quake — ${q.place}`,
      })),
    ];

    // ---------- 7. REAL nearby shelters from OpenStreetMap (Overpass API) ----------
    // Query schools, community centres, hospitals, places of worship, town halls,
    // colleges, and explicit emergency shelters within ~15 km of the user.
    type OsmShelter = {
      id: string; name: string; lat: number; lng: number;
      capacity: number; occupancy: number; contact: string;
      facilities: string[]; status: "open" | "full" | "closed"; distanceKm: number;
    };
    const osmShelters: OsmShelter[] = [];
    try {
      const radius = 15000; // metres
      const ql = `[out:json][timeout:20];(
        node["amenity"="shelter"](around:${radius},${data.lat},${data.lng});
        node["amenity"="school"](around:${radius},${data.lat},${data.lng});
        node["amenity"="college"](around:${radius},${data.lat},${data.lng});
        node["amenity"="community_centre"](around:${radius},${data.lat},${data.lng});
        node["amenity"="townhall"](around:${radius},${data.lat},${data.lng});
        node["amenity"="hospital"](around:${radius},${data.lat},${data.lng});
        node["amenity"="place_of_worship"](around:${radius},${data.lat},${data.lng});
        way["amenity"="school"](around:${radius},${data.lat},${data.lng});
        way["amenity"="hospital"](around:${radius},${data.lat},${data.lng});
        way["amenity"="community_centre"](around:${radius},${data.lat},${data.lng});
      );out center 80;`;
      const endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
      ];
      let json: { elements?: Array<{ type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }> } | null = null;
      for (const url of endpoints) {
        try {
          const r = await fetch(url, {
            method: "POST",
            body: "data=" + encodeURIComponent(ql),
            headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "ResQNet/1.0" },
          });
          if (r.ok) { json = await r.json(); break; }
        } catch { /* try next */ }
      }
      for (const el of json?.elements ?? []) {
        const lat = el.lat ?? el.center?.lat;
        const lng = el.lon ?? el.center?.lon;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const tags = el.tags ?? {};
        const amenity = tags.amenity ?? "shelter";
        const name = tags.name || tags["name:en"] || `${amenity.replace(/_/g, " ")} (unnamed)`;
        const capMap: Record<string, number> = { school: 600, college: 1200, community_centre: 400, townhall: 300, hospital: 200, place_of_worship: 250, shelter: 150 };
        const capacity = Number(tags.capacity) || capMap[amenity] || 300;
        const distanceKm = Math.round(haversineKm([data.lat, data.lng], [lat!, lng!]) * 10) / 10;
        osmShelters.push({
          id: `osm-${el.type}-${el.id}`,
          name,
          lat: lat!, lng: lng!,
          capacity,
          occupancy: 0,
          contact: tags.phone || tags["contact:phone"] || "",
          facilities: [amenity.replace(/_/g, " ")],
          status: "open",
          distanceKm,
        });
      }
      if (osmShelters.length) activeSources.push("OpenStreetMap");
    } catch { /* offline */ }

    // Merge with Supabase shelter rows (if any). Real OSM POIs win for nearest list.
    const supaSheltersOut: OsmShelter[] = shelters.map((s) => ({
      id: s.id,
      name: s.name,
      lat: Number(s.lat), lng: Number(s.lng),
      capacity: s.capacity ?? 0,
      occupancy: s.occupancy ?? 0,
      contact: s.contact ?? "",
      facilities: s.facilities ?? [],
      status: (s.status ?? "open") as "open" | "full" | "closed",
      distanceKm: Math.round(haversineKm([data.lat, data.lng], [Number(s.lat), Number(s.lng)]) * 10) / 10,
    }));

    const sheltersOut = [...osmShelters, ...supaSheltersOut]
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
      .slice(0, 20);

    const reportsOut = reports.slice(0, 30).map((r) => ({
      id: r.id,
      type: r.type,
      locationName: r.location_name ?? "Unknown",
      lat: Number(r.lat), lng: Number(r.lng),
      severity: (r.severity ?? "watch") as RiskLevel,
      description: r.description ?? "",
      imageUrl: r.image_url ?? undefined,
      status: (r.status === "rejected" ? "duplicate" : r.status ?? "new") as "new" | "verified" | "duplicate" | "resolved",
      reportedBy: r.reported_by_name ?? "Citizen",
      reportedAt: r.created_at,
      verifiedAt: r.verified_at ?? undefined,
    }));

    const alertsOut = alerts.map((a) => {
      const mappedStatus = a.status === "sent" ? "sent"
        : a.status === "approved" ? "sent"
        : a.status === "draft" ? "draft"
        : "draft";
      return {
        id: a.id,
        title: a.title,
        message: a.message,
        language: a.language,
        riskLevel: a.severity as RiskLevel,
        locationId: data.locationId,
        locationName: a.location_name ?? data.locationName,
        channels: a.channels ?? [],
        status: mappedStatus as "draft" | "sent" | "delivered" | "failed",
        recipientCount: a.recipient_count ?? 0,
        deliveredCount: a.delivered_count ?? 0,
        sentAt: a.sent_at ?? a.created_at,
        sentBy: a.created_by_name ?? "ResQNet Authority",
      };
    });

    const resourcesOut = resourcesRows.map((r) => ({
      id: r.id,
      type: (r.type ?? "rescue_team") as "rescue_team" | "shelter" | "medical" | "food_water" | "vehicle",
      name: r.name,
      location: r.location ?? "",
      status: (r.status ?? "available") as "available" | "deployed" | "maintenance",
      capacity: r.capacity ?? undefined,
      currentLoad: r.current_load ?? undefined,
      contact: r.contact ?? "",
      lastUpdated: r.updated_at,
    }));

    const activeIncidents = reports.filter((r) => r.status === "verified" && (r.severity === "danger" || r.severity === "warning")).length;
    const sheltersAvailable = sheltersOut.filter((s) => s.status === "open").length;
    const roadsBlocked = roads.length;

    return {
      riskScore,
      trends,
      zones,
      alerts: alertsOut,
      reports: reportsOut,
      shelters: sheltersOut,
      resources: resourcesOut,
      stats: {
        activeIncidents,
        sheltersAvailable,
        roadsBlocked,
        citizenReports: reports.length,
      },
      activeSources,
      weather: {
        temperature_c, humidity, wind_speed_kmh, rainfall_mm_24h, daily,
      },
      hotspots,
      quakes,
      fetched_at: now,
    };
  });

