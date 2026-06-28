import { createFileRoute } from "@tanstack/react-router";
import { getLiveRiskBundle } from "@/lib/live-bundle.functions";

// Cooldown between alerts to the same user for the same threat
const COOLDOWN_MIN = 90;

type Sub = {
  chat_id: number;
  first_name: string | null;
  lat: number;
  lng: number;
  alert_radius_km: number | null;
  last_auto_alert_at: string | null;
  last_auto_alert_level: string | null;
  last_auto_alert_key: string | null;
  language: string | null;
};

const LEVEL_RANK: Record<string, number> = { low: 0, watch: 1, warning: 2, danger: 3 };

async function tg(method: string, body: unknown) {
  return fetch(`https://connector-gateway.lovable.dev/telegram/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": process.env.TELEGRAM_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function aiCompose(name: string, bundle: Awaited<ReturnType<typeof getLiveRiskBundle>>): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  const ctx = {
    name: name || "friend",
    overall: { level: bundle.riskScore.level, score: bundle.riskScore.overall },
    top_risks: bundle.riskScore.risks
      .filter((r) => LEVEL_RANK[r.level] >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((r) => ({ type: r.type, level: r.level, score: r.score })),
    weather: {
      temp_c: bundle.weather.temperature_c,
      wind_kmh: bundle.weather.wind_speed_kmh,
      rain_24h_mm: bundle.weather.rainfall_mm_24h,
    },
    fires_nearby: (bundle.hotspots ?? []).length,
    quakes_nearby: (bundle.quakes ?? []).length,
    max_quake_mag: (bundle.quakes ?? []).reduce((m, q) => Math.max(m, q.mag ?? 0), 0),
    nearest_shelter: (bundle.shelters ?? [])[0]
      ? { name: bundle.shelters[0].name, km: bundle.shelters[0].distanceKm }
      : null,
  };
  const fallback = `⚠️ *Alert near you* — ${ctx.overall.level.toUpperCase()} (${ctx.overall.score}/100)\n${ctx.top_risks.map(r => `• ${r.type}: ${r.level}`).join("\n") || "Conditions deteriorating"}\nStay alert and avoid risky areas.`;
  if (!apiKey) return fallback;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are ResQNet's emergency alert writer. Write a SHORT (under 90 words) Telegram alert in English, addressed to the user by first name if given. Use 2-3 line bullets max. Be specific about the threat using the JSON data, give one concrete safety action, end with 'Stay safe.' Use Markdown. No emojis flood — max 3.",
          },
          { role: "user", content: `Compose alert from JSON:\n${JSON.stringify(ctx)}` },
        ],
      }),
    });
    if (!r.ok) return fallback;
    const j = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return j.choices?.[0]?.message?.content?.trim() || fallback;
  } catch {
    return fallback;
  }
}

export const Route = createFileRoute("/api/public/hooks/auto-alerts")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: subs, error } = await supabaseAdmin
          .from("telegram_subscribers")
          .select("chat_id,first_name,lat,lng,alert_radius_km,last_auto_alert_at,last_auto_alert_level,last_auto_alert_key")
          .eq("active", true)
          .not("lat", "is", null)
          .not("lng", "is", null);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        const list = (subs ?? []) as Sub[];

        // Dedupe nearby subscribers into ~5km cells to avoid duplicate bundle calls
        const cellKey = (lat: number, lng: number) => `${lat.toFixed(1)}_${lng.toFixed(1)}`;
        const cells = new Map<string, { lat: number; lng: number; subs: Sub[] }>();
        for (const s of list) {
          const k = cellKey(s.lat, s.lng);
          const c = cells.get(k) ?? { lat: s.lat, lng: s.lng, subs: [] };
          c.subs.push(s);
          cells.set(k, c);
        }

        const now = Date.now();
        const stats = { scanned: list.length, cells: cells.size, evaluated: 0, sent: 0, skipped: 0, errors: 0 };

        for (const [key, cell] of cells) {
          stats.evaluated++;
          let bundle: Awaited<ReturnType<typeof getLiveRiskBundle>>;
          try {
            bundle = await getLiveRiskBundle({
              data: { lat: cell.lat, lng: cell.lng, locationId: `auto-${key}`, locationName: "Subscriber area" },
            });
          } catch {
            stats.errors++;
            continue;
          }

          const level = bundle.riskScore.level;
          const score = bundle.riskScore.overall;
          if (LEVEL_RANK[level] < 2) continue; // only warning / danger

          // Build a stable threat key from top contributing risks so a different threat re-triggers
          const threatSig = bundle.riskScore.risks
            .filter((r) => LEVEL_RANK[r.level] >= 2)
            .map((r) => r.type)
            .sort()
            .join("+") || level;

          for (const s of cell.subs) {
            const sameThreat = s.last_auto_alert_key === threatSig;
            const cooledDown = !s.last_auto_alert_at || (now - new Date(s.last_auto_alert_at).getTime()) > COOLDOWN_MIN * 60_000;
            const escalated = (LEVEL_RANK[level] ?? 0) > (LEVEL_RANK[s.last_auto_alert_level ?? "low"] ?? 0);
            if (sameThreat && !cooledDown && !escalated) {
              stats.skipped++;
              continue;
            }

            const aiText = await aiCompose(s.first_name ?? "", bundle);
            const shelter = bundle.shelters?.[0];
            const mapLink = shelter
              ? `https://www.google.com/maps/dir/?api=1&origin=${s.lat},${s.lng}&destination=${shelter.lat},${shelter.lng}&travelmode=driving`
              : `https://www.google.com/maps/search/emergency+shelter/@${s.lat},${s.lng},13z`;
            const text = `🚨 *ResQNet Auto Alert* — ${level.toUpperCase()} (${score}/100)\n\n${aiText}\n\n🧭 [Open evacuation route in Google Maps](${mapLink})\n\n_Send /risk for the full breakdown._`;

            try {
              const r = await tg("sendMessage", {
                chat_id: s.chat_id,
                text,
                parse_mode: "Markdown",
                disable_web_page_preview: false,
              });
              if (r.ok) {
                stats.sent++;
                await supabaseAdmin
                  .from("telegram_subscribers")
                  .update({
                    last_auto_alert_at: new Date().toISOString(),
                    last_auto_alert_level: level,
                    last_auto_alert_key: threatSig,
                  })
                  .eq("chat_id", s.chat_id);
              } else {
                stats.errors++;
                const body = await r.text();
                if (body.includes("blocked") || body.includes("deactivated") || body.includes("chat not found")) {
                  await supabaseAdmin.from("telegram_subscribers").update({ active: false }).eq("chat_id", s.chat_id);
                }
              }
            } catch {
              stats.errors++;
            }
          }
        }

        return Response.json({ ok: true, ...stats, at: new Date().toISOString() });
      },
      GET: async () => Response.json({ ok: true, hint: "POST to trigger auto-alert sweep" }),
    },
  },
});
