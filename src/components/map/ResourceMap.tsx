import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { RESOURCE_META, STATUS_META, type EmergencyResource } from "@/lib/resources-engine";

interface Props {
  resources: EmergencyResource[];
  center: [number, number];
  zoom?: number;
  height?: string;
  onSelect?: (r: EmergencyResource) => void;
  highlightId?: string;
}

type LeafletElement = HTMLDivElement & { _leaflet_id?: number };

function makeIcon(emoji: string, color: string, statusColor: string, big = false) {
  const size = big ? 38 : 30;
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${size}px;height:${size}px;border-radius:999px;background:${color};border:2px solid white;display:flex;align-items:center;justify-content:center;color:white;font-size:${big ? 18 : 14}px;box-shadow:0 6px 14px rgba(15,23,42,.25)">
      <span>${emoji}</span>
      <span style="position:absolute;bottom:-2px;right:-2px;width:10px;height:10px;border-radius:999px;background:${statusColor};border:2px solid white"></span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function ResourceMap({ resources, center, zoom = 5, height = "520px", onSelect, highlightId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const container = containerRef.current as LeafletElement | null;
    if (!container) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    delete container._leaflet_id;

    const map = L.map(container, { center, zoom, scrollWheelZoom: true, worldCopyJump: false });
    mapRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);

    const t = window.setTimeout(() => map.invalidateSize(), 0);
    return () => { window.clearTimeout(t); map.remove(); mapRef.current = null; layerRef.current = null; delete container._leaflet_id; };
  }, [center, zoom]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    // Cap render count for perf
    const list = resources.slice(0, 600);
    list.forEach((r) => {
      const meta = RESOURCE_META[r.type];
      const status = STATUS_META[r.status];
      const icon = makeIcon(meta.emoji, meta.color, status.color, r.id === highlightId);
      const m = L.marker([r.lat, r.lng], { icon }).addTo(layer);
      m.bindTooltip(`${meta.label} · ${r.city}`, { direction: "top", offset: [0, -16] });
      if (onSelect) m.on("click", () => onSelect(r));
    });
  }, [resources, onSelect, highlightId]);

  return (
    <div className="relative isolate z-0 overflow-hidden rounded-lg border bg-card" style={{ height }}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
