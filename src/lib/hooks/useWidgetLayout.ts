
import { useEffect, useMemo, useState } from "react";

export interface WidgetConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

const STORAGE_KEY = "resqnet:widgets";

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "stat-cards", label: "Quick Stats", visible: true, order: 0 },
  { id: "risk-score", label: "Risk Intelligence", visible: true, order: 1 },
  { id: "disaster-risks", label: "Disaster Risk Cards", visible: true, order: 2 },
  { id: "trend-chart", label: "Risk Trend Chart", visible: true, order: 3 },
  { id: "alerts-panel", label: "Live Alerts", visible: true, order: 4 },
  { id: "map-preview", label: "Map Preview", visible: true, order: 5 },
  { id: "citizen-reports", label: "Citizen Reports Feed", visible: true, order: 6 },
];

function normalizeWidgets(widgets: WidgetConfig[]) {
  return widgets.map((widget, index) => ({ ...widget, order: index }));
}

export function useWidgetLayout() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return;
    }

    let timeoutId: number | undefined;
    try {
      const parsed = JSON.parse(stored) as WidgetConfig[];
      const merged = DEFAULT_WIDGETS.map((defaultWidget) => {
        const storedWidget = parsed.find((item) => item.id === defaultWidget.id);
        return storedWidget ? { ...defaultWidget, ...storedWidget } : defaultWidget;
      });
      timeoutId = window.setTimeout(() => {
        setWidgets(normalizeWidgets(merged.sort((a, b) => a.order - b.order)));
      }, 0);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  }, [widgets]);

  return useMemo(
    () => ({
      widgets: [...widgets].sort((a, b) => a.order - b.order),
      visibleWidgets: widgets
        .filter((widget) => widget.visible)
        .sort((a, b) => a.order - b.order),
      toggleWidget(id: string) {
        setWidgets((current) =>
          current.map((widget) =>
            widget.id === id ? { ...widget, visible: !widget.visible } : widget,
          ),
        );
      },
      reorderWidgets(nextWidgets: WidgetConfig[]) {
        setWidgets(normalizeWidgets(nextWidgets));
      },
      resetLayout() {
        setWidgets(DEFAULT_WIDGETS);
      },
    }),
    [widgets],
  );
}
