import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LastUpdated, RiskBadge, StatusBadge } from "@/components/shared";
import type { Alert } from "@/types";

export function AlertCard({ alert }: { alert: Alert }) {
  return (
    <Card className="rounded-lg shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-brand" />
            <div>
              <p className="text-sm font-medium">{alert.title}</p>
              <p className="text-xs text-muted-foreground">{alert.locationName}</p>
            </div>
          </div>
          <RiskBadge level={alert.riskLevel} />
        </div>
        <p className="text-sm text-muted-foreground">{alert.message}</p>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={alert.status} />
          <StatusBadge status={alert.language} className="uppercase" />
          <span className="text-xs text-muted-foreground">
            {alert.deliveredCount.toLocaleString("en-IN")} delivered
          </span>
        </div>
        <LastUpdated timestamp={alert.sentAt} />
      </CardContent>
    </Card>
  );
}
