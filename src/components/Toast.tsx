"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ToastProps {
  message: string;
  variant: "info" | "success" | "error";
  onDismiss: () => void;
}

/**
 * Toast — ephemeral notification for non-blocking messages.
 *
 * Auto-dismisses after 5 seconds.
 * Slides in from top-right with Framer Motion.
 */
export function Toast({ message, variant, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const variantStyles = {
    info: "border-accent bg-card text-text",
    success: "border-primary bg-card text-primary",
    error: "border-red-700 bg-red-50 text-red-900 dark:border-red-500 dark:bg-red-950/30 dark:text-red-200",
  };

  const icon = {
    info: "ℹ️",
    success: "✓",
    error: "✕",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={`fixed right-4 top-4 z-50 flex items-center gap-3 rounded-lg border-2 px-5 py-3 shadow-lg ${variantStyles[variant]}`}
        role="alert"
        data-testid="toast"
      >
        <span className="font-sans text-lg font-bold" aria-hidden="true">
          {icon[variant]}
        </span>
        <span className="font-sans text-base">{message}</span>
        <button
          onClick={onDismiss}
          className="ml-2 font-sans text-lg leading-none opacity-60 transition-opacity hover:opacity-100"
          aria-label="Fechar notificação"
          type="button"
        >
          ×
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
