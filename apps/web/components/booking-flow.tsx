"use client";

import { useState } from "react";
import type { Specialist, Service } from "@clipbook/shared";
import { useTenant } from "@/lib/tenant-context";
import { formatDuration, formatPrice } from "@/lib/format";
import { ServiceList } from "./service-list";
import { AppointmentPicker } from "./appointment-picker";
import { BookingConfirmation } from "./booking-confirmation";

type Step = "service" | "datetime" | "confirm";

export function BookingFlow({
  specialist,
  services,
  granularity,
}: {
  specialist: Specialist;
  services: Service[];
  granularity: number;
}) {
  const tenant = useTenant();

  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [slotsNeeded, setSlotsNeeded] = useState(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  function handleServiceSelect(service: Service, slots: number) {
    setSelectedService(service);
    setSlotsNeeded(slots);
    setSelectedTime(null);
    setStep("datetime");
  }

  function handleBack() {
    if (step === "datetime") {
      setSelectedService(null);
      setSlotsNeeded(0);
      setStep("service");
    } else if (step === "confirm") {
      setSelectedTime(null);
      setStep("datetime");
    }
  }

  return (
    <div>
      {/* Specialist header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Book with {specialist.name}
        </h2>
        {specialist.bio && (
          <p className="mt-1 text-sm text-gray-500">{specialist.bio}</p>
        )}
      </div>

      {/* Step indicator */}
      <div className="mb-6 flex gap-2 text-sm">
        {(["service", "datetime", "confirm"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`flex items-center gap-1 ${
              s === step
                ? "font-semibold text-gray-900"
                : step === "confirm" && s !== "confirm"
                  ? "text-gray-400"
                  : "text-gray-400"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                s === step
                  ? "bg-[var(--brand-primary,#0074c5)] text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {i + 1}
            </span>
            <span className="hidden sm:inline">
              {s === "service"
                ? "Service"
                : s === "datetime"
                  ? "Date & Time"
                  : "Confirm"}
            </span>
            {i < 2 && <span className="mx-1 text-gray-300">/</span>}
          </div>
        ))}
      </div>

      {/* Back button */}
      {step !== "service" && (
        <button
          onClick={handleBack}
          className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Back
        </button>
      )}

      {/* Step content */}
      {step === "service" && (
        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-900">
            Choose a service
          </h3>
          <ServiceList
            services={services}
            granularity={granularity}
            onSelect={handleServiceSelect}
          />
        </div>
      )}

      {step === "datetime" && selectedService && (
        <div>
          <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            {selectedService.name} &middot;{" "}
            {formatDuration(selectedService.duration_min)} &middot;{" "}
            {formatPrice(selectedService.price_cents, tenant.currency)}
          </div>
          <AppointmentPicker
            specialistId={specialist.id}
            slotsNeeded={slotsNeeded}
            timezone={tenant.timezone}
            onConfirm={(startsAt) => {
              setSelectedTime(startsAt);
              setStep("confirm");
            }}
          />
        </div>
      )}

      {step === "confirm" && selectedService && selectedTime && (
        <BookingConfirmation
          specialist={specialist}
          service={selectedService}
          startsAt={selectedTime}
          slotsNeeded={slotsNeeded}
          onExpired={() => {
            setSelectedTime(null);
            setStep("datetime");
          }}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
