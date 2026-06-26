import type { CitizenReport } from "@/types";

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60_000).toISOString();

export const CITIZEN_REPORTS: CitizenReport[] = [
  {
    id: "cr1",
    type: "rising_water",
    locationName: "Periyar Nagar, Ward 12",
    lat: 10.1124,
    lng: 76.3489,
    severity: "danger",
    description:
      "Water has entered the first lane near the old bridge. Two elderly residents need assisted evacuation.",
    status: "verified",
    reportedBy: "Ward volunteer Anil",
    reportedAt: minutesAgo(18),
    verifiedAt: minutesAgo(9),
  },
  {
    id: "cr2",
    type: "blocked_road",
    locationName: "Aluva Market Road",
    lat: 10.095,
    lng: 76.36,
    severity: "warning",
    description:
      "A fallen tree is blocking one side of the road. Small vehicles are turning back.",
    status: "new",
    reportedBy: "Citizen report",
    reportedAt: minutesAgo(34),
  },
  {
    id: "cr3",
    type: "shelter_overcrowding",
    locationName: "Periyar Community Hall",
    lat: 10.115,
    lng: 76.366,
    severity: "watch",
    description:
      "Relief camp occupancy is almost full. Requesting blankets and drinking water.",
    status: "verified",
    reportedBy: "NGO field coordinator",
    reportedAt: minutesAgo(62),
    verifiedAt: minutesAgo(48),
  },
  {
    id: "cr4",
    type: "power_failure",
    locationName: "Edapally feeder line",
    lat: 10.0261,
    lng: 76.3082,
    severity: "watch",
    description:
      "Transformer shutdown reported after continuous rain. Local clinic is using backup power.",
    status: "resolved",
    reportedBy: "KSEB liaison",
    reportedAt: minutesAgo(155),
  },
];
