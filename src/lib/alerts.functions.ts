import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { translateTemplate } from "@/lib/resq/translation-templates";
import type { AlertLanguage } from "@/types";

const Lang = z.enum(["english","hindi","malayalam","tamil","telugu","kannada","bengali","marathi","gujarati","odia","punjabi"]);
const Severity = z.enum(["low","watch","warning","danger"]);
const Disaster = z.enum(["flood","cyclone","wildfire","urban_fire","earthquake","rainfall","landslide"]);

const DraftAlert = z.object({
  title: z.string().trim().min(3).max(160),
  message: z.string().trim().min(3).max(1000),
  language: Lang.default("english"),
  disaster: Disaster.default("flood"),
  severity: Severity.default("warning"),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radius_km: z.number().min(0.5).max(200).default(5),
  location_name: z.string().optional(),
  channels: z.array(z.enum(["telegram","push","sms","whatsapp","ivr","email"])).default(["telegram","push"]),
  shelter_id: z.string().uuid().optional(),
});

// NOTE: Demo backend — the dashboard uses local demo accounts (no Supabase
// session), so these endpoints intentionally do not require an authenticated
// user and use the service-role client to bypass RLS. Lock down before
// production deployment.

export const draftAlert = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DraftAlert.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const autoApprove = data.severity !== "danger";
    const status = autoApprove ? "approved" : "pending_approval";
    const { data: row, error } = await supabaseAdmin.from("alerts").insert({
      ...data,
      status,
    }).select().single();
    if (error) throw error;
    return row;
  });

const ApproveAlert = z.object({ id: z.string().uuid() });

export const approveAlert = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ApproveAlert.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("alerts")
      .update({ status: "approved" })
      .eq("id", data.id).select().single();
    if (error) throw error;
    return row;
  });

const SendAlert = z.object({ id: z.string().uuid(), telegram_chat_id: z.string().optional() });

export const sendAlert = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SendAlert.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: alert, error } = await supabaseAdmin.from("alerts").select("*").eq("id", data.id).single();
    if (error || !alert) throw new Error("alert not found");
    if (alert.status !== "approved" && alert.status !== "sent") {
      throw new Error("alert must be approved before sending");
    }

    const localizedTitle = translateTemplate(alert.title, alert.language as AlertLanguage);
    const localizedMsg = translateTemplate(alert.message, alert.language as AlertLanguage);
    const text = `🚨 *${localizedTitle}*\n\n${localizedMsg}\n\n_Severity: ${alert.severity.toUpperCase()}_\n_Source: ResQNet hyperlocal alert_`;

    type Delivery = { channel: string; status: string; recipient: string | null; provider_response: string };
    const deliveries: Delivery[] = [];

    if (alert.channels.includes("telegram") && process.env.TELEGRAM_API_KEY && process.env.LOVABLE_API_KEY) {
      const chatId = data.telegram_chat_id ?? process.env.TELEGRAM_DEFAULT_CHAT_ID ?? null;
      if (chatId) {
        try {
          const r = await fetch("https://connector-gateway.lovable.dev/telegram/sendMessage", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": process.env.TELEGRAM_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
          });
          const body = await r.text();
          deliveries.push({ channel: "telegram", status: r.ok ? "sent" : "failed", recipient: chatId, provider_response: body.slice(0, 500) });
        } catch (e) {
          deliveries.push({ channel: "telegram", status: "failed", recipient: chatId, provider_response: String(e) });
        }
      } else {
        deliveries.push({ channel: "telegram", status: "skipped", recipient: null, provider_response: "no chat_id" });
      }
    }
    for (const ch of alert.channels) {
      if (ch === "telegram") continue;
      deliveries.push({ channel: ch, status: "queued", recipient: null, provider_response: "mock" });
    }

    await supabaseAdmin.from("alert_deliveries").insert(
      deliveries.map(d => ({
        alert_id: alert.id,
        channel: d.channel,
        status: d.status,
        recipient: d.recipient,
        provider_response: d.provider_response,
      })),
    );
    const sentCount = deliveries.filter(d => d.status === "sent").length;
    const { data: updated } = await supabaseAdmin.from("alerts").update({
      status: "sent",
      sent_at: new Date().toISOString(),
      delivered_count: (alert.delivered_count ?? 0) + sentCount,
    }).eq("id", alert.id).select().single();

    return { alert: updated, deliveries };
  });

export const listAlerts = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("alerts").select("*").order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data ?? [];
  });
