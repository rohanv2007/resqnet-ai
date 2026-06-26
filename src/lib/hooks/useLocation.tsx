"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { DEFAULT_LOCATION_ID, LOCATIONS } from "@/lib/mock-data";
import type { Location } from "@/types";

const LOCATION_KEY = "resqnet:location";

interface LocationState {
  selectedLocationId: string;
}

interface LocationContextValue {
  locations: Location[];
  selectedLocation: Location;
  selectedLocationId: string;
  setSelectedLocationId: (id: string) => void;
}

type LocationAction = { type: "set"; id: string };

const LocationContext = createContext<LocationContextValue | null>(null);

function reducer(state: LocationState, action: LocationAction): LocationState {
  if (action.type === "set") {
    return { selectedLocationId: action.id };
  }

  return state;
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    selectedLocationId: DEFAULT_LOCATION_ID,
  });

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCATION_KEY);
    if (stored && LOCATIONS.some((location) => location.id === stored)) {
      dispatch({ type: "set", id: stored });
    }
  }, []);

  const value = useMemo<LocationContextValue>(() => {
    const selectedLocation =
      LOCATIONS.find((location) => location.id === state.selectedLocationId) ??
      LOCATIONS[0];

    return {
      locations: LOCATIONS,
      selectedLocation,
      selectedLocationId: selectedLocation.id,
      setSelectedLocationId(id) {
        window.localStorage.setItem(LOCATION_KEY, id);
        dispatch({ type: "set", id });
      },
    };
  }, [state.selectedLocationId]);

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used inside LocationProvider");
  }

  return context;
}
