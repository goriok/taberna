"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhilosopherConfig } from "@/types/philosopher";
import { PhilosopherResponse } from "@/types/debate";

interface PhilosopherCardProps {
  philosopher: PhilosopherConfig;
  responses: PhilosopherResponse[];
  currentRound: number;
  userInterventions: Record<number, string>;
  isWaiting?: boolean;
}

function renderMarkdown(text: string): React.ReactNode[] {
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
  if (paragraphs.length <= 1) return <>{renderMarkdown(content)}</>;
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

function CollapsibleRound({
  round,
  content,
  userText,
  isLast,
}: {
  round: number;
  content: string;
  userText?: string;
  isLast: boolean;
}) {
  const [open, setOpen] = useState(false);
  const snippet = content.slice(0, 80).trimEnd() + (content.length > 80 ? "…" : "");

  if (isLast) {
    return (
      <div className="flex flex-col gap-2">
        <div className="break-words font-sans text-sm leading-relaxed text-text">
          <MarkdownText content={content} />
        </div>
        {userText && (
          <div className="mt-2 rounded border-l-2 border-accent/50 pl-3 font-sans text-xs italic text-text/60">
            Você: "{userText}"
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded border border-card-border/50">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="font-sans text-xs text-text/40">
          Round {round} {!open && <span className="text-text/30">— {snippet}</span>}
        </span>
        <span className="shrink-0 text-text/30 transition-transform duration-200" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          ▾
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-card-border/40 px-3 pb-3 pt-2">
              <div className="break-words font-sans text-sm leading-relaxed text-text/70">
                <MarkdownText content={content} />
              </div>
              {userText && (
                <div className="mt-2 rounded border-l-2 border-accent/50 pl-3 font-sans text-xs italic text-text/50">
                  Você: "{userText}"
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PhilosopherCard({
  philosopher,
  responses,
  currentRound,
  userInterventions,
  isWaiting = false,
}: PhilosopherCardProps) {
  const isDisabled = philosopher.enabled === false;
  const avatarLetter = philosopher.name.charAt(0).toUpperCase();

  const currentResponse = responses.find((r) => r.round === currentRound) ?? null;
  const status = currentResponse?.status ?? null;

  const isStreaming = status === "streaming";
  const showTyping = isWaiting && status === null;

  const borderClass = isDisabled
    ? "border-card-border opacity-40 grayscale"
    : isStreaming || showTyping
      ? "border-amber"
      : "border-accent";

  // All completed rounds, sorted ascending
  const completedRounds = responses
    .filter((r) => r.status === "complete")
    .sort((a, b) => a.round - b.round);

  const latestCompleted = completedRounds[completedRounds.length - 1] ?? null;
  const previousRounds = completedRounds.slice(0, -1);

  return (
    <div
      data-testid="philosopher-card"
      className={`relative flex h-full flex-col gap-3 rounded-lg border bg-card p-4 shadow-md transition-colors duration-300 md:gap-4 md:border-2 md:p-5 ${borderClass}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent bg-bg text-lg font-bold text-primary"
          aria-hidden="true"
        >
          {avatarLetter}
        </div>
        <div className="flex flex-col">
          <span className="font-serif text-base font-bold text-text">
            {philosopher.name}
          </span>
          <span className="font-sans text-xs text-primary">
            {philosopher.era} · {philosopher.shortName}
          </span>
        </div>
      </div>

      {/* Previous rounds — collapsible */}
      {previousRounds.length > 0 && (
        <div className="flex flex-col gap-2">
          {previousRounds.map((r) => (
            <CollapsibleRound
              key={r.round}
              round={r.round}
              content={r.content}
              userText={userInterventions[r.round]}
              isLast={false}
            />
          ))}
        </div>
      )}

      {/* Current round */}
      <AnimatePresence mode="wait">
        {showTyping && (
          <motion.div
            key="typing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-1 items-center justify-center py-6"
          >
            <span className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="inline-block h-1.5 w-1.5 rounded-full bg-amber"
                  style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </span>
          </motion.div>
        )}

        {status === null && !latestCompleted && !showTyping && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-1 items-center justify-center py-6"
          >
            <span className="font-sans text-sm italic text-primary/70">
              Aguardando sua vez de falar…
            </span>
          </motion.div>
        )}

        {status === "streaming" && currentResponse && (
          <motion.div
            key={`streaming-${currentRound}`}
            aria-live="polite"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="break-words font-sans text-sm leading-relaxed text-text"
          >
            <MarkdownText content={currentResponse.content} />
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-blink bg-accent align-middle" />
          </motion.div>
        )}

        {latestCompleted && status !== "streaming" && (
          <motion.div
            key={`complete-${latestCompleted.round}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <CollapsibleRound
              round={latestCompleted.round}
              content={latestCompleted.content}
              userText={userInterventions[latestCompleted.round]}
              isLast={true}
            />
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-1 items-center justify-center py-6"
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
