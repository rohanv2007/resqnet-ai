import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

function deriveSecret(key: string) {
  return createHash("sha256").update(`telegram-webhook:${key}`).digest("base64url");
}
function safeEqual(a: string, b: string) {
  const A = Buffer.from(a), B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
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

        if (lower.startsWith("/start")) {
          await supabaseAdmin.from("telegram_subscribers").upsert({
            chat_id: chat.id,
            username: chat.username ?? msg.from?.username ?? null,
            first_name: chat.first_name ?? msg.from?.first_name ?? null,
            active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: "chat_id" });

          await fetch(`https://connector-gateway.lovable.dev/telegram/sendMessage`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": key,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chat_id: chat.id,
              text: `✅ You are now subscribed to *ResQNet* hyperlocal disaster alerts.\n\nSend /stop anytime to unsubscribe.`,
              parse_mode: "Markdown",
            }),
          });
        } else if (lower.startsWith("/stop")) {
          await supabaseAdmin.from("telegram_subscribers")
            .update({ active: false, updated_at: new Date().toISOString() })
            .eq("chat_id", chat.id);
          await fetch(`https://connector-gateway.lovable.dev/telegram/sendMessage`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": key,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ chat_id: chat.id, text: "🛑 Unsubscribed from ResQNet alerts." }),
          });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
