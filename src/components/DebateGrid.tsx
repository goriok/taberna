"use client";

import React from "react";
import { motion } from "framer-motion";
import { PhilosopherConfig } from "@/types/philosopher";
import { PhilosopherResponse } from "@/types/debate";
import { PhilosopherCard } from "./PhilosopherCard";

interface DebateGridProps {
  philosophers: PhilosopherConfig[];
  responses: PhilosopherResponse[];
  currentRound: number;
  isWaiting?: boolean;
}

export function DebateGrid({ philosophers, responses, currentRound, isWaiting }: DebateGridProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.08 } },
      }}
      className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3"
      data-testid="debate-grid"
    >
      {philosophers.map((philosopher) => {
        const philosopherResponses = responses.filter(
          (r) => r.philosopherName === philosopher.name
        );

        return (
          <motion.div
            key={philosopher.id}
            className="h-full"
            variants={{
              hidden: { opacity: 0, y: 24 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
            }}
          >
            <PhilosopherCard
              philosopher={philosopher}
              responses={philosopherResponses}
              currentRound={currentRound}
              isWaiting={isWaiting}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
