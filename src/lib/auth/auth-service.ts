import type { LoginCredentials, User } from "@/types";

const AUTH_KEY = "resqnet:user";

export const DEMO_USERS: User[] = [
  {
    id: "u-authority",
    name: "Ananya Menon",
    email: "collector.ernakulam@resqnet.in",
    mobile: "+91 98765 43210",
    role: "authority",
    language: "english",
    state: "Kerala",
    district: "Ernakulam",
    department: "District Disaster Management Authority",
    isVerified: true,
  },
  {
    id: "u-ngo",
    name: "Rahul Varma",
    email: "field.ops@carecollective.org",
    mobile: "+91 98470 88220",
    role: "ngo",
    language: "malayalam",
    state: "Kerala",
    district: "Ernakulam",
    organization: "Care Collective",
    isVerified: true,
  },
  {
    id: "u-citizen",
    name: "Meera Joseph",
    email: "meera@example.com",
    mobile: "+91 94471 10020",
    role: "citizen",
    language: "malayalam",
    state: "Kerala",
    district: "Ernakulam",
    isVerified: true,
  },
];

const canUseStorage = () => typeof window !== "undefined";

export const authService = {
  getCurrentUser(): User | null {
    if (!canUseStorage()) {
      return null;
    }

    const stored = window.localStorage.getItem(AUTH_KEY);
    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored) as User;
    } catch {
      window.localStorage.removeItem(AUTH_KEY);
      return null;
    }
  },

  async login(credentials: LoginCredentials): Promise<User> {
    const lowerIdentifier = credentials.identifier.toLowerCase();
    const user =
      DEMO_USERS.find(
        (candidate) =>
          candidate.email?.toLowerCase() === lowerIdentifier ||
          candidate.mobile === credentials.identifier,
      ) ?? DEMO_USERS[0];

    if (canUseStorage()) {
      window.localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    }

    return user;
  },

  async register(user: User): Promise<User> {
    if (canUseStorage()) {
      window.localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    }

    return user;
  },

  async logout(): Promise<void> {
    if (canUseStorage()) {
      window.localStorage.removeItem(AUTH_KEY);
    }
  },
};
