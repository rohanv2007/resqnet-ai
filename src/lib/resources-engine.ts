// Deterministic, India-wide emergency resource dataset.
// Generated client-side from INDIA_CITIES so the UI works without a DB seed.
// Values are stable across renders (seeded PRNG keyed by city + type + index).

import { INDIA_CITIES, type IndiaCity } from "./india-cities";

export type EmergencyResourceType =
  | "ndrf"
  | "sdrf"
  | "fire"
  | "ambulance"
  | "medical_team"
  | "hospital"
  | "shelter"
  | "food"
  | "water"
  | "relief_camp"
  | "boat"
  | "helicopter"
  | "drone"
  | "police"
  | "volunteer"
  | "utility";

export type ResourceStatus =
  | "available"
  | "deployed"
  | "en_route"
  | "maintenance"
  | "offline"
  | "fully_utilized";

export interface EmergencyResource {
  id: string;
  type: EmergencyResourceType;
  name: string;
  city: string;
  state: string;
  district: string;
  lat: number;
  lng: number;
  status: ResourceStatus;
  capacity: number;
  currentLoad: number;
  personnel: number;
  contact: string;
  assignment?: string;
  // Hospital / shelter intel
  beds?: number;
  bedsAvailable?: number;
  icu?: number;
  icuAvailable?: number;
  trauma?: boolean;
  food?: "high" | "medium" | "low";
  water?: "high" | "medium" | "low";
  medical?: "high" | "medium" | "low";
  lastUpdated: string;
}

export const RESOURCE_META: Record<
  EmergencyResourceType,
  { label: string; emoji: string; color: string; group: "rescue" | "medical" | "shelter" | "logistics" | "aerial" | "security" }
> = {
  ndrf:        { label: "NDRF Team",        emoji: "🛟", color: "#1d4ed8", group: "rescue" },
  sdrf:        { label: "SDRF Team",        emoji: "🚨", color: "#1e40af", group: "rescue" },
  fire:        { label: "Fire & Rescue",    emoji: "🚒", color: "#dc2626", group: "rescue" },
  ambulance:   { label: "Ambulance",        emoji: "🚑", color: "#ef4444", group: "medical" },
  medical_team:{ label: "Medical Team",     emoji: "⚕️", color: "#0ea5e9", group: "medical" },
  hospital:    { label: "Hospital",         emoji: "🏥", color: "#0284c7", group: "medical" },
  shelter:     { label: "Shelter",          emoji: "🏠", color: "#16a34a", group: "shelter" },
  food:        { label: "Food Supply",      emoji: "🍱", color: "#65a30d", group: "logistics" },
  water:       { label: "Water Supply",     emoji: "💧", color: "#0891b2", group: "logistics" },
  relief_camp: { label: "Relief Camp",      emoji: "⛺", color: "#15803d", group: "shelter" },
  boat:        { label: "Rescue Boat",      emoji: "🛥️", color: "#0369a1", group: "rescue" },
  helicopter:  { label: "Helicopter",       emoji: "🚁", color: "#7c3aed", group: "aerial" },
  drone:       { label: "Drone",            emoji: "🛸", color: "#9333ea", group: "aerial" },
  police:      { label: "Police Unit",      emoji: "👮", color: "#0f172a", group: "security" },
  volunteer:   { label: "Volunteer Network",emoji: "🤝", color: "#ea580c", group: "security" },
  utility:     { label: "Utility Repair",   emoji: "🔧", color: "#a16207", group: "logistics" },
};

export const STATUS_META: Record<ResourceStatus, { label: string; color: string }> = {
  available:      { label: "Available",      color: "#16a34a" },
  deployed:       { label: "Deployed",       color: "#1d4ed8" },
  en_route:       { label: "En Route",       color: "#0891b2" },
  maintenance:    { label: "Maintenance",    color: "#ca8a04" },
  offline:        { label: "Offline",        color: "#64748b" },
  fully_utilized: { label: "Fully Utilized", color: "#dc2626" },
};

// ---------- deterministic PRNG ----------
function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];

// ---------- generation ----------
const STATUSES: ResourceStatus[] = [
  "available", "available", "available",
  "deployed", "deployed",
  "en_route",
  "maintenance",
  "fully_utilized",
  "offline",
];

function jitter(r: () => number, base: number, spread = 0.08) {
  return base + (r() - 0.5) * spread;
}

