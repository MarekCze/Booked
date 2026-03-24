import { getTenant } from "@/lib/tenant";
import { getTenantSettings, getScheduleForDisplay } from "@/lib/queries";
import { redirect } from "next/navigation";

export default async function ContactPage() {
  const tenant = await getTenant();
  if (!tenant) redirect("/");

  const [settings, schedule] = await Promise.all([
    getTenantSettings(tenant.id),
    getScheduleForDisplay(tenant.id),
  ]);

  const contact = settings?.contact;
  const social = settings?.social;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900">Contact</h1>
      <p className="mt-2 text-gray-500">Get in touch or visit us</p>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        {/* Contact Info */}
        <div className="space-y-4">
          {contact?.phone && (
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">Phone</p>
                <a href={`tel:${contact.phone}`} className="text-sm text-gray-600 hover:text-[var(--brand-primary,#0074c5)]">
                  {contact.phone}
                </a>
              </div>
            </div>
          )}

          {contact?.email && (
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">Email</p>
                <a href={`mailto:${contact.email}`} className="text-sm text-gray-600 hover:text-[var(--brand-primary,#0074c5)]">
                  {contact.email}
                </a>
              </div>
            </div>
          )}

          {contact?.address && (
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">Address</p>
                <p className="text-sm text-gray-600">{contact.address}</p>
              </div>
            </div>
          )}

          {/* Social Links */}
          {social && (social.instagram || social.facebook || social.tiktok) && (
            <div className="flex gap-3 pt-2">
              {social.instagram && (
                <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-[var(--brand-primary,#0074c5)]">
                  Instagram
                </a>
              )}
              {social.facebook && (
                <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-[var(--brand-primary,#0074c5)]">
                  Facebook
                </a>
              )}
              {social.tiktok && (
                <a href={social.tiktok} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-[var(--brand-primary,#0074c5)]">
                  TikTok
                </a>
              )}
            </div>
          )}
        </div>

        {/* Opening Hours */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Opening Hours</h2>
          <div className="mt-3 space-y-2">
            {schedule.map(({ day, hours }) => (
              <div key={day} className="flex justify-between text-sm">
                <span className="text-gray-600">{day}</span>
                <span className={hours === "Closed" ? "text-gray-400" : "font-medium text-gray-900"}>
                  {hours}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
