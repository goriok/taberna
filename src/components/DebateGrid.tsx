"use client";

import React from "react";
import { motion } from "framer-motion";
import { PhilosopherConfig } from "@/types/philosopher";
import { PhilosopherResponse } from "@/types/debate";
import { PhilosopherCard } from "./PhilosopherCard";

interface DebateGridProps {
  philosophers: PhilosopherConfig[];
  responses: PhilosopherResponse[];
}

export function DebateGrid({ philosophers, responses }: DebateGridProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: 0.08 },
        },
      }}
      className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3"
      data-testid="debate-grid"
    >
      {philosophers.map((philosopher) => {
        const response =
          responses
            .filter((r) => r.philosopherName === philosopher.name)
            .sort((a, b) => b.round - a.round)[0] ?? null;

        return (
          <motion.div
            key={philosopher.id}
            className="h-full"
            variants={{
              hidden: { opacity: 0, y: 24 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.4, ease: "easeOut" },
              },
            }}
          >
            <PhilosopherCard
              philosopher={philosopher}
              response={response}
              isActive={response?.status === "streaming"}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
