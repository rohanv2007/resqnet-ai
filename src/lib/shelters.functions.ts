import { createServerFn } from "@tanstack/react-start";

export const listShelters = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("shelters").select("*").order("name");
    if (error) throw error;
    return data ?? [];
  });

export const listResources = createServerFn({ method: "GET" })
  .handler(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const { data, error } = await supa.from("resources").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });
