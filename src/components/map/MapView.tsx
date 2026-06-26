
import dynamic from "next/dynamic";
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

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <LoadingSkeleton variant="map" />,
});

export function MapView(props: MapViewProps) {
  return <LeafletMap {...props} />;
}
