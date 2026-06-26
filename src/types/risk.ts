export type RiskLevel = "low" | "watch" | "warning" | "danger";

export type DisasterType =
  | "flood"
  | "cyclone"
  | "wildfire"
  | "urban_fire"
  | "earthquake"
  | "rainfall";

export interface DisasterRisk {
  type: DisasterType;
  level: RiskLevel;
  score: number;
  trend: "rising" | "stable" | "falling";
  confidence: number;
  lastUpdated: string;
}

export interface RiskScore {
  locationId: string;
  overall: number;
  level: RiskLevel;
  risks: DisasterRisk[];
  activeSources: number;
  confidence: number;
  lastUpdated: string;
}

export interface RiskTrendPoint {
  day: string;
  flood: number;
  rainfall: number;
  cyclone: number;
  overall: number;
}

export interface RiskZone {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  level: RiskLevel;
  label: string;
}
