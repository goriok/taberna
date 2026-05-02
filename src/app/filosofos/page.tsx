"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { philosophers } from "@/philosophers";
import { PhilosopherConfig } from "@/types/philosopher";
import { DecorativeDivider } from "@/components/DecorativeDivider";
import { ThemeToggle } from "@/components/ThemeToggle";

function ConceptPill({ term }: { term: string }) {
  return (
    <span className="inline-block rounded border border-accent/30 bg-accent/5 px-2 py-0.5 font-sans text-xs text-accent">
      {term}
    </span>
  );
}

function PhilosopherPanel({ philosopher, isOpen, onToggle }: {
  philosopher: PhilosopherConfig;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const avatarLetter = philosopher.name.charAt(0).toUpperCase();

  return (
    <div className={`rounded-lg border bg-card shadow-md transition-colors duration-200 ${isOpen ? "border-accent" : "border-card-border"}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-4 p-5 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent bg-bg text-lg font-bold text-primary">
          {avatarLetter}
        </div>
        <div className="flex flex-1 flex-col min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-serif text-lg font-bold text-text">{philosopher.name}</span>
            <span
              className="shrink-0 text-text/30 transition-transform duration-200"
              style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            >▾</span>
          </div>
          <span className="font-sans text-xs text-primary">{philosopher.era}</span>
          <span className="mt-1 font-sans text-xs text-text/40 italic">{philosopher.method}</span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-card-border/50 px-5 pb-6 pt-4 flex flex-col gap-5">

              {/* Core philosophy */}
              <div>
                <h3 className="mb-2 font-sans text-xs uppercase tracking-widest text-text/40">Filosofia central</h3>
                <p className="font-sans text-sm leading-relaxed text-text/80">{philosopher.corePhilosophy}</p>
              </div>

              {/* Key concepts */}
              <div>
                <h3 className="mb-3 font-sans text-xs uppercase tracking-widest text-text/40">Conceitos-chave</h3>
                <div className="flex flex-col gap-3">
                  {philosopher.keyConcepts.map((concept) => (
                    <div key={concept.term}>
                      <div className="mb-1">
                        <ConceptPill term={concept.term} />
                      </div>
                      <p className="font-sans text-sm leading-relaxed text-text/70">{concept.definition}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vocabulary */}
              <div>
                <h3 className="mb-2 font-sans text-xs uppercase tracking-widest text-text/40">Vocabulário</h3>
                <div className="flex flex-wrap gap-1.5">
                  {philosopher.vocabulary.map((word) => (
                    <span
                      key={word}
                      className="rounded border border-card-border px-2 py-0.5 font-sans text-xs text-text/50"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>

              {/* Writing style */}
              <div>
                <h3 className="mb-2 font-sans text-xs uppercase tracking-widest text-text/40">Estilo</h3>
                <p className="font-sans text-sm leading-relaxed text-text/70 italic">{philosopher.writingStyle}</p>
              </div>

              {/* Anti-patterns */}
              <div>
                <h3 className="mb-2 font-sans text-xs uppercase tracking-widest text-text/40">Mal-leituras a evitar</h3>
                <ul className="flex flex-col gap-1.5">
                  {philosopher.antiPatterns.map((ap, i) => (
                    <li key={i} className="flex gap-2 font-sans text-sm leading-relaxed text-text/60">
                      <span className="mt-0.5 shrink-0 text-burgundy">✕</span>
                      {ap}
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FilosofosPage() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <main className="flex min-h-full flex-col items-center px-4 py-8 md:px-6 md:py-10 lg:px-8 lg:py-12">
      <div className="w-full max-w-3xl">
        <header className="relative mb-8 text-center md:mb-10">
          <div className="absolute right-0 top-0 flex items-center gap-3">
            <Link
              href="/"
              className="font-sans text-xs text-text/30 transition-colors hover:text-accent"
            >
              ← Taberna
            </Link>
            <ThemeToggle />
          </div>
          <motion.h1
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="font-serif text-3xl font-bold tracking-tight text-primary md:text-4xl"
          >
            Os Convidados
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-2 font-sans text-base text-text/70"
          >
            Quem senta à mesa da Taberna e o que traz consigo.
          </motion.p>
          <DecorativeDivider className="mx-auto mt-6 max-w-xs" />
        </header>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06 } },
          }}
          className="flex flex-col gap-3"
        >
          {[...philosophers].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")).map((philosopher) => (
            <motion.div
              key={philosopher.id}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
              }}
            >
              <PhilosopherPanel
                philosopher={philosopher}
                isOpen={openId === philosopher.id}
                onToggle={() => toggle(philosopher.id)}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </main>
  );
}
