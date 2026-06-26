export interface Shelter {
  id: string;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
  occupancy: number;
  contact: string;
  facilities: string[];
  status: "open" | "full" | "closed";
  distanceKm?: number;
}

export interface RouteSegment {
  id: string;
  from: [number, number];
  to: [number, number];
  safety: "safe" | "caution" | "avoid";
  label: string;
}
