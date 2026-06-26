
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import type { MapFeature, MapViewProps } from "./MapView";

const riskColors = {
  low: "#16A34A",
  watch: "#CA8A04",
  warning: "#EA580C",
  danger: "#DC2626",
};

const routeColors = {
  safe: "#16A34A",
  caution: "#EA580C",
  avoid: "#DC2626",
};

function markerIcon(label: string, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:32px;height:32px;border-radius:999px;background:${color};border:2px solid white;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:700;box-shadow:0 8px 18px rgba(15,23,42,.18)">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function selectFeature(
  onFeatureSelect: MapViewProps["onFeatureSelect"],
  feature: MapFeature,
) {
  if (onFeatureSelect) {
    onFeatureSelect(feature);
  }
}

type LeafletElement = HTMLDivElement & { _leaflet_id?: number };

export default function LeafletMap({
  center,
  zoom = 13,
  height = "360px",
  scrollWheelZoom = true,
  zones = [],
  shelters = [],
  reports = [],
  routeSegments = [],
  routePolyline,
  originMarker,
  simulationZones = [],
  onFeatureSelect,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const simLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const container = containerRef.current as LeafletElement | null;
    if (!container) {
      return;
    }

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    delete container._leaflet_id;

    const map = L.map(container, {
      center,
      zoom,
      scrollWheelZoom,
      zoomControl: true,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    zones.forEach((zone) => {
      L.circle([zone.lat, zone.lng], {
        radius: zone.radius,
        color: riskColors[zone.level],
        fillColor: riskColors[zone.level],
        fillOpacity: 0.25,
        weight: 1,
      })
        .on("click", () =>
          selectFeature(onFeatureSelect, {
            title: "Risk zone",
            detail: "Impact radius from active predictive model.",
            meta: zone.level,
          }),
        )
        .addTo(map);
    });

    shelters.forEach((shelter) => {
      L.marker([shelter.lat, shelter.lng], {
        icon: markerIcon("S", "#16A34A"),
      })
        .bindPopup(shelter.name)
        .on("click", () =>
          selectFeature(onFeatureSelect, {
            title: shelter.name,
            detail: `${shelter.occupancy}/${shelter.capacity} occupied`,
            meta: shelter.status,
          }),
        )
        .addTo(map);
    });

    reports.forEach((report) => {
      L.marker([report.lat, report.lng], {
        icon: markerIcon("R", "#7C3AED"),
      })
        .bindPopup(report.locationName)
        .on("click", () =>
          selectFeature(onFeatureSelect, {
            title: report.locationName,
            detail: report.description,
            meta: report.status,
          }),
        )
        .addTo(map);
    });

    routeSegments.forEach((segment) => {
      L.polyline([segment.from, segment.to], {
        color: routeColors[segment.safety],
        weight: 5,
        dashArray: segment.safety === "avoid" ? "8 10" : undefined,
      })
        .on("click", () =>
          selectFeature(onFeatureSelect, {
            title: segment.label,
            detail: "Evacuation route segment",
            meta: segment.safety,
          }),
        )
        .addTo(map);
    });

    // Dedicated layer for animated simulation zones — updated in a separate effect.
    simLayerRef.current = L.layerGroup().addTo(map);

    const invalidate = window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      window.clearTimeout(invalidate);
      map.remove();
      mapRef.current = null;
      simLayerRef.current = null;
      delete container._leaflet_id;
    };
  }, [
    center,
    zoom,
    scrollWheelZoom,
    zones,
    shelters,
    reports,
    routeSegments,
    onFeatureSelect,
  ]);

  // Animate simulation zones without rebuilding the map.
  useEffect(() => {
    const layer = simLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    simulationZones.forEach((zone) => {
      const color = riskColors[zone.level];
      L.circle([zone.lat, zone.lng], {
        radius: zone.radius,
        color,
        fillColor: color,
        fillOpacity: 0.22,
        weight: 1.5,
      }).addTo(layer);
      // Pulsing core
      L.circleMarker([zone.lat, zone.lng], {
        radius: 6,
        color,
        fillColor: color,
        fillOpacity: 0.9,
        weight: 2,
        className: "sim-pulse",
      }).addTo(layer);
    });
  }, [simulationZones]);


  return (
    <div
      className="relative isolate z-0 overflow-hidden rounded-lg border bg-card"
      style={{ height }}
    >
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
