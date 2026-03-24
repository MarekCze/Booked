import { getTenant } from "@/lib/tenant";
import { getTenantSettings } from "@/lib/queries";
import { redirect } from "next/navigation";
import { GalleryGrid } from "./gallery-grid";

export default async function GalleryPage() {
  const tenant = await getTenant();
  if (!tenant) redirect("/");

  const settings = await getTenantSettings(tenant.id);
  const images = settings?.gallery?.images ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900">Gallery</h1>
      <p className="mt-2 text-gray-500">A look at our work</p>

      {images.length > 0 ? (
        <div className="mt-8">
          <GalleryGrid images={images} />
        </div>
      ) : (
        <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-400">Gallery coming soon</p>
        </div>
      )}
    </div>
  );
}
