import { createFileRoute } from "@tanstack/react-router";

import {
  AlertTriangle,
  ClipboardList,
  MapPinned,
  Route as RouteIcon,
  ShieldAlert,
  Tent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  AlertCard,
  DashboardWidgetGrid,
  DisasterRiskCard,
  RiskScoreCard,
  RiskTrendChart,
  StatCard,
} from "@/components/dashboard";
import { LastUpdated, StatusBadge } from "@/components/shared";
import { MapView } from "@/components/map";
import { reportIcons, reportLabels } from "@/lib/labels";
import { useRiskData } from "@/lib/hooks/useRiskData";

function Page_overview() {
  const {
    selectedLocation,
    riskScore,
    trends,
    alerts,
    reports,
    shelters,
    zones,
    stats,
  } = useRiskData();
  const center: [number, number] = [selectedLocation.lat, selectedLocation.lng];

  function renderWidget(id: string) {
    switch (id) {
      case "stat-cards":
        return (
          <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Active Incidents"
              value={stats.activeIncidents}
              detail="+1 in the last hour"
              icon={ShieldAlert}
              tone="brand"
            />
            <StatCard
              title="Shelters Available"
              value={stats.sheltersAvailable}
              detail="400 beds immediately usable"
              icon={Tent}
            />
            <StatCard
              title="Roads Blocked"
              value={stats.roadsBlocked}
              detail="4 alternate routes open"
              icon={RouteIcon}
              tone="danger"
            />
            <StatCard
              title="Citizen Reports"
              value={stats.citizenReports}
              detail="3 verified in control room"
              icon={ClipboardList}
            />
          </div>
        );
      case "risk-score":
        return (
          <RiskScoreCard score={riskScore} locationName={selectedLocation.name} />
        );
      case "disaster-risks":
        return (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {riskScore.risks.map((risk) => (
              <DisasterRiskCard key={risk.type} risk={risk} />
            ))}
          </div>
        );
      case "trend-chart":
        return <RiskTrendChart data={trends} />;
      case "alerts-panel":
        return (
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Live Alerts</CardTitle>
              <Button variant="outline" size="sm">
                Compose
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-2">
              {alerts.slice(0, 4).map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </CardContent>
          </Card>
        );
      case "map-preview":
        return (
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Live Map Preview</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Risk zones, shelters, and citizen reports around{" "}
                  {selectedLocation.name}.
                </p>
              </div>
              <Button variant="outline" size="sm">
                <MapPinned className="h-4 w-4" />
                Full Map
              </Button>
            </CardHeader>
            <CardContent>
              <MapView
                center={center}
                zones={zones}
                shelters={shelters}
                reports={reports.slice(0, 3)}
                height="320px"
              />
            </CardContent>
          </Card>
        );
      case "citizen-reports":
        return (
          <Card className="rounded-lg shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Citizen Reports Feed</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {reports.slice(0, 4).map((report) => {
                const Icon = reportIcons[report.type];
                return (
                  <div
                    key={report.id}
                    className="flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light text-brand">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium">
                          {reportLabels[report.type]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {report.locationName}
                        </p>
                        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                          {report.description}
                        </p>
                        <LastUpdated timestamp={report.reportedAt} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={report.severity} />
                      <StatusBadge status={report.status} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description={`Operational picture for ${selectedLocation.name}, ${selectedLocation.district}.`}
        actions={
          <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-risk-danger" />
            <span className="font-medium">Danger threshold active</span>
          </div>
        }
      />
      <DashboardWidgetGrid renderWidget={renderWidget} />
    </div>
  );
}

export const Route = createFileRoute("/_dashboard/overview")({
  component: Page_overview,
});
