import type { Alert } from "@/types";

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60_000).toISOString();

export const MOCK_ALERTS: Alert[] = [
  {
    id: "a1",
    title: "Heavy Rainfall Warning",
    message:
      "Heavy rainfall expected in the next 24 hours. Evacuate low-lying areas immediately.",
    language: "english",
    riskLevel: "danger",
    locationId: "kl-aluva",
    locationName: "Aluva",
    channels: ["sms", "whatsapp", "push"],
    status: "delivered",
    recipientCount: 28000,
    deliveredCount: 24312,
    sentAt: minutesAgo(10),
    sentBy: "District Collector, Ernakulam",
  },
  {
    id: "a2",
    title: "സൈക്ലോൺ മുന്നറിയിപ്പ്",
    message:
      "സൈക്ലോൺ മുന്നറിയിപ്പ്. സുരക്ഷിത സ്ഥാനത്തേക്ക് മാറുക. ഔദ്യോഗിക നിർദ്ദേശങ്ങൾ പാലിക്കുക.",
    language: "malayalam",
    riskLevel: "warning",
    locationId: "kl-aluva",
    locationName: "Aluva",
    channels: ["sms", "ivr"],
    status: "sent",
    recipientCount: 28000,
    deliveredCount: 18000,
    sentAt: minutesAgo(60),
    sentBy: "SDMA Kerala",
  },
  {
    id: "a3",
    title: "Flood Watch - Periyar River",
    message:
      "Periyar river level is rising. Keep at least 500m distance from the riverbank.",
    language: "english",
    riskLevel: "watch",
    locationId: "kl-periyar",
    locationName: "Periyar Nagar",
    channels: ["whatsapp", "push"],
    status: "delivered",
    recipientCount: 14000,
    deliveredCount: 13288,
    sentAt: minutesAgo(155),
    sentBy: "Taluk Control Room",
  },
  {
    id: "a4",
    title: "चक्रवात चेतावनी",
    message:
      "पुरी तट के पास तेज हवा की संभावना है. मछुआरे समुद्र में न जाएं.",
    language: "hindi",
    riskLevel: "warning",
    locationId: "od-puri",
    locationName: "Puri",
    channels: ["sms", "ivr", "telegram"],
    status: "delivered",
    recipientCount: 200000,
    deliveredCount: 184440,
    sentAt: minutesAgo(24),
    sentBy: "OSDMA",
  },
];
