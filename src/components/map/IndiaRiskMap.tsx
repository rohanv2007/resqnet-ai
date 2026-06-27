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
  const heatRef = useRef<L.LayerGroup | null>(null);
  const focusRef = useRef<L.Marker | null>(null);

  // Init map once
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { center, zoom, worldCopyJump: false, preferCanvas: true });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap, © CARTO", maxZoom: 18,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    heatRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const t = window.setTimeout(() => map.invalidateSize(), 60);
    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      heatRef.current = null;
      focusRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pan on center change
  useEffect(() => {
    if (mapRef.current) mapRef.current.setView(center, zoom, { animate: true });
  }, [center, zoom]);

  // Render points
  useEffect(() => {
    const layer = layerRef.current;
    const heat = heatRef.current;
    if (!layer || !heat) return;
    layer.clearLayers();
    heat.clearLayers();

    const visible = points.filter((p) => enabledLayers.has(p.hazard));

    if (showHeatmap) {
      for (const p of visible) {
        const radius = 8 + (p.score / 100) * 28;
        L.circleMarker([p.lat, p.lng], {
          radius,
          color: COLOR[p.severity],
          weight: 0,
          fillColor: COLOR[p.severity],
          fillOpacity: 0.18,
        }).addTo(heat);
      }
    }

    for (const p of visible) {
      const m = L.circleMarker([p.lat, p.lng], {
        radius: 5 + Math.min(8, p.score / 14),
        color: COLOR[p.severity],
        fillColor: COLOR[p.severity],
        fillOpacity: 0.9,
        weight: 1.5,
      }).addTo(layer);
      m.bindPopup(
        `<div style="font-family:system-ui;font-size:12px">
          <div style="font-weight:600">${HAZARD_GLYPH[p.hazard]} ${p.title}</div>
          <div style="color:#666;margin-top:2px">${p.detail}</div>
          <div style="margin-top:4px"><b>Score:</b> ${p.score.toFixed(0)} · <b>Level:</b> ${p.severity}</div>
          <div style="color:#888;font-size:11px">${p.source} · ${new Date(p.timestamp).toLocaleString()}</div>
        </div>`,
      );
      if (onSelect) m.on("click", () => onSelect(p));
    }
  }, [points, enabledLayers, showHeatmap, onSelect]);

  // Focus marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (focusRef.current) { map.removeLayer(focusRef.current); focusRef.current = null; }
    if (focusMarker) {
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:18px;height:18px;border-radius:999px;background:#2563EB;border:3px solid white;box-shadow:0 0 0 4px rgba(37,99,235,.35)"></div>`,
        iconSize: [18, 18], iconAnchor: [9, 9],
      });
      focusRef.current = L.marker([focusMarker.lat, focusMarker.lng], { icon })
        .bindPopup(focusMarker.label ?? "Selected location")
        .addTo(map);
      map.setView([focusMarker.lat, focusMarker.lng], Math.max(map.getZoom(), 9), { animate: true });
    }
  }, [focusMarker]);

  return (
    <div className="relative isolate z-0 overflow-hidden rounded-lg border bg-card" style={{ height }}>
      <div ref={elRef} className="h-full w-full" />
    </div>
  );
}
