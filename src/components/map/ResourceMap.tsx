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

// Cache emoji divIcons (avoid recreating thousands of DOM strings)
const iconCache = new Map<string, L.DivIcon>();
function emojiIcon(emoji: string, color: string, statusColor: string, big: boolean) {
  const key = `${emoji}|${color}|${statusColor}|${big ? 1 : 0}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const size = big ? 34 : 26;
  const icon = L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${size}px;height:${size}px;border-radius:999px;background:${color};border:2px solid white;display:flex;align-items:center;justify-content:center;color:white;font-size:${big ? 16 : 13}px;box-shadow:0 4px 10px rgba(15,23,42,.25)"><span>${emoji}</span><span style="position:absolute;bottom:-2px;right:-2px;width:9px;height:9px;border-radius:999px;background:${statusColor};border:2px solid white"></span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  iconCache.set(key, icon);
  return icon;
}

export default function ResourceMap({ resources, center, zoom = 5, height = "520px", onSelect, highlightId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const canvasLayerRef = useRef<L.LayerGroup | null>(null);
  const emojiLayerRef = useRef<L.LayerGroup | null>(null);
  const rendererRef = useRef<L.Canvas | null>(null);
  const dataRef = useRef<EmergencyResource[]>(resources);
  const highlightRef = useRef<string | undefined>(highlightId);
  const onSelectRef = useRef(onSelect);

  // Keep refs current without re-running setup
  dataRef.current = resources;
  highlightRef.current = highlightId;
  onSelectRef.current = onSelect;

  // Setup map once
  useEffect(() => {
    const container = containerRef.current as LeafletElement | null;
    if (!container) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    delete container._leaflet_id;

    const map = L.map(container, {
      center,
      zoom,
      scrollWheelZoom: true,
      worldCopyJump: false,
      preferCanvas: true,
      zoomAnimation: true,
      markerZoomAnimation: false,
    });
    mapRef.current = map;
    rendererRef.current = L.canvas({ padding: 0.3 });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap',
      updateWhenZooming: false,
      updateWhenIdle: true,
      keepBuffer: 2,
    }).addTo(map);

    canvasLayerRef.current = L.layerGroup().addTo(map);
    emojiLayerRef.current = L.layerGroup().addTo(map);

    const render = () => {
      const canvasLayer = canvasLayerRef.current;
      const emojiLayer = emojiLayerRef.current;
      const renderer = rendererRef.current;
      if (!canvasLayer || !emojiLayer || !renderer) return;
      canvasLayer.clearLayers();
      emojiLayer.clearLayers();

      const z = map.getZoom();
      const bounds = map.getBounds().pad(0.15);
      const list = dataRef.current;
      const useEmoji = z >= 7;
      const radius = z <= 4 ? 3 : z <= 5 ? 4 : z <= 6 ? 5 : 6;
      let drawn = 0;
      // Cap to keep emoji DOM small at high zoom
      const emojiCap = 800;

      for (let i = 0; i < list.length; i++) {
        const r = list[i];
        if (!bounds.contains([r.lat, r.lng])) continue;
        const meta = RESOURCE_META[r.type];
        const status = STATUS_META[r.status];
        if (useEmoji && drawn < emojiCap) {
          const big = r.id === highlightRef.current;
          const m = L.marker([r.lat, r.lng], { icon: emojiIcon(meta.emoji, meta.color, status.color, big) });
          m.bindTooltip(`${meta.label} · ${r.city}`, { direction: "top", offset: [0, -14] });
          if (onSelectRef.current) {
            const cb = onSelectRef.current;
            m.on("click", () => cb(r));
          }
          m.addTo(emojiLayer);
          drawn++;
        } else {
          const c = L.circleMarker([r.lat, r.lng], {
            renderer,
            radius,
            color: "#ffffff",
            weight: 1,
            fillColor: meta.color,
            fillOpacity: 0.9,
          });
          if (onSelectRef.current) {
            const cb = onSelectRef.current;
            c.on("click", () => cb(r));
          }
          c.addTo(canvasLayer);
        }
      }
    };

    render();
    map.on("moveend zoomend", render);
    (map as L.Map & { __render?: () => void }).__render = render;

    const t = window.setTimeout(() => map.invalidateSize(), 0);
    return () => {
      window.clearTimeout(t);
      map.off("moveend zoomend", render);
      map.remove();
      mapRef.current = null;
      canvasLayerRef.current = null;
      emojiLayerRef.current = null;
      rendererRef.current = null;
      delete container._leaflet_id;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render when data / highlight changes
  useEffect(() => {
    const map = mapRef.current as (L.Map & { __render?: () => void }) | null;
    if (map?.__render) map.__render();
  }, [resources, highlightId]);

  // Recenter when prop changes
  useEffect(() => {
    if (mapRef.current) mapRef.current.setView(center, zoom, { animate: true });
  }, [center, zoom]);

  return (
    <div className="relative isolate z-0 overflow-hidden rounded-lg border bg-card" style={{ height }}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
