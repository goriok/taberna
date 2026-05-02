"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhilosopherConfig } from "@/types/philosopher";
import { DecorativeDivider } from "./DecorativeDivider";

const MAX_GUESTS = 5;

interface InterventionAreaProps {
  onContinue: (text: string, activeIds: string[]) => void;
  onEnd: (text: string, activeIds: string[]) => void;
  round: number;
  disabled?: boolean;
  allPhilosophers: PhilosopherConfig[];
  activeIds: string[];
}

export function InterventionArea({ onContinue, onEnd, round, disabled, allPhilosophers, activeIds: initialActiveIds }: InterventionAreaProps) {
  const [text, setText] = useState("");
  const [localActiveIds, setLocalActiveIds] = useState<string[]>(initialActiveIds);
  const [tableOpen, setTableOpen] = useState(false);

  const togglePhilosopher = (id: string) => {
    setLocalActiveIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // mínimo 1
        return prev.filter((i) => i !== id);
      }
      if (prev.length >= MAX_GUESTS) return prev; // máximo 3
      return [...prev, id];
    });
  };

  const tableChanged = localActiveIds.slice().sort().join(",") !== initialActiveIds.slice().sort().join(",");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mx-auto mt-10 max-w-2xl"
      data-testid="intervention-area"
    >
      <DecorativeDivider className="mb-6" />

      <h3 className="mb-2 text-center font-serif text-xl text-primary">
        {round === 1 ? "A primeira taça foi servida" : `A ${round}ª taça foi servida`}
      </h3>
      <p className="mb-4 text-center font-sans text-sm text-text/60">
        {round === 1
          ? "Os filósofos ouviram seu dilema. Tem algo a acrescentar antes da próxima rodada?"
          : "A taça passa novamente. Uma palavra sua, ou deixe que a conversa siga."}
      </p>

      <div className="flex flex-col gap-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Sua reflexão, questionamento ou argumento... (opcional)"
          rows={3}
          disabled={disabled}
          className="w-full resize-none rounded-md border border-card-border bg-card p-4 font-sans text-base leading-relaxed text-text shadow-sm outline-none transition-colors placeholder:text-text/30 focus:border-accent focus:shadow-gold disabled:opacity-60"
        />

        {/* Table management */}
        <div className="rounded-md border border-card-border bg-card">
          <button
            type="button"
            onClick={() => setTableOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:border-accent/40"
          >
            <div className="flex items-center gap-2">
              <span className="font-sans text-xs text-text/40 uppercase tracking-widest">Mesa</span>
              {tableChanged && (
                <span className="font-sans text-xs text-accent">· alterada</span>
              )}
            </div>
            <span
              className="text-text/30 transition-transform duration-200"
              style={{ transform: tableOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            >▾</span>
          </button>

          <AnimatePresence initial={false}>
            {tableOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="border-t border-card-border/50 px-4 pb-4 pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-sans text-xs text-text/30">Quem participa da próxima taça</span>
                    <span className="font-sans text-xs text-text/30">{localActiveIds.length}/{MAX_GUESTS}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {allPhilosophers.map((p) => {
                      const isActive = localActiveIds.includes(p.id);
                      const isBlocked = !isActive && localActiveIds.length >= MAX_GUESTS;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => togglePhilosopher(p.id)}
                          disabled={isBlocked || disabled}
                          title={isBlocked ? `Máximo ${MAX_GUESTS} à mesa` : undefined}
                          className={`flex flex-col gap-0.5 rounded-md border px-3 py-2 text-left transition-all ${
                            isActive
                              ? "border-accent bg-accent/10"
                              : isBlocked
                                ? "cursor-not-allowed border-card-border opacity-25"
                                : "border-card-border opacity-50 hover:border-accent/50 hover:opacity-80"
                          }`}
                        >
                          <span className="font-serif text-sm font-semibold text-text leading-tight">{p.shortName}</span>
                          <span className="font-sans text-xs text-text/40 leading-tight">{p.era.split(",")[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={() => onEnd(text, localActiveIds)}
            disabled={disabled}
            className="min-h-[44px] rounded-md border border-card-border px-6 py-3 font-sans text-sm font-semibold text-text/60 transition-colors hover:border-burgundy hover:text-burgundy disabled:cursor-not-allowed disabled:opacity-50"
          >
            Encerrar e ver conclusão
          </button>
          <button
            type="button"
            onClick={() => onContinue(text, localActiveIds)}
            disabled={disabled}
            className="btn-cta min-h-[44px] rounded-md px-6 py-3 font-sans text-sm"
          >
            {disabled ? "Aguardando..." : "Continuar debate →"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
