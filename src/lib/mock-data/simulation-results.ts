import type { SimulationParams, SimulationResult } from "@/types";

export const DEFAULT_SIMULATION_PARAMS: SimulationParams = {
  disasterType: "flood",
  rainfallIntensity: 82,
  riverLevel: 76,
  windSpeed: 48,
  timeHorizon: 6,
};

export function calculateSimulationResult(
  params: SimulationParams,
): SimulationResult {
  const weatherPressure =
    params.rainfallIntensity * 0.46 +
    params.riverLevel * 0.42 +
    Math.min(params.windSpeed, 160) * 0.12;
  const horizonFactor = params.timeHorizon / 6;
  const affectedPopulation = Math.round(weatherPressure * 520 * horizonFactor);
  const roadsBlocked = Math.max(2, Math.round(weatherPressure / 13));
  const sheltersAtRisk = weatherPressure > 78 ? 3 : weatherPressure > 60 ? 2 : 1;

  return {
    affectedPopulation,
    roadsBlocked,
    sheltersAtRisk,
    evacuationTimeHours: Number((2.2 + weatherPressure / 32).toFixed(1)),
    confidence: Math.min(96, Math.round(74 + weatherPressure / 4)),
    impactZones: [
      {
        lat: 10.105,
        lng: 76.355,
        radius: Math.round(420 + weatherPressure * 8),
        level: weatherPressure > 78 ? "danger" : "warning",
      },
      {
        lat: 10.096,
        lng: 76.36,
        radius: Math.round(320 + weatherPressure * 5),
        level: weatherPressure > 65 ? "warning" : "watch",
      },
    ],
  };
}
