import {
  AlertTriangle,
  Flame,
  House,
  Landmark,
  MapPinned,
  Power,
  RadioTower,
  Route,
  ShieldAlert,
  Siren,
  Tent,
  Truck,
  Waves,
  Wind,
} from "lucide-react";
import type { DisasterType, ReportType, ResourceType } from "@/types";

export const disasterLabels: Record<DisasterType, string> = {
  flood: "Flood",
  cyclone: "Cyclone",
  wildfire: "Wildfire",
  urban_fire: "Urban Fire",
  earthquake: "Earthquake",
  rainfall: "Rainfall",
};

export const disasterIcons = {
  flood: Waves,
  cyclone: Wind,
  wildfire: Flame,
  urban_fire: Siren,
  earthquake: Landmark,
  rainfall: RadioTower,
} satisfies Record<DisasterType, typeof Waves>;

export const reportLabels: Record<ReportType, string> = {
  rising_water: "Rising Water",
  blocked_road: "Blocked Road",
  fire: "Fire",
  damaged_bridge: "Damaged Bridge",
  shelter_overcrowding: "Shelter Overcrowding",
  power_failure: "Power Failure",
  medical_help: "Medical Help",
  trapped_people: "Trapped People",
  other: "Field Report",
};

export const reportIcons = {
  rising_water: Waves,
  blocked_road: Route,
  fire: Flame,
  damaged_bridge: AlertTriangle,
  shelter_overcrowding: Tent,
  power_failure: Power,
  medical_help: MapPinned,
  trapped_people: ShieldAlert,
  other: AlertTriangle,
} satisfies Record<ReportType, typeof Waves>;

export const resourceLabels: Record<ResourceType, string> = {
  rescue_team: "Rescue Teams",
  shelter: "Shelters",
  medical: "Medical",
  food_water: "Food & Water",
  vehicle: "Vehicles",
};

export const resourceIcons = {
  rescue_team: ShieldAlert,
  shelter: House,
  medical: MapPinned,
  food_water: Truck,
  vehicle: Truck,
} satisfies Record<ResourceType, typeof Truck>;
