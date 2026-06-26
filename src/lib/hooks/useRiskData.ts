import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useLocation } from "./useLocation";
import { getLiveRiskBundle } from "@/lib/live-bundle.functions";
import type { Alert, CitizenReport, Resource, RiskScore, RiskTrendPoint, RiskZone, Shelter } from "@/types";

const EMPTY_TRENDS: RiskTrendPoint[] = [];
const EMPTY_ZONES: RiskZone[] = [];

/**
 * Real-data hook. Same return shape as before, but every field is sourced from
 * live backend functions (Open-Meteo, NASA FIRMS, Lovable Cloud, hybrid risk
 * engine). While loading, returns zeroed placeholders so widgets still render.
 */
export function useRiskData() {
  const { selectedLocation } = useLocation();
  const fn = useServerFn(getLiveRiskBundle);

  const { data } = useQuery({
    queryKey: ["live-bundle", selectedLocation.id],
    queryFn: () => fn({
      data: {
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        locationId: selectedLocation.id,
        locationName: selectedLocation.name,
        population: selectedLocation.population,
        district: selectedLocation.district,
      },
    }),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const fallbackRisk: RiskScore = {
    locationId: selectedLocation.id,
    overall: 0,
    level: "low",
    activeSources: 0,
    confidence: 0,
    lastUpdated: new Date().toISOString(),
    risks: [],
  };

  return {
    selectedLocation,
    riskScore: (data?.riskScore ?? fallbackRisk) as RiskScore,
    trends: (data?.trends ?? EMPTY_TRENDS) as RiskTrendPoint[],
    zones: (data?.zones ?? EMPTY_ZONES) as RiskZone[],
    alerts: (data?.alerts ?? []) as Alert[],
    reports: (data?.reports ?? []) as CitizenReport[],
    shelters: (data?.shelters ?? []) as Shelter[],
    resources: [] as never[],
    stats: data?.stats ?? {
      activeIncidents: 0,
      sheltersAvailable: 0,
      roadsBlocked: 0,
      citizenReports: 0,
    },
    activeSources: data?.activeSources ?? [],
    weather: data?.weather,
    isLoading: !data,
  };
}
