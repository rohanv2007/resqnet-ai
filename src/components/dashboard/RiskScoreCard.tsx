
import { useEffect, useRef, useState } from "react";
import { RadialBar, RadialBarChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfidenceBar, LastUpdated, RiskBadge } from "@/components/shared";
import { disasterLabels } from "@/lib/labels";
import type { RiskScore } from "@/types";

const riskBarClass: Record<string, string> = {
  low: "bg-risk-low",
  watch: "bg-risk-watch",
  warning: "bg-risk-warning",
  danger: "bg-risk-danger",
};

const riskStroke: Record<string, string> = {
  low: "#16A34A",
  watch: "#CA8A04",
  warning: "#EA580C",
  danger: "#DC2626",
};

export function RiskScoreCard({
  score,
  locationName,
}: {
  score: RiskScore;
  locationName: string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    const element = chartRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setChartWidth(Math.max(1, Math.floor(entry.contentRect.width)));
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Risk Intelligence</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{locationName}</p>
        </div>
        <RiskBadge level={score.level} />
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div ref={chartRef} className="relative h-52 min-w-0">
          {chartWidth > 0 ? (
            <RadialBarChart
              width={chartWidth}
              height={208}
              innerRadius="76%"
              outerRadius="100%"
              data={[{ value: score.overall, fill: riskStroke[score.level] }]}
              startAngle={210}
              endAngle={-30}
            >
              <RadialBar dataKey="value" cornerRadius={16} background />
            </RadialBarChart>
          ) : null}
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-5xl font-semibold tracking-tight">
                {score.overall}
              </p>
              <p className="text-sm text-muted-foreground">overall risk</p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <ConfidenceBar confidence={score.confidence} />
            <LastUpdated timestamp={score.lastUpdated} />
          </div>
          <div className="space-y-3">
            {score.risks.slice(0, 5).map((risk) => (
              <div key={risk.type} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>{disasterLabels[risk.type]}</span>
                  <span className="font-mono text-xs">{risk.score}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className={`${riskBarClass[risk.level]} h-2 rounded-full`}
                    style={{ width: `${risk.score}%` }}
                  />
                </div>
                <p className="text-[11px] capitalize text-muted-foreground">
                  Trend {risk.trend} - Confidence {risk.confidence}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
