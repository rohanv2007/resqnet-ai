import { lazy, Suspense, useEffect, useState } from "react";
import { LoadingSkeleton } from "@/components/shared";
import type { CitizenReport, RiskZone, RouteSegment, Shelter } from "@/types";

export interface MapFeature {
  title: string;
  detail: string;
  meta: string;
}

export interface MapViewProps {
  center: [number, number];
  zoom?: number;
  height?: string;
  scrollWheelZoom?: boolean;
  zones?: RiskZone[];
  shelters?: Shelter[];
  reports?: CitizenReport[];
  routeSegments?: RouteSegment[];
  simulationZones?: { lat: number; lng: number; radius: number; level: RiskZone["level"] }[];
  onFeatureSelect?: (feature: MapFeature) => void;
}

const LeafletMap = lazy(() =>
  import("./LeafletMap").then((m) => ({ default: m.default ?? m.LeafletMap ?? (m as any) })),
);

export function MapView(props: MapViewProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <LoadingSkeleton variant="map" />;
  return (
    <Suspense fallback={<LoadingSkeleton variant="map" />}>
      <LeafletMap {...props} />
    </Suspense>
  );
}
