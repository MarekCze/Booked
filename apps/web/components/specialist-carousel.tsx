"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { Specialist } from "@clipbook/shared";
import { SpecialistCard } from "./specialist-card";

interface SpecialistWithAvailability {
  specialist: Specialist;
  nextAvailable: string | null;
}

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function SpecialistCarousel({
  specialists,
}: {
  specialists: SpecialistWithAvailability[];
}) {
  const router = useRouter();

  function handleSelect(specialistId: string) {
    router.push(`/book?specialist=${specialistId}`);
  }

  // Single specialist: render prominently, no carousel
  if (specialists.length === 1) {
    const { specialist, nextAvailable } = specialists[0];
    return (
      <div className="mx-auto max-w-sm">
        <SpecialistCard
          specialist={specialist}
          nextAvailable={nextAvailable}
          onSelect={handleSelect}
        />
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide md:grid md:grid-cols-2 md:overflow-x-visible md:snap-none lg:grid-cols-3"
    >
      {specialists.map(({ specialist, nextAvailable }) => (
        <motion.div
          key={specialist.id}
          variants={item}
          className="min-w-[85vw] snap-center md:min-w-0"
        >
          <SpecialistCard
            specialist={specialist}
            nextAvailable={nextAvailable}
            onSelect={handleSelect}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
