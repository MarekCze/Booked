"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Specialist, PortfolioImage } from "@clipbook/shared";

interface SpecialistFormProps {
  tenantId: string;
  specialist?: Specialist;
}

export function SpecialistForm({ tenantId, specialist }: SpecialistFormProps) {
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(specialist?.name ?? "");
  const [bio, setBio] = useState(specialist?.bio ?? "");
  const [isActive, setIsActive] = useState(specialist?.is_active ?? true);
  const [photoUrl, setPhotoUrl] = useState(specialist?.photo_url ?? "");
  const [portfolioImages, setPortfolioImages] = useState<PortfolioImage[]>(
    specialist?.portfolio_images ?? []
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEdit = !!specialist;

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      const supabase = createClient();

      // Resize on client side
      const resized = await resizeImage(file, 500, 500);
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${tenantId}/${specialist?.id ?? "new"}-${Date.now()}.${ext}`;

      // Delete old photo if replacing
      if (photoUrl) {
        const oldPath = photoUrl.split("/specialist-photos/").pop();
        if (oldPath) {
          await supabase.storage.from("specialist-photos").remove([oldPath]);
        }
      }

      const { error } = await supabase.storage
        .from("specialist-photos")
        .upload(path, resized, { contentType: resized.type, upsert: true });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("specialist-photos").getPublicUrl(path);

      setPhotoUrl(publicUrl);
    } catch {
      toast.error("Failed to upload photo.");
    } finally {
      setUploading(false);
    }
  };

  const uploadPortfolioImage = async (files: FileList) => {
    setUploading(true);
    try {
      const supabase = createClient();
      const newImages: PortfolioImage[] = [];

      for (const file of Array.from(files)) {
        const resized = await resizeImage(file, 1200, 1200);
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${tenantId}/portfolio/${specialist?.id ?? "new"}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;

        const { error } = await supabase.storage
          .from("specialist-photos")
          .upload(path, resized, { contentType: resized.type });

        if (error) throw error;

        const {
          data: { publicUrl },
        } = supabase.storage.from("specialist-photos").getPublicUrl(path);

        newImages.push({ url: publicUrl });
      }

      setPortfolioImages((prev) => [...prev, ...newImages]);
    } catch {
      toast.error("Failed to upload portfolio images.");
    } finally {
      setUploading(false);
    }
  };

  const removePortfolioImage = async (index: number) => {
    const img = portfolioImages[index];
    const supabase = createClient();

    const path = img.url.split("/specialist-photos/").pop();
    if (path) {
      await supabase.storage.from("specialist-photos").remove([path]);
    }

    setPortfolioImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    const supabase = createClient();

    const payload = {
      tenant_id: tenantId,
      name: name.trim(),
      bio: bio.trim() || null,
      photo_url: photoUrl || null,
      is_active: isActive,
      portfolio_images: portfolioImages.length > 0 ? portfolioImages : null,
    };

    if (isEdit) {
      const { error } = await supabase
        .from("specialists")
        .update(payload)
        .eq("id", specialist.id);

      if (error) {
        toast.error("Failed to update specialist.");
        setSaving(false);
        return;
      }
      toast.success("Specialist updated.");
    } else {
      // Get next display_order
      const { data: maxOrder } = await supabase
        .from("specialists")
        .select("display_order")
        .eq("tenant_id", tenantId)
        .order("display_order", { ascending: false })
        .limit(1)
        .single();

      const { error } = await supabase.from("specialists").insert({
        ...payload,
        display_order: (maxOrder?.display_order ?? -1) + 1,
      });

      if (error) {
        toast.error("Failed to create specialist.");
        setSaving(false);
        return;
      }
      toast.success("Specialist created.");
    }

    router.push("/specialists");
    router.refresh();
  };

  const handleDelete = async () => {

    if (!specialist) return;
    if (!confirm("Are you sure you want to delete this specialist?")) return;

    setDeleting(true);
    const supabase = createClient();

    // Check for future bookings
    const { data: futureBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("specialist_id", specialist.id)
      .gte("starts_at", new Date().toISOString())
      .neq("status", "cancelled")
      .limit(1);

    if (futureBookings && futureBookings.length > 0) {
      toast.error("Cannot delete: specialist has future bookings.");
      setDeleting(false);
      return;
    }

    const { error } = await supabase
      .from("specialists")
      .delete()
      .eq("id", specialist.id);

    if (error) {
      toast.error("Failed to delete specialist.");
      setDeleting(false);
      return;
    }

    toast.success("Specialist deleted.");
    router.push("/specialists");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      {/* Photo upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Profile Photo
        </label>
        <div className="mt-2 flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gray-100">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-medium text-gray-400">
                {name ? name.charAt(0).toUpperCase() : "?"}
              </div>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadPhoto(file);
            }}
          />
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : photoUrl ? "Change Photo" : "Upload Photo"}
          </button>
        </div>
      </div>

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
          Bio
        </label>
        <textarea
          id="bio"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          placeholder="Short description or specialty..."
        />
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

      {/* Portfolio images */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Portfolio Images
        </label>
        <p className="mt-1 text-xs text-gray-500">
          Showcase work samples on the specialist profile page
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {portfolioImages.map((img, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100">
              <img
                src={img.url}
                alt={img.caption || `Portfolio ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePortfolioImage(i)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <input
            ref={portfolioInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) uploadPortfolioImage(e.target.files);
            }}
          />
          <button
            type="button"
            onClick={() => portfolioInputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500 disabled:opacity-50"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Specialist"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/specialists")}
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

/** Resize an image file to fit within maxW x maxH, returns a Blob */
async function resizeImage(
  file: File,
  maxW: number,
  maxH: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxW || height > maxH) {
        const ratio = Math.min(maxW / width, maxH / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to convert canvas to blob"));
        },
        "image/jpeg",
        0.85
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
