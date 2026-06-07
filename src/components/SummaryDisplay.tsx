"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { DecorativeDivider } from "./DecorativeDivider";
import type { PhilosopherResponse, TableEvent } from "@/types/debate";
import {
  buildDebateMarkdown,
  buildDebateFilename,
} from "@/lib/export/markdown";

interface SummaryDisplayProps {
  summary: string;
  dilemma: string;
  responses: PhilosopherResponse[];
  userInterventions: Record<number, string>;
  tableEvents: TableEvent[];
  onReset: () => void;
}

export function SummaryDisplay({
  summary,
  dilemma,
  responses,
  userInterventions,
  tableEvents,
  onReset,
}: SummaryDisplayProps) {
  const [copied, setCopied] = useState(false);

  function getMarkdown() {
    return buildDebateMarkdown({
      dilemma,
      responses,
      userInterventions,
      tableEvents,
      summary,
    });
  }

  function handleDownload() {
    const md = getMarkdown();
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildDebateFilename(dilemma, new Date());
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(getMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const btnClass =
    "min-h-[44px] rounded-md border-2 border-accent bg-transparent px-6 py-3 font-sans text-sm font-semibold text-accent shadow-sm transition-all hover:bg-accent hover:text-text-light hover:shadow-md md:px-8";

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

        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={handleDownload}
            className={btnClass}
            data-testid="export-markdown-button"
          >
            Baixar Markdown
          </button>
          <button
            onClick={handleCopy}
            className={btnClass}
            data-testid="copy-markdown-button"
          >
            {copied ? "Copiado!" : "Copiar"}
          </button>
          <button onClick={onReset} className={btnClass}>
            Nova Noite na Taberna
          </button>
        </div>
      </div>
    </motion.div>
  );
}
