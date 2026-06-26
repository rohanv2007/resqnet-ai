import type { AlertLanguage } from "./alert";

export type UserRole = "citizen" | "authority" | "ngo" | "admin";

export interface User {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  role: UserRole;
  language: AlertLanguage;
  state: string;
  district: string;
  avatar?: string;
  department?: string;
  organization?: string;
  isVerified: boolean;
}

export interface LoginCredentials {
  identifier: string;
  password: string;
}
