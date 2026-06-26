import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Ambulance, Bike, Car, Footprints, Loader2, Navigation, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/PageHeader";
import { MapView } from "@/components/map";
import { StatusBadge } from "@/components/shared";
import { useRiskData } from "@/lib/hooks/useRiskData";
import { getEvacuationRoute, getShelterRouteMatrix } from "@/lib/routing.functions";

type Mode = "driving" | "walking" | "cycling";

const MODE_META: Record<Mode, { label: string; icon: typeof Car }> = {
  driving: { label: "Driving", icon: Car },
  walking: { label: "Walking", icon: Footprints },
  cycling: { label: "Cycling", icon: Bike },
};

function Page_evacuation() {
  const { selectedLocation, shelters, stats, zones } = useRiskData();
  const [selectedShelterId, setSelectedShelterId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("driving");

  // Limit matrix call to nearest ~15 candidates (OSRM table cap & UI list size).
  const candidateShelters = useMemo(() => shelters.slice(0, 15), [shelters]);

  const matrixFn = useServerFn(getShelterRouteMatrix);
  const matrixQuery = useQuery({
    enabled: candidateShelters.length > 0,
    queryKey: ["evac-matrix", selectedLocation.id, mode, candidateShelters.map((s) => s.id).join(",")],
    queryFn: () =>
      matrixFn({
        data: {
          origin_lat: selectedLocation.lat,
          origin_lng: selectedLocation.lng,
          destinations: candidateShelters.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng })),
          mode,
        },
      }),
    staleTime: 60_000,
  });

  // Merge OSRM matrix results into shelter list and re-sort by real driving/walking distance.
  const enrichedShelters = useMemo(() => {
    const byId = new Map(matrixQuery.data?.results.map((r) => [r.id, r]) ?? []);
    return candidateShelters
      .map((s) => {
        const r = byId.get(s.id);
        return {
          ...s,
          distanceKm: r?.distance_km ?? s.distanceKm,
          durationMin: r?.duration_min,
          routeSource: r?.source,
        };
      })
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }, [candidateShelters, matrixQuery.data]);

  const selectedShelter = useMemo(
    () => enrichedShelters.find((s) => s.id === selectedShelterId) ?? enrichedShelters[0],
    [enrichedShelters, selectedShelterId],
  );

  const routeFn = useServerFn(getEvacuationRoute);
  const routeQuery = useQuery({
    enabled: !!selectedShelter,
    queryKey: ["evac-route", selectedLocation.id, selectedShelter?.id, mode],
    queryFn: () =>
      routeFn({
        data: {
          origin_lat: selectedLocation.lat,
          origin_lng: selectedLocation.lng,
          dest_lat: selectedShelter!.lat,
          dest_lng: selectedShelter!.lng,
          mode,
        },
      }),
    staleTime: 60_000,
  });

  const polylineCoords = useMemo(() => {
    const g = routeQuery.data?.geometry;
    if (!g) return [];
    return (g.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng] as [number, number]);
  }, [routeQuery.data]);

  const baseSafety = routeQuery.data?.safety_score ?? 0;
  const safetyScore = Math.max(10, baseSafety - Math.min(40, stats.roadsBlocked * 8));
  const segmentSafety: "safe" | "caution" | "avoid" =
    safetyScore >= 75 ? "safe" : safetyScore >= 50 ? "caution" : "avoid";

  const fmtDuration = (min?: number) => {
    if (min == null || !Number.isFinite(min)) return "—";
    if (min < 60) return `${Math.round(min)} min`;
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evacuation"
        description="Real-time routing via OSRM (OpenStreetMap). Distance and ETA reflect the chosen travel mode."
      />
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card className="rounded-lg shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Origin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border bg-background p-3">
                <p className="text-sm font-medium">{selectedLocation.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedLocation.district}, {selectedLocation.state}
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Travel mode
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(MODE_META) as Mode[]).map((m) => {
                    const Icon = MODE_META[m].icon;
                    const active = mode === m;
                    return (
                      <Button
                        key={m}
                        type="button"
                        size="sm"
                        variant={active ? "default" : "outline"}
                        onClick={() => setMode(m)}
                        className="gap-1.5"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {MODE_META[m].label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                Nearest Safe Shelters
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({enrichedShelters.length})
                </span>
                {matrixQuery.isFetching && (
                  <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {enrichedShelters.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No shelters registered for this region yet.
                </p>
              )}
              {enrichedShelters.slice(0, 8).map((shelter) => {
                const occupancy = shelter.capacity
                  ? Math.round((shelter.occupancy / shelter.capacity) * 100)
                  : 0;
                const active = selectedShelter?.id === shelter.id;
                return (
                  <div
                    key={shelter.id}
                    className={`rounded-lg border bg-background p-3 transition ${active ? "border-brand ring-1 ring-brand" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{shelter.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {shelter.distanceKm ?? "—"} km · {fmtDuration(shelter.durationMin)}
                        </p>
                      </div>
                      <StatusBadge status={shelter.status} />
                    </div>
                    <Progress value={occupancy} className="mt-3 h-1.5" />
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {occupancy}% occupied ({shelter.occupancy}/{shelter.capacity})
                      </span>
                      <Button
                        size="sm"
                        variant={active ? "default" : "outline"}
                        onClick={() => setSelectedShelterId(shelter.id)}
                      >
                        {active ? "Selected" : "Select Route"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-sm">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-brand" />
                <p className="text-sm font-medium">Selected route safety</p>
                {routeQuery.isFetching && (
                  <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
              <Progress value={safetyScore} className="h-2" />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Travel time</p>
                  <p className="font-semibold">{fmtDuration(routeQuery.data?.duration_min)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Distance</p>
                  <p className="font-semibold">
                    {routeQuery.data ? `${routeQuery.data.distance_km.toFixed(1)} km` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Destination</p>
                  <p className="font-semibold">{selectedShelter?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Source</p>
                  <p className="text-xs font-semibold">{routeQuery.data?.source ?? "—"}</p>
                </div>
              </div>
              {stats.roadsBlocked > 0 && (
                <div className="rounded-lg border border-risk-warning/20 bg-risk-warning-bg p-3 text-sm text-risk-warning">
                  <TriangleAlert className="mb-2 h-4 w-4" />
                  {stats.roadsBlocked} road{stats.roadsBlocked === 1 ? "" : "s"} reported blocked or flooded nearby. Safety score adjusted.
                </div>
              )}
              {routeQuery.data?.warnings?.map((w) => (
                <div
                  key={w}
                  className="rounded-lg border border-risk-warning/20 bg-risk-warning-bg p-3 text-sm text-risk-warning"
                >
                  {w}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Ambulance className="h-4 w-4 text-brand" />
              Route Map · {MODE_META[mode].label}
            </CardTitle>
            <StatusBadge status="active" />
          </CardHeader>
          <CardContent>
            <MapView
              center={[selectedLocation.lat, selectedLocation.lng]}
              shelters={enrichedShelters}
              zones={zones}
              originMarker={{
                lat: selectedLocation.lat,
                lng: selectedLocation.lng,
                label: selectedLocation.name,
              }}
              routePolyline={
                polylineCoords.length > 1
                  ? {
                      coordinates: polylineCoords,
                      label: `${selectedLocation.name} → ${selectedShelter?.name ?? ""}`,
                      safety: segmentSafety,
                    }
                  : undefined
              }
              height="calc(100vh - 220px)"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_dashboard/evacuation")({
  component: Page_evacuation,
});
