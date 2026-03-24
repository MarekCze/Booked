import { createClient } from "@/lib/supabase/server";
import type { Specialist, Service, TenantSettings, Review, ScheduleTemplate } from "@clipbook/shared";

export async function getSpecialists(tenantId: string): Promise<Specialist[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("specialists")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("display_order");

  if (error) throw error;
  return data as Specialist[];
}

export async function getServices(
  tenantId: string,
  specialistId: string
): Promise<Service[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .or(`specialist_id.eq.${specialistId},specialist_id.is.null`);

  if (error) throw error;
  return data as Service[];
}

export async function getSpecialist(specialistId: string): Promise<Specialist | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("specialists")
    .select("*")
    .eq("id", specialistId)
    .single();

  if (error) return null;
  return data as Specialist;
}

export async function getNextAvailable(
  specialistId: string
): Promise<string | null> {
  const supabase = await createClient();
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Try today
  const { data: todayTimes } = await supabase.rpc("get_available_start_times", {
    p_specialist_id: specialistId,
    p_date: today,
    p_slots_needed: 1,
  });

  if (todayTimes && todayTimes.length > 0) {
    const future = todayTimes.filter((t: string) => new Date(t) > now);
    if (future.length > 0) return future[0];
  }

  // Try tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { data: tomorrowTimes } = await supabase.rpc("get_available_start_times", {
    p_specialist_id: specialistId,
    p_date: tomorrowStr,
    p_slots_needed: 1,
  });

  if (tomorrowTimes && tomorrowTimes.length > 0) return tomorrowTimes[0];
  return null;
}

export async function getTenantSettings(
  tenantId: string
): Promise<TenantSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("settings")
    .eq("id", tenantId)
    .single();

  if (error) throw error;
  return (data?.settings ?? {}) as TenantSettings;
}

export async function getReviews(
  tenantId: string,
  specialistId?: string
): Promise<Review[]> {
  const supabase = await createClient();
  let query = supabase
    .from("reviews")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false });

  if (specialistId) {
    query = query.eq("specialist_id", specialistId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Review[];
}

export async function getAverageRating(
  tenantId: string,
  specialistId?: string
): Promise<{ average: number; count: number }> {
  const supabase = await createClient();
  let query = supabase
    .from("reviews")
    .select("rating")
    .eq("tenant_id", tenantId)
    .eq("is_approved", true);

  if (specialistId) {
    query = query.eq("specialist_id", specialistId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const ratings = (data ?? []).map((r: { rating: number }) => r.rating);
  if (ratings.length === 0) return { average: 0, count: 0 };
  const sum = ratings.reduce((a: number, b: number) => a + b, 0);
  return { average: sum / ratings.length, count: ratings.length };
}

export async function getAllServices(tenantId: string): Promise<Service[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  if (error) throw error;
  return data as Service[];
}

export async function getScheduleForDisplay(
  tenantId: string
): Promise<{ day: string; hours: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedule_templates")
    .select("day_of_week, start_time, end_time, break_start, break_end")
    .eq("tenant_id", tenantId)
    .order("day_of_week");

  if (error) throw error;

  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const byDay = new Map<number, ScheduleTemplate[]>();

  for (const row of (data ?? []) as ScheduleTemplate[]) {
    const existing = byDay.get(row.day_of_week) ?? [];
    existing.push(row);
    byDay.set(row.day_of_week, existing);
  }

  return dayNames.map((name, i) => {
    const templates = byDay.get(i);
    if (!templates || templates.length === 0) {
      return { day: name, hours: "Closed" };
    }
    const t = templates[0];
    const start = t.start_time.slice(0, 5);
    const end = t.end_time.slice(0, 5);
    return { day: name, hours: `${start} – ${end}` };
  });
}
