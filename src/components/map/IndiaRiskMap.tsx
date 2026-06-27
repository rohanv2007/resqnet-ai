import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import type { HazardKind, HazardPoint } from "@/lib/india-risk.functions";

const COLOR: Record<string, string> = {
  low: "#16A34A", watch: "#CA8A04", warning: "#EA580C", danger: "#DC2626",
};

const HAZARD_GLYPH: Record<HazardKind, string> = {
  flood: "💧", earthquake: "⌬", cyclone: "🌀", heatwave: "🔥",
  landslide: "⛰", drought: "☀", wildfire: "🔥", lightning: "⚡", air_quality: "☁",
};

function zoomScale(zoom = 5) {
  return Math.min(1, Math.max(0.32, (zoom + 1) / 7));
}

function markerRadius(score: number, zoom: number) {
  const base = 5 + Math.min(8, score / 14);
  return base * zoomScale(zoom);
}

function haloRadius(score: number, zoom: number) {
  const base = 8 + (score / 100) * 28;
  const scale = Math.min(1, Math.max(0.22, (zoom + 1) / 8));
  return base * scale;
}

type MarkerEntry = {
  marker: L.Marker;
  el: HTMLElement | null;
  point: HazardPoint;
};

export interface IndiaRiskMapProps {
  center: [number, number];
  zoom: number;
  height?: string;
  points: HazardPoint[];
  enabledLayers: Set<HazardKind>;
  showHeatmap: boolean;
  focusMarker?: { lat: number; lng: number; label?: string } | null;
  onSelect?: (p: HazardPoint) => void;
}

export default function IndiaRiskMap({
  center, zoom, height = "calc(100vh - 220px)",
  points, enabledLayers, showHeatmap, focusMarker, onSelect,
}: IndiaRiskMapProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const focusRef = useRef<L.Marker | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const renderRef = useRef<(() => void) | null>(null);

  const pointsRef = useRef(points);
  const enabledRef = useRef(enabledLayers);
  const heatmapRef = useRef(showHeatmap);
  const onSelectRef = useRef(onSelect);

  pointsRef.current = points;
  enabledRef.current = enabledLayers;
  heatmapRef.current = showHeatmap;
  onSelectRef.current = onSelect;

  const renderMarkers = () => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    const currentZoom = map.getZoom();
    const visible = pointsRef.current.filter((p) => enabledRef.current.has(p.hazard));
    const visibleIds = new Set(visible.map((p) => p.id));

    // Remove markers that are no longer visible
    for (const [id, entry] of Array.from(markersRef.current.entries())) {
      if (!visibleIds.has(id)) {
        layer.removeLayer(entry.marker);
        markersRef.current.delete(id);
      }
    }

    const haloOpacity = heatmapRef.current ? 0.08 + zoomScale(currentZoom) * 0.1 : 0;

    for (const p of visible) {
      const existing = markersRef.current.get(p.id);
      if (existing) {
        updateMarker(existing, p, currentZoom, haloOpacity, onSelectRef.current);
      } else {
        const entry = createMarker(p, currentZoom, layer, haloOpacity, onSelectRef.current);
        markersRef.current.set(p.id, entry);
      }
    }
  };

  renderRef.current = renderMarkers;

  // Init map once
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;

    const map = L.map(elRef.current, { center, zoom, worldCopyJump: false, preferCanvas: true });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap, © CARTO", maxZoom: 18,
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    layerRef.current = layer;
    mapRef.current = map;

    const handleZoom = () => renderRef.current?.();
    map.on("zoomend", handleZoom);

    renderRef.current?.();

    const t = window.setTimeout(() => map.invalidateSize(), 60);

    return () => {
      window.clearTimeout(t);
      map.off("zoomend", handleZoom);
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      focusRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pan on center change
  useEffect(() => {
    if (mapRef.current) mapRef.current.setView(center, zoom, { animate: true });
  }, [center, zoom]);

  // Re-render markers when data / filters change
  useEffect(() => {
    renderRef.current?.();
  }, [points, enabledLayers, showHeatmap, onSelect]);

  // Focus marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (focusRef.current) { map.removeLayer(focusRef.current); focusRef.current = null; }
    if (focusMarker) {
      const icon = L.divIcon({
        className: "",
        html: `<div class="risk-focus-marker" style="width:18px;height:18px;border-radius:999px;background:#2563EB;border:3px solid white;box-shadow:0 0 0 4px rgba(37,99,235,.35);"></div>`,
        iconSize: [30, 30], iconAnchor: [15, 15],
      });
      focusRef.current = L.marker([focusMarker.lat, focusMarker.lng], { icon })
        .bindPopup(focusMarker.label ?? "Selected location")
        .addTo(map);
      map.setView([focusMarker.lat, focusMarker.lng], Math.max(map.getZoom(), 9), { animate: true });
    }
  }, [focusMarker]);

  return (
    <>
      <div className="relative isolate z-0 overflow-hidden rounded-lg border bg-card" style={{ height }}>
        <div ref={elRef} className="h-full w-full" />
      </div>
      <style>{`
        .risk-marker {
          position: relative;
          width: 0;
          height: 0;
        }
        .risk-marker-halo,
        .risk-marker-core {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          transition: width 0.25s ease-out, height 0.25s ease-out, opacity 0.25s ease-out, background-color 0.25s ease-out;
          will-change: width, height, opacity;
        }
        .risk-marker-halo {
          width: var(--size);
          height: var(--size);
          background: var(--color);
          opacity: var(--opacity);
        }
        .risk-marker-core {
          width: var(--size);
          height: var(--size);
          background: var(--color);
          border: 2px solid rgba(255, 255, 255, 0.85);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: calc(var(--size) * 0.55);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        .risk-marker-core span {
          filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.4));
          line-height: 1;
        }
      `}</style>
    </>
  );
}

