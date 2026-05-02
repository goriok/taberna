"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhilosopherConfig } from "@/types/philosopher";

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
      next.add(id);
    }
    onChange(next);
  };

  const allSelected = selected.size === philosophers.length;

  const toggleAll = () => {
    if (allSelected) {
      // keep only first
      onChange(new Set([philosophers[0]!.id]));
    } else {
      onChange(new Set(philosophers.map((p) => p.id)));
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
              {/* Select all */}
              <button
                type="button"
                onClick={toggleAll}
                className="mb-3 font-sans text-xs text-text/40 underline-offset-2 hover:text-accent hover:underline"
              >
                {allSelected ? "Desconvidar todos" : "Convidar todos"}
              </button>

              {/* Grid of philosophers */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {philosophers.map((p) => {
                  const isSelected = selected.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggle(p.id)}
                      className={`flex flex-col gap-0.5 rounded-md border px-3 py-2 text-left transition-all ${
                        isSelected
                          ? "border-accent bg-accent/10 shadow-gold"
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
