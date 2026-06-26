import type { RiskLevel } from "./risk";

export type ReportType =
  | "rising_water"
  | "blocked_road"
  | "fire"
  | "damaged_bridge"
  | "shelter_overcrowding"
  | "power_failure";

export type ReportStatus = "new" | "verified" | "duplicate" | "resolved";

export interface CitizenReport {
  id: string;
  type: ReportType;
  locationName: string;
  lat: number;
  lng: number;
  severity: RiskLevel;
  description: string;
  imageUrl?: string;
  status: ReportStatus;
  reportedBy: string;
  reportedAt: string;
  verifiedAt?: string;
}
