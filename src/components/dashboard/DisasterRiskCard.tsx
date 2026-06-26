import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared";
import { disasterIcons, disasterLabels } from "@/lib/labels";
import type { DisasterRisk } from "@/types";

const trendIcons = {
  rising: ArrowUp,
  stable: ArrowRight,
  falling: ArrowDown,
};

export function DisasterRiskCard({ risk }: { risk: DisasterRisk }) {
  const Icon = disasterIcons[risk.type];
  const TrendIcon = trendIcons[risk.trend];

  return (
    <Card className="rounded-lg shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light text-brand">
            <Icon className="h-4 w-4" />
          </span>
          <StatusBadge status={risk.level} />
        </div>
        <p className="mt-4 text-sm font-medium">{disasterLabels[risk.type]}</p>
        <div className="mt-2 flex items-end justify-between">
          <p className="text-2xl font-semibold">{risk.score}%</p>
          <span className="flex items-center gap-1 text-xs capitalize text-muted-foreground">
            <TrendIcon className="h-3.5 w-3.5" />
            {risk.trend}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
