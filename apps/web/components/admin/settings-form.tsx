"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Tenant, TenantSettings } from "@clipbook/shared";

const TIMEZONES = [
  "Europe/Dublin",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Madrid",
  "Europe/Amsterdam",
  "Europe/Brussels",
  "Europe/Lisbon",
  "Europe/Warsaw",
  "Europe/Prague",
  "Europe/Vienna",
  "Europe/Stockholm",
  "Europe/Helsinki",
  "Europe/Athens",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Australia/Sydney",
  "Asia/Tokyo",
];

const CURRENCIES = ["EUR", "GBP", "USD", "AUD", "CAD", "NZD", "CHF", "SEK", "NOK", "DKK"];

const GRANULARITY_OPTIONS = [15, 20, 30];

interface SettingsFormProps {
  tenant: Tenant;
}

export function SettingsForm({ tenant }: SettingsFormProps) {
  const router = useRouter();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  const settings = tenant.settings ?? {};

  // Shop details
  const [name, setName] = useState(tenant.name);
  const [timezone, setTimezone] = useState(tenant.timezone);
  const [currency, setCurrency] = useState(tenant.currency);
  const [granularity, setGranularity] = useState(
    settings.slot_granularity_min ?? 15
  );

  // Branding
  const [primaryColor, setPrimaryColor] = useState(
    settings.branding?.primary_color ?? "#0074c5"
  );
  const [logoUrl, setLogoUrl] = useState(settings.branding?.logo_url ?? "");

  // Homepage
  const [homeTitle, setHomeTitle] = useState(settings.homepage?.title ?? "");
  const [homeSubtitle, setHomeSubtitle] = useState(
    settings.homepage?.subtitle ?? ""
  );
  const [homeCta, setHomeCta] = useState(settings.homepage?.cta_text ?? "");
  const [heroImageUrl, setHeroImageUrl] = useState(
    settings.homepage?.hero_image_url ?? ""
  );

  // About
  const [aboutDesc, setAboutDesc] = useState(
    settings.about?.description ?? ""
  );

  // Contact
  const [contactEmail, setContactEmail] = useState(
    settings.contact?.email ?? ""
  );
  const [contactPhone, setContactPhone] = useState(
    settings.contact?.phone ?? ""
  );
  const [contactAddress, setContactAddress] = useState(
    settings.contact?.address ?? ""
  );
  const [mapEmbedUrl, setMapEmbedUrl] = useState(
    settings.contact?.map_embed_url ?? ""
  );

  // Social
  const [instagram, setInstagram] = useState(settings.social?.instagram ?? "");
  const [facebook, setFacebook] = useState(settings.social?.facebook ?? "");
  const [tiktok, setTiktok] = useState(settings.social?.tiktok ?? "");

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (
    file: File,
    folder: string
  ): Promise<string | null> => {
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${tenant.id}/${folder}-${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("tenant-assets")
        .upload(path, file, { contentType: file.type, upsert: true });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("tenant-assets").getPublicUrl(path);

      return publicUrl;
    } catch {
      toast.error("Failed to upload image.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const supabase = createClient();

    const updatedSettings: TenantSettings = {
      ...settings,
      slot_granularity_min: granularity,
      branding: {
        primary_color: primaryColor,
        logo_url: logoUrl || undefined,
      },
      homepage: {
        title: homeTitle || undefined,
        subtitle: homeSubtitle || undefined,
        cta_text: homeCta || undefined,
        hero_image_url: heroImageUrl || undefined,
      },
      about: {
        description: aboutDesc || undefined,
      },
      contact: {
        email: contactEmail || undefined,
        phone: contactPhone || undefined,
        address: contactAddress || undefined,
        map_embed_url: mapEmbedUrl || undefined,
      },
      social: {
        instagram: instagram || undefined,
        facebook: facebook || undefined,
        tiktok: tiktok || undefined,
      },
    };

    const { error } = await supabase
      .from("tenants")
      .update({
        name: name.trim(),
        timezone,
        currency,
        settings: updatedSettings,
      })
      .eq("id", tenant.id);

    if (error) {
      toast.error("Failed to save settings.");
      setSaving(false);
      return;
    }

    toast.success("Settings saved.");
    setSaving(false);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-10">
      {/* Shop Details */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Shop Details</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="shop-name" className="block text-sm font-medium text-gray-700">
              Shop Name
            </label>
            <input
              id="shop-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                Timezone
              </label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="granularity" className="block text-sm font-medium text-gray-700">
              Slot Granularity
            </label>
            <select
              id="granularity"
              value={granularity}
              onChange={(e) => setGranularity(Number(e.target.value))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              {GRANULARITY_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g} minutes
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Changing this will regenerate all future available slots.
            </p>
          </div>
        </div>
      </section>

      {/* Stripe */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Stripe</h2>
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          {tenant.stripe_account_id ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">
                  Connected
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Account: {tenant.stripe_account_id}
                </p>
              </div>
              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-white"
              >
                Stripe Dashboard
              </a>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Connect your Stripe account to accept payments.
              </p>
              <button
                type="button"
                className="mt-3 rounded-lg bg-[#635bff] px-4 py-2 text-sm font-medium text-white hover:bg-[#5851db]"
              >
                Connect Stripe
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Branding */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Branding</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="primary-color" className="block text-sm font-medium text-gray-700">
              Primary Color
            </label>
            <div className="mt-1 flex items-center gap-3">
              <input
                id="primary-color"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-10 cursor-pointer rounded border border-gray-300"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="block w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Logo
            </label>
            <div className="mt-2 flex items-center gap-4">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-12 w-12 rounded object-contain"
                />
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await uploadImage(file, "logo");
                  if (url) setLogoUrl(url);
                }}
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {uploading ? "Uploading..." : logoUrl ? "Change Logo" : "Upload Logo"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Homepage Content */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Homepage</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="home-title" className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              id="home-title"
              type="text"
              value={homeTitle}
              onChange={(e) => setHomeTitle(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              placeholder="Welcome to our shop"
            />
          </div>
          <div>
            <label htmlFor="home-subtitle" className="block text-sm font-medium text-gray-700">
              Subtitle
            </label>
            <input
              id="home-subtitle"
              type="text"
              value={homeSubtitle}
              onChange={(e) => setHomeSubtitle(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              placeholder="Professional grooming services"
            />
          </div>
          <div>
            <label htmlFor="home-cta" className="block text-sm font-medium text-gray-700">
              Call to Action Text
            </label>
            <input
              id="home-cta"
              type="text"
              value={homeCta}
              onChange={(e) => setHomeCta(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              placeholder="Book Now"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Hero Image
            </label>
            <div className="mt-2 flex items-center gap-4">
              {heroImageUrl && (
                <img
                  src={heroImageUrl}
                  alt="Hero"
                  className="h-20 w-32 rounded-lg object-cover"
                />
              )}
              <input
                ref={heroInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await uploadImage(file, "hero");
                  if (url) setHeroImageUrl(url);
                }}
              />
              <button
                type="button"
                onClick={() => heroInputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {uploading ? "Uploading..." : heroImageUrl ? "Change Image" : "Upload Image"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">About</h2>
        <div className="mt-4">
          <label htmlFor="about-desc" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="about-desc"
            rows={4}
            value={aboutDesc}
            onChange={(e) => setAboutDesc(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            placeholder="Tell clients about your shop..."
          />
        </div>
      </section>

      {/* Contact */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>
            <div>
              <label htmlFor="contact-phone" className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                id="contact-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>
          </div>
          <div>
            <label htmlFor="contact-address" className="block text-sm font-medium text-gray-700">
              Address
            </label>
            <input
              id="contact-address"
              type="text"
              value={contactAddress}
              onChange={(e) => setContactAddress(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>
          <div>
            <label htmlFor="map-embed" className="block text-sm font-medium text-gray-700">
              Google Maps Embed URL
            </label>
            <input
              id="map-embed"
              type="url"
              value={mapEmbedUrl}
              onChange={(e) => setMapEmbedUrl(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              placeholder="https://www.google.com/maps/embed?..."
            />
          </div>
        </div>
      </section>

      {/* Social */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Social</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="instagram" className="block text-sm font-medium text-gray-700">
              Instagram URL
            </label>
            <input
              id="instagram"
              type="url"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              placeholder="https://instagram.com/yourshop"
            />
          </div>
          <div>
            <label htmlFor="facebook" className="block text-sm font-medium text-gray-700">
              Facebook URL
            </label>
            <input
              id="facebook"
              type="url"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>
          <div>
            <label htmlFor="tiktok" className="block text-sm font-medium text-gray-700">
              TikTok URL
            </label>
            <input
              id="tiktok"
              type="url"
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="border-t border-gray-200 pt-6">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </form>
  );
}