function unitsForCity(c: IndiaCity): Partial<Record<EmergencyResourceType, number>> {
  const big = c.population > 5_000_000;
  const mid = c.population > 1_000_000;
  return {
    ndrf:         big ? 2 : mid ? 1 : c.coastal || c.riverine ? 1 : 0,
    sdrf:         big ? 3 : mid ? 2 : 1,
    fire:         big ? 6 : mid ? 4 : 2,
    ambulance:    big ? 12 : mid ? 7 : 3,
    medical_team: big ? 5 : mid ? 3 : 1,
    hospital:     big ? 6 : mid ? 4 : 2,
    shelter:      big ? 8 : mid ? 5 : 3,
    relief_camp:  c.coastal || c.riverine || c.hilly ? (mid ? 3 : 2) : 1,
    food:         big ? 4 : mid ? 2 : 1,
    water:        big ? 4 : mid ? 2 : 1,
    boat:         c.coastal || c.riverine ? (mid ? 3 : 2) : 0,
    helicopter:   big ? 2 : mid ? 1 : c.hilly ? 1 : 0,
    drone:        big ? 4 : mid ? 2 : 1,
    police:       big ? 8 : mid ? 5 : 2,
    volunteer:    big ? 6 : mid ? 4 : 2,
    utility:      big ? 4 : mid ? 2 : 1,
  };
}

const PHONE_PREFIX: Record<EmergencyResourceType, string> = {
  ndrf: "+91 11 2643", sdrf: "+91 11 2436", fire: "101", ambulance: "108",
  medical_team: "+91 11 2658", hospital: "+91", shelter: "+91", food: "+91",
  water: "+91", relief_camp: "+91", boat: "+91", helicopter: "+91",
  drone: "+91", police: "100", volunteer: "+91", utility: "+91",
};

function phone(r: () => number, t: EmergencyResourceType) {
  const tail = Math.floor(r() * 9_000_000 + 1_000_000);
  if (t === "fire" || t === "ambulance" || t === "police") return PHONE_PREFIX[t];
  return `${PHONE_PREFIX[t]} ${tail}`;
}

function nameFor(t: EmergencyResourceType, city: string, idx: number, r: () => number): string {
  switch (t) {
    case "ndrf": return `NDRF ${pick(r,["1st","2nd","4th","6th","8th","10th"])} Bn · ${city} Coy ${idx + 1}`;
    case "sdrf": return `SDRF ${city} Unit ${idx + 1}`;
    case "fire": return `${city} Fire Station ${idx + 1}`;
    case "ambulance": return `108 EMRI Ambulance ${city}-${100 + idx}`;
    case "medical_team": return `Rapid Response Medical Team ${city}-${idx + 1}`;
    case "hospital": return `${pick(r,["Govt General","AIIMS","Apollo","Fortis","Manipal","ESI","District"])} Hospital · ${city} ${idx + 1}`;
    case "shelter": return `${pick(r,["Municipal School","Community Hall","Stadium","College","Marriage Hall"])} Shelter · ${city} ${idx + 1}`;
    case "food": return `Akshaya Patra Food Unit ${city}-${idx + 1}`;
    case "water": return `Jal Shakti Water Tanker ${city}-${idx + 1}`;
    case "relief_camp": return `${city} Relief Camp ${idx + 1}`;
    case "boat": return `Rescue Boat ${city}-${idx + 1}`;
    case "helicopter": return `${pick(r,["IAF","Coast Guard","SDMA"])} Mi-17/Dhruv ${city}-${idx + 1}`;
    case "drone": return `Recon Drone ${city}-${idx + 1}`;
    case "police": return `${city} Police PCR ${idx + 1}`;
    case "volunteer": return `${pick(r,["NSS","NCC","Red Cross","Bharat Scouts"])} Volunteer Cell ${city}-${idx + 1}`;
    case "utility": return `${pick(r,["Power","Telecom","Water","Road"])} Repair Crew ${city}-${idx + 1}`;
  }
}

