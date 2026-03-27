"use client";

import { useState } from "react";
import { OnboardingChecklist } from "./onboarding-checklist";

interface Props {
  hasSpecialists: boolean;
  hasServices: boolean;
  hasSchedule: boolean;
  stripeConnected: boolean;
  tenantSlug: string;
}

export function OnboardingChecklistWrapper(props: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <OnboardingChecklist
      {...props}
      onDismiss={() => setDismissed(true)}
    />
  );
}
