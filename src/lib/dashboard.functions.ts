import { createServerFn } from "@tanstack/react-start";

export const getDashboardSummary = createServerFn({ method: "GET" })
  .handler(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });

    const [activeAlerts, verifiedReports, openShelters, recentRisk, latestWeather] = await Promise.all([
      supa.from("alerts").select("id,severity,disaster,location_name,sent_at,status").in("status",["sent","approved"]).order("created_at",{ascending:false}).limit(20),
      supa.from("citizen_reports").select("id,type,severity,location_name,status,created_at").order("created_at",{ascending:false}).limit(20),
      supa.from("shelters").select("id,name,capacity,occupancy,status,district,state,lat,lng"),
      supa.from("risk_scores").select("*").order("computed_at",{ascending:false}).limit(50),
      supa.from("weather_snapshots").select("*").order("created_at",{ascending:false}).limit(1),
    ]);

    const totalCapacity = (openShelters.data ?? []).reduce((a, s) => a + (s.capacity ?? 0), 0);
    const totalOccupancy = (openShelters.data ?? []).reduce((a, s) => a + (s.occupancy ?? 0), 0);

    return {
      active_alerts: activeAlerts.data ?? [],
      verified_reports: (verifiedReports.data ?? []).filter(r => r.status === "verified").slice(0,10),
      pending_reports: (verifiedReports.data ?? []).filter(r => r.status === "new").slice(0,10),
      shelters: openShelters.data ?? [],
      shelter_capacity_total: totalCapacity,
      shelter_occupancy_total: totalOccupancy,
      shelter_available_beds: Math.max(0, totalCapacity - totalOccupancy),
      recent_risk_scores: recentRisk.data ?? [],
      latest_weather: latestWeather.data?.[0] ?? null,
      generated_at: new Date().toISOString(),
    };
  });
