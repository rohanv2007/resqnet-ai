import { createFileRoute } from "@tanstack/react-router";

import { useState } from "react";
import { Layers, LocateFixed, RadioTower } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PageHeader } from "@/components/layout/PageHeader";
import { MapFeature, MapView } from "@/components/map";
import { StatusBadge } from "@/components/shared";
import { useRiskData } from "@/lib/hooks/useRiskData";

const layers = [
  "Safe Shelters",
  "Active Incidents",
  "Risk Heatmap",
  "Citizen Reports",
  "Blocked Roads",
  "River Sensors",
];

const levels = ["low", "watch", "warning", "danger"];

function Page_risk_map() {
  const { selectedLocation, zones, shelters, reports } = useRiskData();
  const [feature, setFeature] = useState<MapFeature | null>(null);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Risk Map"
        description="Spatial view of risk zones, shelters, reports, and route constraints."
        actions={
          <Button variant="outline">
            <LocateFixed className="h-4 w-4" />
            Center on {selectedLocation.name}
          </Button>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4" />
              Map Layers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3">
              {layers.map((layer) => (
                <label
                  key={layer}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3 text-sm"
                >
                  {layer}
                  <Switch defaultChecked />
                </label>
              ))}
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium">Risk Legend</p>
              <div className="flex flex-wrap gap-2">
                {levels.map((level) => (
                  <StatusBadge key={level} status={level} />
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium">Filters</p>
              <div className="flex flex-wrap gap-2">
                {["Flood", "Rainfall", "Cyclone", "Urban Fire"].map((item) => (
                  <Badge key={item} variant="outline" className="rounded-full">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="rounded-lg bg-brand-light p-3 text-sm text-brand-dark dark:text-teal-100">
              <RadioTower className="mb-2 h-4 w-4" />
              {zones.length} predictive risk zones refreshed from active mock
              feeds.
            </div>
          </CardContent>
        </Card>
        <MapView
          center={[selectedLocation.lat, selectedLocation.lng]}
          zones={zones}
          shelters={shelters}
          reports={reports}
          height="calc(100vh - 190px)"
          onFeatureSelect={setFeature}
        />
      </div>
      <Sheet open={Boolean(feature)} onOpenChange={(open) => !open && setFeature(null)}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{feature?.title ?? "Map Detail"}</SheetTitle>
          </SheetHeader>
          {feature ? (
            <div className="space-y-4 px-4">
              <StatusBadge status={feature.meta} />
              <p className="text-sm text-muted-foreground">{feature.detail}</p>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Available actions
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm">Assign team</Button>
                  <Button size="sm" variant="outline">
                    Broadcast update
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export const Route = createFileRoute("/_dashboard/risk-map")({
  component: Page_risk_map,
});
