import type { Location } from "@/types";
import { INDIA_CITIES } from "@/lib/india-cities";

// State code map for nice short IDs
const STATE_CODE: Record<string, string> = {
  "Delhi": "DL", "Chandigarh": "CH", "Himachal Pradesh": "HP", "Jammu & Kashmir": "JK",
  "Ladakh": "LA", "Punjab": "PB", "Rajasthan": "RJ", "Uttarakhand": "UK",
  "Uttar Pradesh": "UP", "West Bengal": "WB", "Bihar": "BR", "Jharkhand": "JH",
  "Odisha": "OD", "Assam": "AS", "Meghalaya": "ML", "Manipur": "MN", "Mizoram": "MZ",
  "Nagaland": "NL", "Arunachal Pradesh": "AR", "Tripura": "TR", "Sikkim": "SK",
  "Madhya Pradesh": "MP", "Chhattisgarh": "CG", "Maharashtra": "MH", "Gujarat": "GJ",
  "Goa": "GA", "Karnataka": "KA", "Tamil Nadu": "TN", "Telangana": "TS",
  "Andhra Pradesh": "AP", "Kerala": "KL", "Andaman & Nicobar": "AN",
  "Lakshadweep": "LD", "Puducherry": "PY", "Daman & Diu": "DD",
};

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const LOCATIONS: Location[] = INDIA_CITIES.map((c) => {
  const code = (STATE_CODE[c.state] ?? c.state.slice(0, 2).toUpperCase()).toLowerCase();
  return {
    id: `${code}-${slug(c.name)}`,
    name: c.name,
    type: "ward",
    lat: c.lat,
    lng: c.lng,
    district: c.name,
    state: c.state,
    population: c.population,
  } as Location;
}).sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));

export const DEFAULT_LOCATION_ID =
  LOCATIONS.find((l) => l.name === "Chennai")?.id ?? LOCATIONS[0].id;
