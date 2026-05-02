"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { DecorativeDivider } from "./DecorativeDivider";

interface InterventionAreaProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export function InterventionArea({ onSubmit, disabled }: InterventionAreaProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length === 0 || disabled) return;
    onSubmit(text.trim());
    setText("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mx-auto mt-10 max-w-2xl"
      data-testid="intervention-area"
    >
      <DecorativeDivider className="mb-6" />

      <h3 className="mb-3 text-center font-serif text-xl text-primary">
        Sua vez de falar
      </h3>
      <p className="mb-4 text-center font-sans text-sm text-text/70">
        Os filósofos aguardam sua contribuição para a última rodada.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Compartilhe sua reflexão, questionamento ou argumento..."
          rows={4}
          disabled={disabled}
          className="w-full resize-none rounded-md border border-card-border bg-card p-4 font-sans text-base leading-relaxed text-text shadow-sm outline-none transition-colors placeholder:text-text/30 focus:border-accent focus:shadow-gold disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={disabled || text.trim().length === 0}
          className="btn-cta min-h-[44px] w-full rounded-md px-6 py-3 font-sans text-sm md:w-auto md:self-end"
        >
          {disabled ? "Enviando..." : "Intervir no Debate"}
        </button>
      </form>
    </motion.div>
  );
}
