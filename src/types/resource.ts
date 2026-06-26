export type ResourceType =
  | "rescue_team"
  | "shelter"
  | "medical"
  | "food_water"
  | "vehicle";

export interface Resource {
  id: string;
  type: ResourceType;
  name: string;
  location: string;
  status: "available" | "deployed" | "maintenance";
  capacity?: number;
  currentLoad?: number;
  contact: string;
  lastUpdated: string;
}
