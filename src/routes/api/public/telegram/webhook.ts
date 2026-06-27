import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";
import { getLiveRiskBundle } from "@/lib/live-bundle.functions";

function deriveSecret(key: string) {
  return createHash("sha256").update(`telegram-webhook:${key}`).digest("base64url");
}
function safeEqual(a: string, b: string) {
  const A = Buffer.from(a), B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

async function tg(method: string, body: unknown) {
  const key = process.env.TELEGRAM_API_KEY!;
  return fetch(`https://connector-gateway.lovable.dev/telegram/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

const LOCATION_KEYBOARD = {
  keyboard: [[{ text: "📍 Share my location", request_location: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

const HELP_TEXT = `🤖 *ResQNet Bot Commands*

/weather — current weather at your location
/risk — disaster risk summary for your area
/alerts — active alerts near you
/shelters — nearest evacuation shelters
/report — how to send a field report with a photo
/location — update your saved location
/stop — unsubscribe

📸 *Submit a report*: just send a photo with a short caption (e.g. _"flooded road near my street"_) and it goes straight to the command room.

Or just *ask me in plain English* — "is it safe in my area?", "any fires nearby?", "should I evacuate?" — I'll answer using live NASA / USGS / Open-Meteo / IMD data.`;

const REPORT_HELP = `📸 *How to send a field report*

1. Take or pick a photo of what's happening
2. Add a *caption* describing it (e.g. "water rising on MG Road")
3. Send it to me

I'll attach your saved location and forward it to NDRF / authorities instantly.`;

type Sub = { lat: number | null; lng: number | null; first_name: string | null };

async function getSub(chatId: number): Promise<Sub | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("telegram_subscribers")
    .select("lat,lng,first_name")
    .eq("chat_id", chatId)
    .maybeSingle();
  return (data as Sub | null) ?? null;
}

type DbReportType = "rising_water"|"blocked_road"|"fire"|"damaged_bridge"|"shelter_overcrowding"|"power_failure"|"medical_help"|"trapped_people"|"other";

function classifyReportType(text: string): DbReportType {
  const t = text.toLowerCase();
  if (/(flood|water|rain|overflow|inundat)/.test(t)) return "rising_water";
  if (/(fire|smoke|burn|blaze)/.test(t)) return "fire";
  if (/(road|block|tree|debris|landslide)/.test(t)) return "blocked_road";
  if (/(bridge|collapse|crack)/.test(t)) return "damaged_bridge";
  if (/(shelter|camp|crowd)/.test(t)) return "shelter_overcrowding";
  if (/(power|electric|outage|blackout)/.test(t)) return "power_failure";
  if (/(medical|injur|hurt|hospital|ambulance)/.test(t)) return "medical_help";
  if (/(trap|stuck|stranded|rescue)/.test(t)) return "trapped_people";
  return "other";
}

function classifySeverity(text: string): "watch" | "warning" | "danger" {
  const t = text.toLowerCase();
  if (/(urgent|emergency|danger|critical|severe|trapped|dying|life)/.test(t)) return "danger";
  if (/(warning|serious|bad|heavy|major)/.test(t)) return "warning";
  return "watch";
}

async function downloadTelegramFile(fileId: string): Promise<{ bytes: Buffer; mime: string } | null> {
  const info = await tg("getFile", { file_id: fileId });
  const infoJson = await info.json().catch(() => null) as { result?: { file_path?: string } } | null;
  const path = infoJson?.result?.file_path;
  if (!path) return null;
  const key = process.env.TELEGRAM_API_KEY!;
  const res = await fetch(`https://connector-gateway.lovable.dev/telegram/file/${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": key,
    },
  });
  if (!res.ok) return null;
  const ab = await res.arrayBuffer();
  const mime = path.endsWith(".png") ? "image/png" : path.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return { bytes: Buffer.from(ab), mime };
}

async function needsLocation(chatId: number) {
  await tg("sendMessage", {
    chat_id: chatId,
    text: "📍 I need your location first. Tap the button to share it.",
    reply_markup: LOCATION_KEYBOARD,
  });
}

async function fetchBundle(lat: number, lng: number) {
  return getLiveRiskBundle({
    data: {
      lat, lng,
      locationId: `tg-${lat.toFixed(3)}-${lng.toFixed(3)}`,
      locationName: "Your location",
    },
  });
}

function fmtWeather(b: Awaited<ReturnType<typeof fetchBundle>>) {
  const w = b.weather;
  const today = b.trends?.[0];
  return `🌦 *Current Weather*

🌡 Temp: *${w.temperature_c?.toFixed(1) ?? "—"} °C*
💧 Humidity: *${w.humidity ?? "—"}%*
🌬 Wind: *${w.wind_speed_kmh?.toFixed(0) ?? "—"} km/h*
🌧 Rain (24h): *${w.rainfall_mm_24h?.toFixed(1) ?? "0"} mm*

📅 Today's outlook: flood ${today?.flood ?? 0} · rain ${today?.rainfall ?? 0} · wind ${today?.cyclone ?? 0}
_Source: Open-Meteo_`;
}

function fmtRisk(b: Awaited<ReturnType<typeof fetchBundle>>) {
  const icon = (l: string) => l === "danger" ? "🔴" : l === "warning" ? "🟠" : l === "watch" ? "🟡" : "🟢";
  const lines = b.riskScore.risks
    .sort((a, z) => z.score - a.score)
    .map((r) => `${icon(r.level)} *${r.type}* — ${r.level.toUpperCase()} (${r.score})`)
    .join("\n");
  return `🛰 *Live Risk — Your Area*
Overall: ${icon(b.riskScore.level)} *${b.riskScore.level.toUpperCase()}* (${b.riskScore.overall}/100)
Confidence: ${b.riskScore.confidence}% · Sources: ${b.riskScore.activeSources}

${lines}

_Last updated: ${new Date(b.riskScore.lastUpdated).toLocaleTimeString()}_`;
}

function fmtAlerts(b: Awaited<ReturnType<typeof fetchBundle>>) {
  const zones = b.zones?.slice(0, 6) ?? [];
  if (!zones.length) return "✅ No active hazard zones detected near you right now.";
  const icon = (l: string) => l === "danger" ? "🔴" : l === "warning" ? "🟠" : "🟡";
  return `⚠️ *Active hazard zones near you*\n\n` + zones.map((z) =>
    `${icon(z.level)} ${z.label}\n📍 [Open in Maps](https://www.google.com/maps?q=${z.lat},${z.lng})`
  ).join("\n\n");
}

function fmtShelters(b: Awaited<ReturnType<typeof fetchBundle>>, lat: number, lng: number) {
  const s = (b.shelters ?? []).slice().sort((a, z) => a.distanceKm - z.distanceKm).slice(0, 5);
  if (!s.length) return "No shelters found nearby.";
  return `🏠 *Nearest shelters*\n\n` + s.map((x) =>
    `• *${x.name}* — ${x.distanceKm} km\n  [🗺 Directions](https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${x.lat},${x.lng})`
  ).join("\n\n");
}

async function aiAnswer(question: string, b: Awaited<ReturnType<typeof fetchBundle>>): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return "AI is not configured.";
  const context = {
    overall_risk: b.riskScore.level,
    overall_score: b.riskScore.overall,
    risks: b.riskScore.risks.map((r) => ({ type: r.type, level: r.level, score: r.score })),
    weather: {
      temp_c: b.weather.temperature_c,
      humidity: b.weather.humidity,
      wind_kmh: b.weather.wind_speed_kmh,
      rain_24h_mm: b.weather.rainfall_mm_24h,
    },
    nearby_fire_hotspots: (b.hotspots ?? []).length,
    recent_earthquakes: (b.quakes ?? []).length,
    max_quake_mag: (b.quakes ?? []).reduce((m, q) => Math.max(m, q.mag ?? 0), 0),
    nearest_quake: (b.quakes ?? [])[0] ? { mag: b.quakes[0].mag, place: b.quakes[0].place, km: b.quakes[0].distanceKm } : null,
    verified_citizen_reports: b.stats?.citizenReports ?? 0,
    blocked_roads: b.stats?.roadsBlocked ?? 0,
    active_hazard_zones: (b.zones ?? []).slice(0, 8).map((z) => ({ label: z.label, level: z.level })),
    nearest_shelters: (b.shelters ?? []).slice(0, 3).map((s) => ({ name: s.name, km: s.distanceKm })),
    sources: b.activeSources ?? [],
  };
  const sys = `You are ResQNet's disaster-safety assistant on Telegram. Answer ONLY using the JSON_CONTEXT (real live data from NASA FIRMS, USGS, Open-Meteo, IMD, OpenStreetMap, citizen reports). Be concise (under 120 words), use bullets and emojis, and end with one practical action. If the question is unrelated to safety/weather/disasters, briefly redirect. Never invent numbers — if a metric isn't in the context, say "no live data".`;
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `JSON_CONTEXT:\n${JSON.stringify(context)}\n\nUSER QUESTION: ${question}` },
      ],
    }),
  });
  if (!r.ok) return "⚠️ AI service is busy right now — try a command like /risk or /weather.";
  const j = await r.json() as { choices?: Array<{ message?: { content?: string } }> };
  return j.choices?.[0]?.message?.content?.trim() || "No answer.";
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.TELEGRAM_API_KEY;
        if (!key) return new Response("not configured", { status: 500 });

        const expected = deriveSecret(key);
        const got = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(got, expected)) return new Response("Unauthorized", { status: 401 });

        const update = await request.json().catch(() => null);
        const msg = update?.message ?? update?.edited_message;
        const chat = msg?.chat;
        if (!chat?.id) return Response.json({ ok: true, ignored: true });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const text: string = msg?.text ?? "";
        const lower = text.trim().toLowerCase();
        const location = msg?.location;
        const photo = Array.isArray(msg?.photo) && msg.photo.length > 0
          ? msg.photo[msg.photo.length - 1] as { file_id: string }
          : null;
        const caption: string = msg?.caption ?? "";

        // ---- Photo report submission ----
        if (photo) {
          const sub = await getSub(chat.id);
          if (!sub?.lat || !sub?.lng) {
            await needsLocation(chat.id);
            return Response.json({ ok: true });
          }
          if (!caption.trim()) {
            await tg("sendMessage", {
              chat_id: chat.id,
              text: "📸 Got the photo. Please *resend it with a short caption* describing what's happening (e.g. \"flooded road on MG Street\").",
              parse_mode: "Markdown",
            });
            return Response.json({ ok: true });
          }

          tg("sendChatAction", { chat_id: chat.id, action: "upload_photo" }).catch(() => {});

          try {
            const file = await downloadTelegramFile(photo.file_id);
            let image_url: string | null = null;
            if (file) {
              const ext = file.mime.split("/")[1] ?? "jpg";
              const path = `telegram/${chat.id}/${Date.now()}.${ext}`;
              const up = await supabaseAdmin.storage
                .from("citizen-reports")
                .upload(path, file.bytes, { contentType: file.mime, upsert: false });
              if (!up.error) {
                const signed = await supabaseAdmin.storage
                  .from("citizen-reports")
                  .createSignedUrl(path, 60 * 60 * 24 * 365);
                image_url = signed.data?.signedUrl ?? null;
              }
            }

            const reporter = sub.first_name ? `${sub.first_name} (Telegram)` : "Telegram subscriber";
            const { error } = await supabaseAdmin.from("citizen_reports").insert({
              type: classifyReportType(caption),
              description: caption.slice(0, 1000),
              severity: classifySeverity(caption),
              lat: sub.lat,
              lng: sub.lng,
              location_name: `Telegram report (${sub.lat.toFixed(3)}, ${sub.lng.toFixed(3)})`,
              reported_by_name: reporter,
              image_url,
              status: "new",
            });
            if (error) throw error;

            await tg("sendMessage", {
              chat_id: chat.id,
              text: `✅ *Report submitted!*\n\nYour photo and details are now in the command room feed. Authorities will review and respond.\n\n_Stay safe — send /risk to check live danger levels around you._`,
              parse_mode: "Markdown",
            });
          } catch (e) {
            await tg("sendMessage", {
              chat_id: chat.id,
              text: `⚠️ Couldn't submit your report. ${(e as Error).message}`,
            });
          }
          return Response.json({ ok: true });
        }


        // Location share from device
        if (location && typeof location.latitude === "number" && typeof location.longitude === "number") {
          await supabaseAdmin.from("telegram_subscribers").upsert({
            chat_id: chat.id,
            username: chat.username ?? msg.from?.username ?? null,
            first_name: chat.first_name ?? msg.from?.first_name ?? null,
            active: true,
            lat: location.latitude,
            lng: location.longitude,
            location_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "chat_id" });

          await tg("sendMessage", {
            chat_id: chat.id,
            text: `📍 Location saved!\n\nLat: ${location.latitude.toFixed(4)}, Lng: ${location.longitude.toFixed(4)}\n\nNow try:\n/weather — live weather\n/risk — disaster risk\n/alerts — hazards nearby\nor just ask me a question like _"is it safe here?"_`,
            parse_mode: "Markdown",
            reply_markup: { remove_keyboard: true },
          });
          return Response.json({ ok: true });
        }

        // ---- Commands ----
        if (lower.startsWith("/start")) {
          await supabaseAdmin.from("telegram_subscribers").upsert({
            chat_id: chat.id,
            username: chat.username ?? msg.from?.username ?? null,
            first_name: chat.first_name ?? msg.from?.first_name ?? null,
            active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: "chat_id" });

          await tg("sendMessage", {
            chat_id: chat.id,
            text: `✅ Welcome to *ResQNet* — your live disaster intel bot.\n\nShare your location to unlock weather, risk, alerts & evacuation routes.\n\n${HELP_TEXT}`,
            parse_mode: "Markdown",
            reply_markup: LOCATION_KEYBOARD,
          });
          return Response.json({ ok: true });
        }

        if (lower.startsWith("/help")) {
          await tg("sendMessage", { chat_id: chat.id, text: HELP_TEXT, parse_mode: "Markdown" });
          return Response.json({ ok: true });
        }

        if (lower.startsWith("/location")) {
          await tg("sendMessage", {
            chat_id: chat.id,
            text: "📍 Please share your current location.",
            reply_markup: LOCATION_KEYBOARD,
          });
          return Response.json({ ok: true });
        }

        if (lower.startsWith("/stop")) {
          await supabaseAdmin.from("telegram_subscribers")
            .update({ active: false, updated_at: new Date().toISOString() })
            .eq("chat_id", chat.id);
          await tg("sendMessage", { chat_id: chat.id, text: "🛑 Unsubscribed. Send /start to rejoin." });
          return Response.json({ ok: true });
        }

        // For everything below we need a saved location
        const sub = await getSub(chat.id);
        if (!sub?.lat || !sub?.lng) {
          await needsLocation(chat.id);
          return Response.json({ ok: true });
        }

        // Send "typing…" indicator
        tg("sendChatAction", { chat_id: chat.id, action: "typing" }).catch(() => {});

        try {
          const bundle = await fetchBundle(sub.lat, sub.lng);

          if (lower.startsWith("/weather")) {
            await tg("sendMessage", { chat_id: chat.id, text: fmtWeather(bundle), parse_mode: "Markdown" });
          } else if (lower.startsWith("/risk") || lower.startsWith("/area")) {
            await tg("sendMessage", { chat_id: chat.id, text: fmtRisk(bundle), parse_mode: "Markdown" });
          } else if (lower.startsWith("/alerts")) {
            await tg("sendMessage", { chat_id: chat.id, text: fmtAlerts(bundle), parse_mode: "Markdown", disable_web_page_preview: true });
          } else if (lower.startsWith("/shelters") || lower.startsWith("/evac")) {
            await tg("sendMessage", { chat_id: chat.id, text: fmtShelters(bundle, sub.lat, sub.lng), parse_mode: "Markdown", disable_web_page_preview: true });
          } else if (text.trim().length > 0 && !text.startsWith("/")) {
            // Freeform question — answer with AI grounded in live data
            const answer = await aiAnswer(text.trim(), bundle);
            await tg("sendMessage", { chat_id: chat.id, text: answer, parse_mode: "Markdown", disable_web_page_preview: true });
          } else {
            await tg("sendMessage", { chat_id: chat.id, text: HELP_TEXT, parse_mode: "Markdown" });
          }
        } catch (e) {
          await tg("sendMessage", {
            chat_id: chat.id,
            text: `⚠️ Couldn't fetch live data right now. Try again in a moment.\n_${(e as Error).message}_`,
            parse_mode: "Markdown",
          });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
