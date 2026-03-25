"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Service, Specialist } from "@clipbook/shared";

const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90, 120];

interface ServiceFormProps {
  tenantId: string;
  currency: string;
  specialists: Specialist[];
  service?: Service;
}

export function ServiceForm({
  tenantId,
  currency,
  specialists,
  service,
}: ServiceFormProps) {
  const router = useRouter();

  const [name, setName] = useState(service?.name ?? "");
  const [durationMin, setDurationMin] = useState(service?.duration_min ?? 30);
  const [priceDisplay, setPriceDisplay] = useState(
    service ? (service.price_cents / 100).toFixed(2) : ""
  );
  const [specialistId, setSpecialistId] = useState<string>(
    service?.specialist_id ?? ""
  );
  const [isActive, setIsActive] = useState(service?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEdit = !!service;

  const currencySymbol = new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
  })
    .formatToParts(0)
    .find((p) => p.type === "currency")?.value ?? currency;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const priceCents = Math.round(parseFloat(priceDisplay) * 100);
    if (isNaN(priceCents) || priceCents < 0) {
      toast.error("Please enter a valid price.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const payload = {
      tenant_id: tenantId,
      name: name.trim(),
      duration_min: durationMin,
      price_cents: priceCents,
      specialist_id: specialistId || null,
      is_active: isActive,
    };

    if (isEdit) {
      const { error } = await supabase
        .from("services")
        .update(payload)
        .eq("id", service.id);

      if (error) {
        toast.error("Failed to update service.");
        setSaving(false);
        return;
      }
      toast.success("Service updated.");
    } else {
      const { error } = await supabase.from("services").insert(payload);

      if (error) {
        toast.error("Failed to create service.");
        setSaving(false);
        return;
      }
      toast.success("Service created.");
    }

    router.push("/services");
    router.refresh();
  };

  const handleDelete = async () => {
    if (!service) return;
    if (!confirm("Are you sure you want to delete this service?")) return;

    setDeleting(true);
    const supabase = createClient();

    // Check for future bookings
    const { data: futureBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("service_id", service.id)
      .gte("starts_at", new Date().toISOString())
      .neq("status", "cancelled")
      .limit(1);

    if (futureBookings && futureBookings.length > 0) {
      toast.error("Cannot delete: service has future bookings.");
      setDeleting(false);
      return;
    }

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", service.id);

    if (error) {
      toast.error("Failed to delete service.");
      setDeleting(false);
      return;
    }

    toast.success("Service deleted.");
    router.push("/services");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Service Name
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          placeholder="e.g. Skin Fade, Balayage..."
        />
      </div>

      {/* Duration */}
      <div>
        <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
          Duration
        </label>
        <select
          id="duration"
          value={durationMin}
          onChange={(e) => setDurationMin(Number(e.target.value))}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        >
          {DURATION_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d >= 60
                ? `${Math.floor(d / 60)} hr${d % 60 ? ` ${d % 60} min` : ""}`
                : `${d} min`}
            </option>
          ))}
        </select>
      </div>

      {/* Price */}
      <div>
        <label htmlFor="price" className="block text-sm font-medium text-gray-700">
          Price
        </label>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-gray-500">
            {currencySymbol}
          </span>
          <input
            id="price"
            type="number"
            step="0.01"
            min="0"
            required
            value={priceDisplay}
            onChange={(e) => setPriceDisplay(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Specialist assignment */}
      <div>
        <label htmlFor="specialist" className="block text-sm font-medium text-gray-700">
          Specialist
        </label>
        <select
          id="specialist"
          value={specialistId}
          onChange={(e) => setSpecialistId(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        >
          <option value="">All Specialists</option>
          {specialists.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          onClick={() => setIsActive(!isActive)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
            isActive ? "bg-emerald-500" : "bg-gray-200"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              isActive ? "translate-x-5" : "translate-x-0.5"
            } mt-0.5`}
          />
        </button>
        <span className="text-sm font-medium text-gray-700">
          {isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Service"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/services")}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          Cancel
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        )}
      </div>
    </form>
  );
}
