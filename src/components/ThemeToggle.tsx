"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-card-border bg-card text-accent shadow-sm transition-all hover:shadow-gold focus:outline-none focus:ring-2 focus:ring-accent/50"
      type="button"
    >
      <motion.span
        key={isDark ? "moon" : "sun"}
        initial={{ scale: 0.6, opacity: 0, rotate: -30 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        exit={{ scale: 0.6, opacity: 0, rotate: 30 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="block text-lg leading-none"
        aria-hidden="true"
      >
        {isDark ? "\u2600" : "\uD83C\uDF19"}
      </motion.span>
    </button>
  );
}
