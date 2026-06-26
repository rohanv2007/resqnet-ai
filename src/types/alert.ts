import type { RiskLevel } from "./risk";

export type AlertStatus = "draft" | "sent" | "delivered" | "failed";
export type AlertChannel = "sms" | "ivr" | "whatsapp" | "telegram" | "push";
export type AlertLanguage =
  | "english"
  | "hindi"
  | "malayalam"
  | "tamil"
  | "telugu"
  | "kannada"
  | "bengali"
  | "marathi"
  | "gujarati"
  | "odia"
  | "punjabi";

export interface Alert {
  id: string;
  title: string;
  message: string;
  language: AlertLanguage;
  riskLevel: RiskLevel;
  locationId: string;
  locationName: string;
  channels: AlertChannel[];
  status: AlertStatus;
  recipientCount: number;
  deliveredCount: number;
  sentAt: string;
  sentBy: string;
}
