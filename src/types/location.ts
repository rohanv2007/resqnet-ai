export interface Location {
  id: string;
  name: string;
  type: "village" | "ward" | "district" | "state";
  lat: number;
  lng: number;
  district: string;
  state: string;
  population: number;
}
