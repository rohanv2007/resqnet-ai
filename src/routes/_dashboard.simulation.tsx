import { createFileRoute } from "@tanstack/react-router";

import { useMemo, useState } from "react";
import { Play, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { PageHeader } from "@/components/layout/PageHeader";
import { MapView } from "@/components/map";
import { ConfidenceBar, StatusBadge } from "@/components/shared";
import {
  DEFAULT_SIMULATION_PARAMS,
  calculateSimulationResult,
} from "@/lib/mock-data";
import { disasterIcons, disasterLabels } from "@/lib/labels";
import { useRiskData } from "@/lib/hooks/useRiskData";
import type { DisasterType, SimulationParams } from "@/types";

const disasterTypes: DisasterType[] = [
  "flood",
  "cyclone",
  "rainfall",
  "urban_fire",
  "earthquake",
  "wildfire",
];

const horizons: SimulationParams["timeHorizon"][] = [3, 6, 12, 24];

function Page_simulation() {
  const { selectedLocation } = useRiskData();
  const [params, setParams] = useState<SimulationParams>(
    DEFAULT_SIMULATION_PARAMS,
  );
  const result = useMemo(() => calculateSimulationResult(params), [params]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Simulation"
        description="Adjust disaster parameters and inspect operational impact in real time."
      />
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Scenario Builder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-2">
              {disasterTypes.map((type) => {
                const Icon = disasterIcons[type];
                const active = params.disasterType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setParams((current) => ({ ...current, disasterType: type }))}
                    className={`rounded-lg border p-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active ? "border-brand bg-brand-light text-brand" : "bg-card"
                    }`}
                  >
                    <Icon className="mb-2 h-4 w-4" />
                    {disasterLabels[type]}
                  </button>
                );
              })}
            </div>
            {[
              ["rainfallIntensity", "Rainfall Intensity", "%"],
              ["riverLevel", "River Level", "%"],
              ["windSpeed", "Wind Speed", "km/h"],
            ].map(([key, label, suffix]) => (
              <div key={key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{label}</Label>
                  <span className="font-mono text-sm">
                    {params[key as keyof SimulationParams]}
                    {suffix}
                  </span>
                </div>
                <Slider
                  value={[Number(params[key as keyof SimulationParams])]}
                  max={key === "windSpeed" ? 200 : 100}
                  step={1}
                  onValueChange={(value) => {
                    const nextValue = Array.isArray(value)
                      ? (value[0] ?? 0)
                      : value;
                    setParams((current) => ({ ...current, [key]: nextValue }));
                  }}
                />
              </div>
            ))}
            <div className="space-y-3">
              <Label>Time Horizon</Label>
              <div className="grid grid-cols-4 gap-2">
                {horizons.map((horizon) => (
                  <Button
                    key={horizon}
                    type="button"
                    variant={params.timeHorizon === horizon ? "default" : "outline"}
                    onClick={() =>
                      setParams((current) => ({
                        ...current,
                        timeHorizon: horizon,
                      }))
                    }
                  >
                    {horizon}h
                  </Button>
                ))}
              </div>
            </div>
            <Button className="h-10 w-full">
              <Play className="h-4 w-4" />
              Run Simulation
            </Button>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <TimerReset className="h-3.5 w-3.5" />
              Results update in real time as controls change.
            </p>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ResultCard
              title="Affected Population"
              value={result.affectedPopulation.toLocaleString("en-IN")}
              detail="people at risk"
            />
            <ResultCard
              title="Roads Likely Blocked"
              value={result.roadsBlocked}
              detail="with alternate routes"
            />
            <ResultCard
              title="Shelters At Risk"
              value={result.sheltersAtRisk}
              detail="check capacity"
            />
            <ResultCard
              title="Evacuation Time"
              value={`${result.evacuationTimeHours}h`}
              detail="full evacuation estimate"
            />
          </div>
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Impact Map</CardTitle>
              <StatusBadge status={result.confidence > 88 ? "low" : "watch"}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              </StatusBadge>
            </CardHeader>
            <CardContent className="space-y-4">
              <ConfidenceBar confidence={result.confidence} />
              <MapView
                center={[selectedLocation.lat, selectedLocation.lng]}
                simulationZones={result.impactZones}
                height="430px"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string | number;
  detail: string;
}) {
  return (
    <Card className="rounded-lg shadow-sm">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-3 text-3xl font-semibold">{value}</p>
        <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute("/_dashboard/simulation")({
  component: Page_simulation,
});
