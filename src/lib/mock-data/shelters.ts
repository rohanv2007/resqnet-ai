import type { RouteSegment, Shelter } from "@/types";

export const SHELTERS: Shelter[] = [
  {
    id: "s1",
    name: "Aluva Municipal School Relief Camp",
    lat: 10.1065,
    lng: 76.35,
    capacity: 800,
    occupancy: 420,
    contact: "+91 484 262 3456",
    facilities: ["Medical desk", "Drinking water", "Generator"],
    status: "open",
    distanceKm: 1.8,
  },
  {
    id: "s2",
    name: "UC College Auditorium",
    lat: 10.0949,
    lng: 76.3487,
    capacity: 1200,
    occupancy: 940,
    contact: "+91 484 260 9191",
    facilities: ["Kitchen", "Women help desk", "Ambulance access"],
    status: "open",
    distanceKm: 3.2,
  },
  {
    id: "s3",
    name: "Periyar Community Hall",
    lat: 10.115,
    lng: 76.366,
    capacity: 300,
    occupancy: 294,
    contact: "+91 484 260 8820",
    facilities: ["First aid", "Water"],
    status: "full",
    distanceKm: 2.4,
  },
];

export const ROUTE_SEGMENTS: RouteSegment[] = [
  {
    id: "r1",
    from: [10.1004, 76.357],
    to: [10.104, 76.353],
    safety: "safe",
    label: "Market road clear",
  },
  {
    id: "r2",
    from: [10.104, 76.353],
    to: [10.1065, 76.35],
    safety: "caution",
    label: "Waterlogging near junction",
  },
  {
    id: "r3",
    from: [10.101, 76.36],
    to: [10.098, 76.365],
    safety: "avoid",
    label: "Blocked underpass",
  },
];
