import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ReportType = z.enum(["rising_water","blocked_road","fire","damaged_bridge","shelter_overcrowding","power_failure","medical_help","trapped_people","other"]);
const Severity = z.enum(["low","watch","warning","danger"]);

const CreateReport = z.object({
  type: ReportType,
  title: z.string().trim().max(120).optional(),
  description: z.string().trim().min(1).max(1000),
  severity: Severity.default("watch"),
  lat: z.number(),
  lng: z.number(),
  location_name: z.string().trim().max(160).optional(),
  image_url: z.string().url().optional(),
});

export const createReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateReport.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("citizen_reports")
      .insert({ ...data, user_id: context.userId })
      .select().single();
    if (error) throw error;
    return row;
  });

// Public submission endpoint (demo auth flow doesn't use real Supabase users)
const SubmitReport = z.object({
  type: ReportType,
  description: z.string().trim().min(1).max(1000),
  severity: Severity.default("watch"),
  lat: z.number(),
  lng: z.number(),
  location_name: z.string().trim().max(160).optional(),
  reported_by_name: z.string().trim().max(120).optional(),
  image_base64: z.string().optional(),
  image_mime: z.string().optional(),
});

export const submitCitizenReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SubmitReport.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let image_url: string | undefined;
    if (data.image_base64) {
      const ext = (data.image_mime ?? "image/jpeg").split("/")[1]?.replace("+xml", "") ?? "jpg";
      const path = `web/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const bytes = Buffer.from(data.image_base64, "base64");
      const up = await supabaseAdmin.storage.from("citizen-reports").upload(path, bytes, {
        contentType: data.image_mime ?? "image/jpeg",
        upsert: false,
      });
      if (up.error) throw up.error;
      const signed = await supabaseAdmin.storage.from("citizen-reports").createSignedUrl(path, 60 * 60 * 24 * 365);
      image_url = signed.data?.signedUrl;
    }
    const { data: row, error } = await supabaseAdmin
      .from("citizen_reports")
      .insert({
        type: data.type,
        description: data.description,
        severity: data.severity,
        lat: data.lat,
        lng: data.lng,
        location_name: data.location_name ?? null,
        reported_by_name: data.reported_by_name ?? "Citizen",
        image_url: image_url ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

const ListFilter = z.object({
  status: z.string().optional(),
  type: ReportType.optional(),
  limit: z.number().min(1).max(200).default(50),
}).default({ limit: 50 });

export const listReports = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => ListFilter.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    let q = supa.from("citizen_reports").select("*").order("created_at", { ascending: false }).limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.type) q = q.eq("type", data.type);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

const VerifyReport = z.object({
  id: z.string().uuid(),
  status: z.enum(["new","verified","duplicate","rejected","resolved"]),
});

export const updateReportStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => VerifyReport.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: {
      status: typeof data.status;
      verified_at?: string;
      resolved_at?: string;
    } = { status: data.status };
    if (data.status === "verified") patch.verified_at = new Date().toISOString();
    if (data.status === "resolved") patch.resolved_at = new Date().toISOString();
    const { data: row, error } = await supabaseAdmin
      .from("citizen_reports").update(patch).eq("id", data.id).select().single();
    if (error) throw error;
    return row;
  });

const DeleteReport = z.object({ id: z.string().uuid() });

export const deleteReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DeleteReport.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("citizen_reports").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
