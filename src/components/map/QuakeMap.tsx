import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import type { Quake } from "@/lib/earthquakes.functions";

type LeafletElement = HTMLDivElement & { _leaflet_id?: number };

function magColor(m: number) {
  if (m >= 7) return "#7f1d1d";
  if (m >= 6) return "#dc2626";
  if (m >= 5) return "#ea580c";
  if (m >= 4) return "#d97706";
  if (m >= 3) return "#ca8a04";
  return "#16a34a";
}

function magRadius(m: number) {
  return Math.max(4, Math.pow(Math.max(0, m), 1.7));
}

function fmtTime(t: number) {
  return new Date(t).toUTCString();
}

export interface QuakeMapProps {
  quakes: Quake[];
  strongest?: Quake | null;
  height?: string;
  onSelect?: (q: Quake) => void;
}

export default function QuakeMap({
  quakes,
  strongest,
  height = "520px",
  onSelect,
}: QuakeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const heatRef = useRef<L.LayerGroup | null>(null);
  const strongestRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const container = containerRef.current as LeafletElement | null;
    if (!container) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    delete container._leaflet_id;

    const map = L.map(container, {
      center: [15, 30],
      zoom: 2,
      worldCopyJump: true,
      preferCanvas: true,
    });
    mapRef.current = map;

    const dark = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      },
    );
    const light = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { attribution: "&copy; OpenStreetMap" },
    );
    dark.addTo(map);

    // Tectonic plates overlay (lightweight static GeoJSON)
    fetch(
      "https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json",
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((gj) => {
        if (!gj || !mapRef.current) return;
        L.geoJSON(gj, {
          style: { color: "#38bdf8", weight: 1, opacity: 0.55 },
          interactive: false,
        }).addTo(map);
      })
      .catch(() => undefined);

    layerRef.current = L.layerGroup().addTo(map);
    heatRef.current = L.layerGroup().addTo(map);
    strongestRef.current = L.layerGroup().addTo(map);

    L.control.layers({ Dark: dark, Light: light }, {}, { position: "topright" }).addTo(map);

    const t = window.setTimeout(() => map.invalidateSize(), 0);
    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      heatRef.current = null;
      strongestRef.current = null;
      delete container._leaflet_id;
    };
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    const heat = heatRef.current;
    if (!layer || !heat) return;
    layer.clearLayers();
    heat.clearLayers();

    quakes.forEach((q) => {
      const color = magColor(q.mag);
      // soft heat halo
      L.circleMarker([q.lat, q.lng], {
        radius: magRadius(q.mag) * 2.4,
        color,
        fillColor: color,
        fillOpacity: 0.08,
        weight: 0,
      }).addTo(heat);

      const marker = L.circleMarker([q.lat, q.lng], {
        radius: magRadius(q.mag),
        color: "#0b1220",
        weight: 1,
        fillColor: color,
        fillOpacity: 0.9,
      });
      const popupHtml = `
        <div style="font-family:ui-sans-serif,system-ui;min-width:240px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span style="background:${color};color:white;padding:2px 8px;border-radius:999px;font-weight:700;font-size:12px">M ${q.mag.toFixed(1)}</span>
            ${q.tsunami ? '<span style="background:#0369a1;color:white;padding:2px 6px;border-radius:6px;font-size:10px">TSUNAMI</span>' : ""}
            ${q.alert ? `<span style="background:${q.alert};color:white;padding:2px 6px;border-radius:6px;font-size:10px;text-transform:uppercase">${q.alert}</span>` : ""}
          </div>
          <div style="font-weight:600;font-size:13px">${q.place}</div>
          <div style="font-size:11px;color:#64748b;margin-top:2px">${fmtTime(q.time)}</div>
          <hr style="margin:6px 0;border:none;border-top:1px solid #e2e8f0"/>
          <div style="font-size:11px;line-height:1.5">
            <div><b>Depth:</b> ${q.depthKm.toFixed(1)} km</div>
            <div><b>Coords:</b> ${q.lat.toFixed(3)}, ${q.lng.toFixed(3)}</div>
            <div><b>Country:</b> ${q.country ?? "—"}</div>
            <div><b>Sources:</b> ${q.sources.join(", ")}</div>
            <div><b>Confidence:</b> ${q.confidence}%</div>
            <div><b>Event ID:</b> ${q.id}</div>
          </div>
        </div>`;
      marker.bindPopup(popupHtml);
      if (onSelect) marker.on("click", () => onSelect(q));
      marker.addTo(layer);
    });
  }, [quakes, onSelect]);

  useEffect(() => {
    const layer = strongestRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!strongest) return;
    const color = magColor(strongest.mag);
    // pulsing outer ring
    L.circleMarker([strongest.lat, strongest.lng], {
      radius: magRadius(strongest.mag) * 3,
      color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.15,
      className: "sim-pulse",
    }).addTo(layer);
    L.circleMarker([strongest.lat, strongest.lng], {
      radius: magRadius(strongest.mag) * 1.4,
      color: "#fff",
      weight: 2,
      fillColor: color,
      fillOpacity: 1,
    })
      .bindPopup(
        `<b>Strongest event</b><br/>M${strongest.mag.toFixed(1)} — ${strongest.place}`,
      )
      .addTo(layer);
  }, [strongest]);

  return (
    <div
      className="relative isolate z-0 overflow-hidden rounded-lg border bg-card"
      style={{ height }}
    >
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
