"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhilosopherConfig } from "@/types/philosopher";
import { PhilosopherResponse } from "@/types/debate";

interface PhilosopherCardProps {
  philosopher: PhilosopherConfig;
  response: PhilosopherResponse | null;
  isActive: boolean;
}

function renderMarkdown(text: string): React.ReactNode[] {
  // Split by bold (**text**) and italic (*text*), preserving delimiters
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function MarkdownText({ content }: { content: string }) {
  const paragraphs = content.split(/\n+/).filter(Boolean);
  if (paragraphs.length <= 1) {
    return <>{renderMarkdown(content)}</>;
  }
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className={i < paragraphs.length - 1 ? "mb-3" : ""}>
          {renderMarkdown(p)}
        </p>
      ))}
    </>
  );
}

/**
 * PhilosopherCard — displays a philosopher's response during the debate.
 *
 * Four visual states:
 *   idle     → portrait, name, era, shortName
 *   streaming→ token-by-token text with blinking cursor, amber accent border
 *   complete → full response with subtle fade-in
 *   error    → "meditando em silêncio…" with faint opacity
 */
export function PhilosopherCard({
  philosopher,
  response,
  isActive,
}: PhilosopherCardProps) {
  const status = response?.status ?? null;

  const avatarLetter = philosopher.name.charAt(0).toUpperCase();

  const isDisabled = philosopher.enabled === false;

  const borderClass = isDisabled
    ? "border-card-border opacity-40 grayscale"
    : status === "error"
      ? "border-card-border opacity-60"
      : isActive || status === "streaming"
        ? "border-amber"
        : "border-accent";

  return (
    <div
      data-testid="philosopher-card"
      className={`relative flex h-full flex-col gap-3 rounded-lg border bg-card p-4 shadow-md transition-colors duration-300 md:gap-4 md:border-2 md:p-5 ${borderClass}`}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full border border-accent bg-bg text-lg font-bold text-primary"
          aria-hidden="true"
        >
          {avatarLetter}
        </div>
        <div className="flex flex-col">
          <span className="font-serif text-base font-bold text-text">
            {philosopher.name}
          </span>
          <span className="font-sans text-sm text-primary">
            {philosopher.era} · {philosopher.shortName}
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {status === null && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center py-6"
          >
            <span className="font-sans text-sm italic text-primary/70">
              Aguardando sua vez de falar…
            </span>
          </motion.div>
        )}

        {status === "streaming" && response && (
          <motion.div
            key="streaming"
            aria-live="polite"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="max-h-64 overflow-y-auto break-words font-sans text-sm leading-relaxed text-text"
          >
            <MarkdownText content={response.content} />
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-blink bg-accent align-middle" />
          </motion.div>
        )}

        {status === "complete" && response && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-h-64 overflow-y-auto break-words font-sans text-sm leading-relaxed text-text"
          >
            <MarkdownText content={response.content} />
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-center py-6"
          >
            <span className="font-serif text-base italic text-primary">
              {philosopher.shortName} está meditando em silêncio…
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