function cap(t: EmergencyResourceType, r: () => number): { capacity: number; personnel: number } {
  const ri = (a: number, b: number) => Math.floor(r() * (b - a) + a);
  switch (t) {
    case "ndrf": return { capacity: 45, personnel: ri(35, 45) };
    case "sdrf": return { capacity: 30, personnel: ri(20, 30) };
    case "fire": return { capacity: 12, personnel: ri(8, 12) };
    case "ambulance": return { capacity: 2, personnel: 2 };
    case "medical_team": return { capacity: 8, personnel: ri(5, 8) };
    case "hospital": return { capacity: ri(150, 800), personnel: ri(120, 600) };
    case "shelter": return { capacity: ri(200, 1500), personnel: ri(6, 25) };
    case "food": return { capacity: ri(2000, 8000), personnel: ri(8, 20) };
    case "water": return { capacity: ri(5000, 20000), personnel: ri(2, 6) };
    case "relief_camp": return { capacity: ri(300, 2000), personnel: ri(10, 40) };
    case "boat": return { capacity: ri(8, 20), personnel: ri(3, 5) };
    case "helicopter": return { capacity: ri(10, 25), personnel: ri(3, 6) };
    case "drone": return { capacity: 1, personnel: 2 };
    case "police": return { capacity: 8, personnel: ri(4, 8) };
    case "volunteer": return { capacity: ri(20, 120), personnel: ri(15, 100) };
    case "utility": return { capacity: 6, personnel: ri(4, 6) };
  }
}

const ASSIGNMENTS = [
  "Flood evacuation support", "Cyclone shelter ops", "Search & rescue",
  "Medical triage", "Relief distribution", "Pre-positioning",
  "Damage assessment", "Drinking water supply", "Fire suppression",
  "Road clearance", "Mass casualty support",
];

export function generateResources(): EmergencyResource[] {
  const out: EmergencyResource[] = [];
  const now = Date.now();
  for (const c of INDIA_CITIES) {
    const units = unitsForCity(c);
    for (const [typeStr, count] of Object.entries(units)) {
      const t = typeStr as EmergencyResourceType;
      for (let i = 0; i < (count ?? 0); i++) {
        const r = rng(hash(`${c.name}|${c.state}|${t}|${i}`));
        const { capacity, personnel } = cap(t, r);
        const status = pick(r, STATUSES);
        const load =
          status === "fully_utilized" ? capacity :
          status === "offline" || status === "maintenance" ? 0 :
          status === "deployed" ? Math.floor(capacity * (0.6 + r() * 0.3)) :
          status === "en_route" ? Math.floor(capacity * (0.4 + r() * 0.3)) :
          Math.floor(capacity * r() * 0.3);
        const isHospital = t === "hospital";
        const isShelter = t === "shelter" || t === "relief_camp";
        const beds = isHospital ? capacity : undefined;
        const bedsAvailable = isHospital ? Math.max(0, capacity - load) : undefined;
        const icu = isHospital ? Math.floor(capacity * 0.08) : undefined;
        const icuAvailable = isHospital ? Math.max(0, Math.floor((icu ?? 0) * (0.2 + r() * 0.5))) : undefined;
        out.push({
          id: `${c.state}-${c.name}-${t}-${i}`.replace(/\s+/g, "_").toLowerCase(),
          type: t,
          name: nameFor(t, c.name, i, r),
          city: c.name,
          state: c.state,
          district: c.name,
          lat: jitter(r, c.lat, 0.12),
          lng: jitter(r, c.lng, 0.12),
          status,
          capacity,
          currentLoad: load,
          personnel,
          contact: phone(r, t),
          assignment: status === "deployed" || status === "en_route" ? pick(r, ASSIGNMENTS) : undefined,
          beds, bedsAvailable, icu, icuAvailable,
          trauma: isHospital ? r() > 0.4 : undefined,
          food: isShelter ? pick(r, ["high","medium","low"] as const) : undefined,
          water: isShelter ? pick(r, ["high","medium","low"] as const) : undefined,
          medical: isShelter ? pick(r, ["high","medium","low"] as const) : undefined,
          lastUpdated: new Date(now - Math.floor(r() * 3600_000)).toISOString(),
        });
      }
    }
  }
  return out;
}

// ---------- helpers ----------
export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export const EMERGENCY_PLAYBOOK: Record<string, EmergencyResourceType[]> = {
  flood:      ["ndrf","sdrf","boat","helicopter","shelter","relief_camp","ambulance","medical_team","food","water","drone"],
  earthquake: ["ndrf","sdrf","fire","ambulance","hospital","medical_team","drone","helicopter","utility","volunteer"],
  cyclone:    ["ndrf","sdrf","shelter","relief_camp","ambulance","food","water","police","utility","helicopter"],
  fire:       ["fire","ambulance","police","hospital","medical_team","utility","drone"],
  medical:    ["ambulance","hospital","medical_team","helicopter","police"],
  landslide:  ["ndrf","sdrf","helicopter","drone","fire","ambulance","medical_team","utility"],
};