function createMarker(
  p: HazardPoint,
  zoom: number,
  layer: L.LayerGroup,
  haloOpacity: number,
  onSelect?: (p: HazardPoint) => void,
): MarkerEntry {
  const core = markerRadius(p.score, zoom);
  const halo = haloRadius(p.score, zoom);
  const color = COLOR[p.severity];

  const html = `
    <div class="risk-marker" data-id="${p.id}">
      <div class="risk-marker-halo" style="--size:${halo}px;--color:${color};--opacity:${haloOpacity}"></div>
      <div class="risk-marker-core" style="--size:${core}px;--color:${color}">
        <span>${HAZARD_GLYPH[p.hazard]}</span>
      </div>
    </div>
  `;

  const icon = L.divIcon({
    className: "",
    html,
    iconSize: [100, 100],
    iconAnchor: [50, 50],
  });

  const marker = L.marker([p.lat, p.lng], { icon }).addTo(layer);

  marker.bindPopup(popupHtml(p));
  if (onSelect) {
    marker.on("click", () => onSelect(p));
  }

  return { marker, el: marker.getElement() ?? null, point: p };
}

function updateMarker(
  entry: MarkerEntry,
  p: HazardPoint,
  zoom: number,
  haloOpacity: number,
  onSelect?: (p: HazardPoint) => void,
) {
  const core = markerRadius(p.score, zoom);
  const halo = haloRadius(p.score, zoom);
  const color = COLOR[p.severity];

  if (entry.el) {
    const haloEl = entry.el.querySelector(".risk-marker-halo") as HTMLElement | null;
    const coreEl = entry.el.querySelector(".risk-marker-core") as HTMLElement | null;
    if (haloEl) {
      haloEl.style.setProperty("--size", `${halo}px`);
      haloEl.style.setProperty("--color", color);
      haloEl.style.setProperty("--opacity", String(haloOpacity));
    }
    if (coreEl) {
      coreEl.style.setProperty("--size", `${core}px`);
      coreEl.style.setProperty("--color", color);
    }
  }

  entry.marker.setPopupContent(popupHtml(p));
  entry.marker.off("click");
  if (onSelect) {
    entry.marker.on("click", () => onSelect(p));
  }
  entry.point = p;
}

function popupHtml(p: HazardPoint) {
  return `
    <div style="font-family:system-ui;font-size:12px">
      <div style="font-weight:600">${HAZARD_GLYPH[p.hazard]} ${p.title}</div>
      <div style="color:#666;margin-top:2px">${p.detail}</div>
      <div style="margin-top:4px"><b>Score:</b> ${p.score.toFixed(0)} · <b>Level:</b> ${p.severity}</div>
      <div style="color:#888;font-size:11px">${p.source} · ${new Date(p.timestamp).toLocaleString()}</div>
    </div>
  `;
}
