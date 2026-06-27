import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

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
            text: `📍 Location saved!\n\nLat: ${location.latitude.toFixed(4)}, Lng: ${location.longitude.toFixed(4)}\n\nYou'll now receive *hyperlocal alerts* whenever a warning/danger event is reported within your area. Send /location anytime to update.\n\nSend /stop to unsubscribe.`,
            parse_mode: "Markdown",
            reply_markup: { remove_keyboard: true },
          });
          return Response.json({ ok: true });
        }

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
            text: `✅ Welcome to *ResQNet* — hyperlocal disaster alerts.\n\nTap the button below to share your location so we can warn you about floods, fires, earthquakes & cyclones *near you* with one-tap Google Maps evacuation routes.\n\nCommands:\n/location — update your location\n/stop — unsubscribe`,
            parse_mode: "Markdown",
            reply_markup: LOCATION_KEYBOARD,
          });
        } else if (lower.startsWith("/location")) {
          await tg("sendMessage", {
            chat_id: chat.id,
            text: "📍 Please share your current location so we can send you nearby disaster alerts.",
            reply_markup: LOCATION_KEYBOARD,
          });
        } else if (lower.startsWith("/stop")) {
          await supabaseAdmin.from("telegram_subscribers")
            .update({ active: false, updated_at: new Date().toISOString() })
            .eq("chat_id", chat.id);
          await tg("sendMessage", { chat_id: chat.id, text: "🛑 Unsubscribed from ResQNet alerts. Send /start to rejoin." });
        } else {
          await tg("sendMessage", {
            chat_id: chat.id,
            text: "Send /start to subscribe, /location to update your area, or /stop to unsubscribe.",
          });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
