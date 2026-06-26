import { createFileRoute } from "@tanstack/react-router";

import { Ambulance, Navigation, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/PageHeader";
import { MapView } from "@/components/map";
import { StatusBadge } from "@/components/shared";
import { ROUTE_SEGMENTS } from "@/lib/mock-data";
import { useRiskData } from "@/lib/hooks/useRiskData";

function Page_evacuation() {
  const { selectedLocation, shelters } = useRiskData();
  const selectedShelter = shelters[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evacuation"
        description="Rank safe shelters and inspect route safety from the current location."
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
              <CardTitle className="text-base">Nearest Safe Shelters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {shelters.map((shelter) => {
                const occupancy = Math.round(
                  (shelter.occupancy / shelter.capacity) * 100,
                );
                return (
                  <div key={shelter.id} className="rounded-lg border bg-background p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{shelter.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {shelter.distanceKm} km away
                        </p>
                      </div>
                      <StatusBadge status={shelter.status} />
                    </div>
                    <Progress value={occupancy} className="mt-3 h-1.5" />
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {occupancy}% occupied
                      </span>
                      <Button size="sm" variant="outline">
                        Select Route
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
              </div>
              <Progress value={82} className="h-2" />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Travel time</p>
                  <p className="font-semibold">24 min</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Destination</p>
                  <p className="font-semibold">{selectedShelter.name}</p>
                </div>
              </div>
              <div className="rounded-lg border border-risk-warning/20 bg-risk-warning-bg p-3 text-sm text-risk-warning">
                <TriangleAlert className="mb-2 h-4 w-4" />
                Waterlogging reported near market junction. Use eastern lane.
              </div>
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
              routeSegments={ROUTE_SEGMENTS}
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
