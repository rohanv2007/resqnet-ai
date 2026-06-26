import type { DisasterType, RiskLevel } from "./risk";

export interface SimulationParams {
  disasterType: DisasterType;
  rainfallIntensity: number;
  riverLevel: number;
  windSpeed: number;
  timeHorizon: 3 | 6 | 12 | 24;
}

export interface SimulationResult {
  affectedPopulation: number;
  roadsBlocked: number;
  sheltersAtRisk: number;
  evacuationTimeHours: number;
  impactZones: { lat: number; lng: number; radius: number; level: RiskLevel }[];
  confidence: number;
}
