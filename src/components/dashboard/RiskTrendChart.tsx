
import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RiskTrendPoint } from "@/types";

export function RiskTrendChart({ data }: { data: RiskTrendPoint[] }) {
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
      <CardHeader>
        <CardTitle className="text-base">Risk Trend</CardTitle>
      </CardHeader>
      <CardContent ref={chartRef} className="h-72 min-w-0">
        {chartWidth > 0 ? (
          <AreaChart
            width={chartWidth}
            height={288}
            data={data}
            margin={{ left: -20, right: 8, top: 8 }}
          >
            <defs>
              <linearGradient id="overallRisk" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#0F766E" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#0F766E" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="overall"
              stroke="#0F766E"
              strokeWidth={2}
              fill="url(#overallRisk)"
            />
          </AreaChart>
        ) : null}
      </CardContent>
    </Card>
  );
}
