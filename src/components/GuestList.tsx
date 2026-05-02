"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhilosopherConfig } from "@/types/philosopher";

const MAX_GUESTS = 3;

interface GuestListProps {
  philosophers: PhilosopherConfig[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
}

export function GuestList({ philosophers, selected, onChange }: GuestListProps) {
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      if (next.size === 1) return; // mínimo 1
      next.delete(id);
    } else {
      if (next.size >= MAX_GUESTS) return; // máximo 3
      next.add(id);
    }
    onChange(next);
  };

  const allSelected = selected.size === philosophers.length;

  const toggleAll = () => {
    if (allSelected || selected.size >= MAX_GUESTS) {
      onChange(new Set([philosophers[0]!.id]));
    } else {
      onChange(new Set(philosophers.slice(0, MAX_GUESTS).map((p) => p.id)));
    }
  };

  const label = selected.size === philosophers.length
    ? "Toda a taberna"
    : selected.size === 1
      ? `${philosophers.find((p) => p.id === [...selected][0])?.shortName ?? "1 filósofo"} sozinho`
      : `${selected.size} convidados`;

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-md border border-card-border bg-card px-4 py-2.5 text-left transition-colors hover:border-accent/60"
      >
        <div className="flex items-center gap-2">
          <span className="font-sans text-xs text-text/40 uppercase tracking-widest">Convidados</span>
          <span className="font-serif text-sm text-accent">{label}</span>
        </div>
        <span
          className="text-text/30 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          ▾
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="rounded-b-md border border-t-0 border-card-border bg-card px-4 pb-4 pt-3">
              {/* Select all / clear */}
              <div className="mb-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={toggleAll}
                  className="font-sans text-xs text-text/40 underline-offset-2 hover:text-accent hover:underline"
                >
                  {selected.size >= MAX_GUESTS || allSelected ? "Limpar seleção" : `Convidar ${MAX_GUESTS} primeiros`}
                </button>
                <span className="font-sans text-xs text-text/30">
                  {selected.size}/{MAX_GUESTS} à mesa
                </span>
              </div>

              {/* Grid of philosophers */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {philosophers.map((p) => {
                  const isSelected = selected.has(p.id);
                  const isBlocked = !isSelected && selected.size >= MAX_GUESTS;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggle(p.id)}
                      disabled={isBlocked}
                      title={isBlocked ? `Máximo ${MAX_GUESTS} filósofos por debate` : undefined}
                      className={`flex flex-col gap-0.5 rounded-md border px-3 py-2 text-left transition-all ${
                        isSelected
                          ? "border-accent bg-accent/10 shadow-gold"
                          : isBlocked
                            ? "cursor-not-allowed border-card-border opacity-25"
                            : "border-card-border opacity-50 hover:border-accent/50 hover:opacity-80"
                      }`}
                    >
                      <span className="font-serif text-sm font-semibold text-text leading-tight">
                        {p.shortName}
                      </span>
                      <span className="font-sans text-xs text-text/40 leading-tight">
                        {p.era.split(",")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
