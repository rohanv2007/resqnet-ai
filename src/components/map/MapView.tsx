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
  routePolyline?: { coordinates: [number, number][]; label?: string; safety?: "safe" | "caution" | "avoid" };
  originMarker?: { lat: number; lng: number; label?: string };
  simulationZones?: { lat: number; lng: number; radius: number; level: RiskZone["level"] }[];
  onFeatureSelect?: (feature: MapFeature) => void;
}

const LeafletMap = lazy(() => import("./LeafletMap"));

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
