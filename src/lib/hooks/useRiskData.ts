"use client";

import { useMemo } from "react";
import {
  CITIZEN_REPORTS,
  MOCK_ALERTS,
  RESOURCES,
  RISK_TRENDS,
  RISK_ZONES,
  SHELTERS,
  getRiskScore,
} from "@/lib/mock-data";
import { useLocation } from "./useLocation";

export function useRiskData() {
  const { selectedLocation } = useLocation();

  return useMemo(() => {
    const riskScore = getRiskScore(selectedLocation.id);
    const locationAlerts = MOCK_ALERTS.filter((alert) => {
      const sameLocation =
        alert.locationId === selectedLocation.id ||
        alert.locationName === selectedLocation.name;
      const sameDistrict =
        selectedLocation.district === "Ernakulam" &&
        ["Aluva", "Periyar Nagar"].includes(alert.locationName);
      return sameLocation || sameDistrict;
    });

    return {
      selectedLocation,
      riskScore,
      trends: RISK_TRENDS,
      zones: RISK_ZONES,
      alerts: locationAlerts.length ? locationAlerts : MOCK_ALERTS,
      reports: CITIZEN_REPORTS,
      shelters: SHELTERS,
      resources: RESOURCES,
      stats: {
        activeIncidents: 2,
        sheltersAvailable: SHELTERS.filter((shelter) => shelter.status === "open")
          .length,
        roadsBlocked: 7,
        citizenReports: CITIZEN_REPORTS.length,
      },
      activeSources: [
        "IMD",
        "CWC",
        "ISRO-NRSC",
        "River Gauge Network",
        "Satellite MOSDAC",
        "Ground Sensors",
        "Citizen Reports",
      ],
    };
  }, [selectedLocation]);
}
