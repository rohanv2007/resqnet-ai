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
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VerifyReport.parse(d))
  .handler(async ({ data, context }) => {
    // Only authority/ngo/admin can change status to verified/rejected/resolved
    const { data: roleRow } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    const roles = (roleRow ?? []).map(r => r.role);
    const elevated = roles.some(r => r === "authority" || r === "ngo" || r === "admin");
    if (!elevated) throw new Error("Forbidden: requires authority/ngo/admin role");

    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "verified") {
      patch.verified_by = context.userId;
      patch.verified_at = new Date().toISOString();
    }
    if (data.status === "resolved") patch.resolved_at = new Date().toISOString();
    const { data: row, error } = await context.supabase
      .from("citizen_reports").update(patch).eq("id", data.id).select().single();
    if (error) throw error;
    return row;
  });
