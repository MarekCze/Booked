"use client";

import type { Service } from "@clipbook/shared";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDuration } from "@/lib/format";
import { useTenant } from "@/lib/tenant-context";

export function ServiceList({
  services,
  granularity,
  onSelect,
}: {
  services: Service[];
  granularity: number;
  onSelect: (service: Service, slotsNeeded: number) => void;
}) {
  const tenant = useTenant();

  return (
    <div className="space-y-2">
      {services.map((service) => {
        const slotsNeeded = Math.ceil(service.duration_min / granularity);
        return (
          <button
            key={service.id}
            onClick={() => onSelect(service, slotsNeeded)}
            className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white p-4 text-left transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            <div>
              <h4 className="font-medium text-gray-900">{service.name}</h4>
              <div className="mt-1 flex gap-2">
                <Badge variant="duration">
                  {formatDuration(service.duration_min)}
                </Badge>
              </div>
            </div>
            <span className="text-lg font-semibold text-gray-900">
              {formatPrice(service.price_cents, tenant.currency)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
