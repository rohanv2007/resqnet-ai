import type { RiskScore, RiskTrendPoint, RiskZone } from "@/types";

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60_000).toISOString();

export const RISK_SCORES: Record<string, RiskScore> = {
  "kl-aluva": {
    locationId: "kl-aluva",
    overall: 82,
    level: "danger",
    activeSources: 7,
    confidence: 94,
    lastUpdated: minutesAgo(8),
    risks: [
      {
        type: "flood",
        level: "danger",
        score: 85,
        trend: "rising",
        confidence: 94,
        lastUpdated: minutesAgo(8),
      },
      {
        type: "rainfall",
        level: "danger",
        score: 90,
        trend: "rising",
        confidence: 91,
        lastUpdated: minutesAgo(8),
      },
      {
        type: "cyclone",
        level: "watch",
        score: 40,
        trend: "stable",
        confidence: 78,
        lastUpdated: minutesAgo(15),
      },
      {
        type: "urban_fire",
        level: "low",
        score: 20,
        trend: "stable",
        confidence: 88,
        lastUpdated: minutesAgo(30),
      },
      {
        type: "earthquake",
        level: "low",
        score: 8,
        trend: "stable",
        confidence: 95,
        lastUpdated: minutesAgo(60),
      },
      {
        type: "wildfire",
        level: "low",
        score: 12,
        trend: "stable",
        confidence: 82,
        lastUpdated: minutesAgo(45),
      },
    ],
  },
  "od-puri": {
    locationId: "od-puri",
    overall: 73,
    level: "warning",
    activeSources: 6,
    confidence: 89,
    lastUpdated: minutesAgo(12),
    risks: [
      {
        type: "cyclone",
        level: "warning",
        score: 75,
        trend: "rising",
        confidence: 89,
        lastUpdated: minutesAgo(12),
      },
      {
        type: "flood",
        level: "watch",
        score: 55,
        trend: "rising",
        confidence: 81,
        lastUpdated: minutesAgo(12),
      },
      {
        type: "rainfall",
        level: "warning",
        score: 70,
        trend: "rising",
        confidence: 86,
        lastUpdated: minutesAgo(10),
      },
      {
        type: "urban_fire",
        level: "low",
        score: 15,
        trend: "stable",
        confidence: 90,
        lastUpdated: minutesAgo(60),
      },
      {
        type: "earthquake",
        level: "low",
        score: 5,
        trend: "stable",
        confidence: 96,
        lastUpdated: minutesAgo(120),
      },
      {
        type: "wildfire",
        level: "low",
        score: 10,
        trend: "stable",
        confidence: 85,
        lastUpdated: minutesAgo(90),
      },
    ],
  },
};

export const RISK_TRENDS: RiskTrendPoint[] = [
  { day: "Mon", flood: 58, rainfall: 64, cyclone: 28, overall: 55 },
  { day: "Tue", flood: 62, rainfall: 70, cyclone: 32, overall: 61 },
  { day: "Wed", flood: 68, rainfall: 74, cyclone: 35, overall: 66 },
  { day: "Thu", flood: 72, rainfall: 79, cyclone: 38, overall: 71 },
  { day: "Fri", flood: 78, rainfall: 82, cyclone: 40, overall: 76 },
  { day: "Sat", flood: 81, rainfall: 88, cyclone: 42, overall: 80 },
  { day: "Sun", flood: 85, rainfall: 90, cyclone: 40, overall: 82 },
];

export const RISK_ZONES: RiskZone[] = [
  {
    id: "zone-periyar-bank",
    lat: 10.105,
    lng: 76.355,
    radius: 900,
    level: "danger",
    label: "Periyar riverbank overflow",
  },
  {
    id: "zone-aluva-market",
    lat: 10.095,
    lng: 76.36,
    radius: 650,
    level: "warning",
    label: "Aluva market low-lying area",
  },
  {
    id: "zone-edapally-drainage",
    lat: 10.026,
    lng: 76.31,
    radius: 500,
    level: "watch",
    label: "Edapally drainage watch",
  },
];

export const getRiskScore = (locationId: string) =>
  RISK_SCORES[locationId] ?? RISK_SCORES["kl-aluva"];
