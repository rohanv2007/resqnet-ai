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

    // Google Maps evacuation/safety link: routes user from their location → nearest safe zone.
    // If alert has coords, we point AWAY from the hazard (search "shelter near <lat,lng>").
    const hazardLat = alert.lat as number | null;
    const hazardLng = alert.lng as number | null;
    const mapsQuery = hazardLat != null && hazardLng != null
      ? `https://www.google.com/maps/search/evacuation+shelter/@${hazardLat},${hazardLng},13z`
      : `https://www.google.com/maps/search/emergency+shelter+near+me`;

    const baseText = `🚨 *${localizedTitle}*\n\n${localizedMsg}\n\n_Severity: ${alert.severity.toUpperCase()}_\n📍 [Open evacuation route in Google Maps](${mapsQuery})\n\n_Source: ResQNet hyperlocal alert_`;

    type Delivery = { channel: string; status: string; recipient: string | null; provider_response: string };
    const deliveries: Delivery[] = [];

    // Haversine for proximity filter
    const distKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
      const R = 6371;
      const dLat = (b.lat - a.lat) * Math.PI / 180;
      const dLng = (b.lng - a.lng) * Math.PI / 180;
      const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(s));
    };

    if (alert.channels.includes("telegram") && process.env.TELEGRAM_API_KEY && process.env.LOVABLE_API_KEY) {
      type Sub = { chat_id: number; lat: number | null; lng: number | null };
      let recipients: { chat_id: string; personalText: string }[] = [];

      if (data.telegram_chat_id) {
        recipients = [{ chat_id: data.telegram_chat_id, personalText: baseText }];
      } else {
        const { data: subs } = await supabaseAdmin
          .from("telegram_subscribers")
          .select("chat_id,lat,lng")
          .eq("active", true);
        const all = (subs ?? []) as Sub[];
        const radius = (alert.radius_km ?? 25) as number;

        for (const s of all) {
          let personalText = baseText;
          if (hazardLat != null && hazardLng != null && s.lat != null && s.lng != null) {
            const d = distKm({ lat: hazardLat, lng: hazardLng }, { lat: s.lat, lng: s.lng });
            if (d > radius) continue; // out of impact zone — skip
            // Personalised Google Maps directions from user → safe zone outside hazard
            const dirUrl = `https://www.google.com/maps/dir/?api=1&origin=${s.lat},${s.lng}&destination=${hazardLat},${hazardLng}&travelmode=driving`;
            personalText = `🚨 *${localizedTitle}*\n\n${localizedMsg}\n\n📏 You are *${d.toFixed(1)} km* from the impact zone.\n_Severity: ${alert.severity.toUpperCase()}_\n\n🧭 [Open evacuation route in Google Maps](${dirUrl})\n\n_Source: ResQNet hyperlocal alert_`;
          } else if (hazardLat != null && hazardLng != null && (s.lat == null || s.lng == null)) {
            // Subscriber didn't share location — still notify but ask them to share
            personalText = baseText + `\n\n_Tip: send /location in the bot to get personalised distance & route._`;
          }
          recipients.push({ chat_id: String(s.chat_id), personalText });
        }

        if (process.env.TELEGRAM_DEFAULT_CHAT_ID && recipients.length === 0 && !hazardLat) {
          recipients = [{ chat_id: process.env.TELEGRAM_DEFAULT_CHAT_ID, personalText: baseText }];
        }
      }

      if (recipients.length === 0) {
        deliveries.push({ channel: "telegram", status: "skipped", recipient: null, provider_response: "no subscribers within impact radius" });
      } else {
        for (const { chat_id: chatId, personalText } of recipients) {
          try {
            const r = await fetch("https://connector-gateway.lovable.dev/telegram/sendMessage", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
                "X-Connection-Api-Key": process.env.TELEGRAM_API_KEY,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ chat_id: chatId, text: personalText, parse_mode: "Markdown", disable_web_page_preview: false }),
            });
            const body = await r.text();
            const ok = r.ok;
            deliveries.push({ channel: "telegram", status: ok ? "sent" : "failed", recipient: chatId, provider_response: body.slice(0, 300) });
            if (!ok && (body.includes("blocked") || body.includes("deactivated") || body.includes("chat not found"))) {
              await supabaseAdmin.from("telegram_subscribers").update({ active: false }).eq("chat_id", Number(chatId));
            }
          } catch (e) {
            deliveries.push({ channel: "telegram", status: "failed", recipient: chatId, provider_response: String(e) });
          }
        }
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

export const getSubscriberCount = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("telegram_subscribers")
      .select("chat_id", { count: "exact", head: true })
      .eq("active", true);
    return { count: count ?? 0 };
  });
