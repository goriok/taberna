"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { DecorativeDivider } from "./DecorativeDivider";

interface InterventionAreaProps {
  onContinue: (text: string) => void;
  onEnd: (text: string) => void;
  round: number;
  disabled?: boolean;
}

export function InterventionArea({ onContinue, onEnd, round, disabled }: InterventionAreaProps) {
  const [text, setText] = useState("");

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
        Round {round} encerrado
      </h3>
      <p className="mb-4 text-center font-sans text-sm text-text/60">
        Adicione uma reflexão ou deixe em branco para continuar o debate.
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
        <div className="flex flex-col gap-3 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={() => onEnd(text)}
            disabled={disabled}
            className="min-h-[44px] rounded-md border border-card-border px-6 py-3 font-sans text-sm font-semibold text-text/60 transition-colors hover:border-burgundy hover:text-burgundy disabled:cursor-not-allowed disabled:opacity-50"
          >
            Encerrar e ver conclusão
          </button>
          <button
            type="button"
            onClick={() => onContinue(text)}
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
