"use client";

import React from "react";
import { motion } from "framer-motion";

interface ErrorCardProps {
  philosopherName: string;
}

/**
 * ErrorCard — displays a philosopher-specific error state.
 *
 * Shows that the philosopher is meditating in silence.
 * The debate continues without this philosopher.
 */
export function ErrorCard({ philosopherName }: ErrorCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.6 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center rounded-lg border-2 border-card-border bg-card p-5 opacity-60 shadow-md"
      data-testid="error-card"
    >
      <span className="font-serif text-base italic text-primary">
        {philosopherName} está meditando em silêncio…
      </span>
    </motion.div>
  );
}
