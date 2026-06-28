import { createServerFn } from "@tanstack/react-start";

interface Input {
  context: {
    state?: string;
    city?: string;
    totals: Record<string, number>;
    available: Record<string, number>;
    deployed: number;
    shortages: string[];
    activeIncidents?: number;
  };
}

export const getResourceAIRecommendations = createServerFn({ method: "POST" })
  .inputValidator((d: Input) => d)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return {
        ok: false as const,
        items: fallbackRecs(data.context),
      };
    }
    const prompt = `You are an Indian National Disaster Management Authority (NDMA) operations analyst. Based on the live resource posture below, generate 5 concise, actionable recommendations for an Emergency Operations Center dashboard. Cover: (1) predicted shortages, (2) pre-positioning before monsoon/cyclone/seismic risk, (3) shelter & medical augmentation, (4) one mutual-aid suggestion from a nearby state, (5) one AI-driven allocation tip.

Posture JSON:
${JSON.stringify(data.context, null, 2)}

Respond with strict JSON: {"items":[{"title":"...","detail":"...","priority":"high|medium|low","tag":"shortage|pre-position|shelter|medical|allocation"}]}`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a precise emergency operations analyst for India. Return JSON only." },
            { role: "user", content: prompt },
          ],
          temperature: 0.4,
        }),
      });
      if (!res.ok) throw new Error(`AI gateway ${res.status}`);
      const json = await res.json();
      const text: string = json?.choices?.[0]?.message?.content ?? "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("no json");
      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed.items) || parsed.items.length === 0) throw new Error("empty");
      return { ok: true as const, items: parsed.items.slice(0, 6) };
    } catch {
      return { ok: false as const, items: fallbackRecs(data.context) };
    }
  });

function fallbackRecs(ctx: Input["context"]) {
  const where = ctx.city ?? ctx.state ?? "the focus area";
  return [
    { title: `Pre-position rescue boats in ${where}`, detail: "Coastal/riverine forecast indicates elevated flood risk in the next 72h. Move 30% of idle boats from low-risk districts.", priority: "high", tag: "pre-position" },
    { title: "Top up shelter food stocks", detail: `${ctx.shortages.includes("food") ? "Food stockpile is below threshold" : "Maintain 7-day reserve"} across active relief camps.`, priority: "medium", tag: "shelter" },
    { title: "Medical augmentation", detail: "Cross-deploy 2 Rapid Response Medical Teams from neighbouring state to high-utilisation hospitals.", priority: "medium", tag: "medical" },
    { title: "Mutual aid request", detail: "Request 1 NDRF battalion company under the inter-state mutual aid framework if availability dips below 60%.", priority: "low", tag: "allocation" },
    { title: "Drone reconnaissance", detail: "Deploy idle drones over highest-risk wards every 6h for damage and crowd assessment.", priority: "low", tag: "allocation" },
  ];
}
