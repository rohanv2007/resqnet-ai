import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Ambulance, Loader2, Navigation, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/PageHeader";
import { MapView } from "@/components/map";
import { StatusBadge } from "@/components/shared";
import { useRiskData } from "@/lib/hooks/useRiskData";
import { getEvacuationRoute } from "@/lib/routing.functions";

function Page_evacuation() {
  const { selectedLocation, shelters, stats, zones } = useRiskData();
  const [selectedShelterId, setSelectedShelterId] = useState<string | null>(null);

  const selectedShelter = useMemo(
    () => shelters.find((s) => s.id === selectedShelterId) ?? shelters[0],
    [shelters, selectedShelterId],
  );

  const routeFn = useServerFn(getEvacuationRoute);
  const routeQuery = useQuery({
    enabled: !!selectedShelter,
    queryKey: ["evac-route", selectedLocation.id, selectedShelter?.id],
    queryFn: () =>
      routeFn({
        data: {
          origin_lat: selectedLocation.lat,
          origin_lng: selectedLocation.lng,
          dest_lat: selectedShelter!.lat,
          dest_lng: selectedShelter!.lng,
        },
      }),
    staleTime: 60_000,
  });

  // Convert OSRM [lng,lat] -> Leaflet [lat,lng]
  const polylineCoords = useMemo(() => {
    const g = routeQuery.data?.geometry;
    if (!g) return [];
    return (g.coordinates as [number, number][]).map(
      ([lng, lat]) => [lat, lng] as [number, number],
    );
  }, [routeQuery.data]);

  // Safety score is reduced by nearby blocked roads (real signal from live bundle).
  const baseSafety = routeQuery.data?.safety_score ?? 0;
  const safetyScore = Math.max(
    10,
    baseSafety - Math.min(40, stats.roadsBlocked * 8),
  );

  const segmentSafety: "safe" | "caution" | "avoid" =
    safetyScore >= 75 ? "safe" : safetyScore >= 50 ? "caution" : "avoid";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evacuation"
        description="Real-time evacuation routing powered by OSRM (OpenStreetMap road network)."
      />
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card className="rounded-lg shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Origin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-background p-3">
                <p className="text-sm font-medium">{selectedLocation.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedLocation.district}, {selectedLocation.state}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">
                Nearest Safe Shelters
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({shelters.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {shelters.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No shelters registered for this region yet.
                </p>
              )}
              {shelters.slice(0, 6).map((shelter) => {
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
                      <div>
                        <p className="text-sm font-medium">{shelter.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {shelter.distanceKm ?? "—"} km away
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
                  <p className="font-semibold">
                    {routeQuery.data
                      ? `${routeQuery.data.duration_min.toFixed(0)} min`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Distance</p>
                  <p className="font-semibold">
                    {routeQuery.data
                      ? `${routeQuery.data.distance_km.toFixed(1)} km`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Destination</p>
                  <p className="font-semibold">{selectedShelter?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Source</p>
                  <p className="font-semibold text-xs">
                    {routeQuery.data?.source ?? "—"}
                  </p>
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
              Route Map
            </CardTitle>
            <StatusBadge status="active" />
          </CardHeader>
          <CardContent>
            <MapView
              center={[selectedLocation.lat, selectedLocation.lng]}
              shelters={shelters}
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
