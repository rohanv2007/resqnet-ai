"use client";

import { createContext, useEffect, useMemo, useReducer } from "react";
import type { LoginCredentials, User } from "@/types";
import { authService, DEMO_USERS } from "./auth-service";

interface AuthState {
  user: User | null;
  isLoading: boolean;
}

type AuthAction =
  | { type: "ready"; user: User | null }
  | { type: "set-user"; user: User | null };

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (user: User) => Promise<User>;
  logout: () => Promise<void>;
  setDemoRole: (role: User["role"]) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function reducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "ready":
      return { user: action.user, isLoading: false };
    case "set-user":
      return { ...state, user: action.user };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    dispatch({ type: "ready", user: authService.getCurrentUser() });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      async login(credentials) {
        const user = await authService.login(credentials);
        dispatch({ type: "set-user", user });
        return user;
      },
      async register(user) {
        const registered = await authService.register(user);
        dispatch({ type: "set-user", user: registered });
        return registered;
      },
      async logout() {
        await authService.logout();
        dispatch({ type: "set-user", user: null });
      },
      setDemoRole(role) {
        const user = DEMO_USERS.find((candidate) => candidate.role === role);
        if (user) {
          window.localStorage.setItem("resqnet:user", JSON.stringify(user));
          dispatch({ type: "set-user", user });
        }
      },
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
