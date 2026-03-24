// Core domain types for ClipBook
// These will be replaced by generated Supabase types once schema is deployed

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  currency: string;
  stripe_account_id: string | null;
  settings: TenantSettings;
  created_at: string;
}

export interface TenantSettings {
  slot_granularity_min?: number; // default 15
  branding?: {
    primary_color?: string;
    logo_url?: string;
  };
  opening_hours?: Record<string, unknown>;
  homepage?: {
    title?: string;
    subtitle?: string;
    hero_image_url?: string;
    cta_text?: string;
  };
  about?: {
    description?: string;
  };
  gallery?: {
    images?: { url: string; caption?: string }[];
  };
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
    map_embed_url?: string;
  };
  social?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
}

export interface PortfolioImage {
  url: string;
  caption?: string;
}

export interface Specialist {
  id: string;
  tenant_id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  display_order: number;
  is_active: boolean;
  slots_generated_through: string | null;
  portfolio_images: PortfolioImage[] | null;
  created_at: string;
}

export interface Service {
  id: string;
  tenant_id: string;
  specialist_id: string | null;
  name: string;
  duration_min: number;
  price_cents: number;
  is_active: boolean;
}

export type SlotStatus = "available" | "held" | "booked";

export interface Slot {
  id: string;
  tenant_id: string;
  specialist_id: string;
  starts_at: string;
  ends_at: string;
  status: SlotStatus;
  booking_id: string | null;
  held_until: string | null;
  created_at: string;
}

export type BookingStatus = "confirmed" | "completed" | "cancelled" | "no_show";
export type PaymentStatus = "unpaid" | "paid" | "refunded";

export interface Booking {
  id: string;
  tenant_id: string;
  specialist_id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  slot_count: number;
  client_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  status: BookingStatus;
  payment_status: PaymentStatus;
  stripe_payment_intent_id: string | null;
  price_cents: number;
  notes: string | null;
  created_at: string;
}

export interface ScheduleTemplate {
  id: string;
  tenant_id: string;
  specialist_id: string;
  day_of_week: number; // 0=Mon, 6=Sun
  start_time: string;  // HH:MM
  end_time: string;    // HH:MM
  break_start: string | null;
  break_end: string | null;
}

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: "admin" | "staff";
}

export interface Review {
  id: string;
  tenant_id: string;
  specialist_id: string | null;
  author_name: string;
  rating: number;
  text: string | null;
  is_approved: boolean;
  created_at: string;
}
