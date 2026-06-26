import type { Resource } from "@/types";

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60_000).toISOString();

export const RESOURCES: Resource[] = [
  {
    id: "res1",
    type: "rescue_team",
    name: "NDRF Boat Team 04",
    location: "Aluva Fire Station",
    status: "available",
    capacity: 12,
    currentLoad: 8,
    contact: "+91 94470 11004",
    lastUpdated: minutesAgo(6),
  },
  {
    id: "res2",
    type: "medical",
    name: "Mobile Medical Unit",
    location: "District Hospital Ernakulam",
    status: "deployed",
    capacity: 80,
    currentLoad: 54,
    contact: "+91 484 230 1250",
    lastUpdated: minutesAgo(14),
  },
  {
    id: "res3",
    type: "food_water",
    name: "Relief Supply Truck A2",
    location: "Kalamassery warehouse",
    status: "available",
    capacity: 2500,
    currentLoad: 1800,
    contact: "+91 98460 33412",
    lastUpdated: minutesAgo(22),
  },
  {
    id: "res4",
    type: "vehicle",
    name: "High Clearance Ambulance",
    location: "UC College Camp",
    status: "maintenance",
    capacity: 4,
    currentLoad: 0,
    contact: "+91 98950 77110",
    lastUpdated: minutesAgo(70),
  },
  {
    id: "res5",
    type: "shelter",
    name: "Aluva Municipal School Relief Camp",
    location: "Ward 8, Aluva",
    status: "available",
    capacity: 800,
    currentLoad: 420,
    contact: "+91 484 262 3456",
    lastUpdated: minutesAgo(9),
  },
];
