"use client";

import React from "react";
import { motion } from "framer-motion";
import { DecorativeDivider } from "./DecorativeDivider";

interface SummaryDisplayProps {
  summary: string;
  onReset: () => void;
}

export function SummaryDisplay({ summary, onReset }: SummaryDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mx-auto max-w-2xl"
      data-testid="summary-display"
    >
      <DecorativeDivider className="mb-8" />

      <div className="rounded-lg border border-accent/30 bg-card p-4 shadow-lg md:p-6 lg:p-8">
        <h2 className="mb-4 text-center font-serif text-xl text-primary md:mb-6 md:text-2xl">
          Crônica da Noite
        </h2>

        <div className="mb-6 font-serif text-base leading-relaxed text-text md:mb-8 md:text-lg">
          {summary.split("\n").map((paragraph, idx) => (
            <p key={idx} className="mb-4 break-words last:mb-0">
              {paragraph}
            </p>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={onReset}
            className="min-h-[44px] rounded-md border-2 border-accent bg-transparent px-6 py-3 font-sans text-sm font-semibold text-accent shadow-sm transition-all hover:bg-accent hover:text-text-light hover:shadow-md md:px-8"
          >
            Nova Noite na Taberna
          </button>
        </div>
      </div>
    </motion.div>
  );
}
