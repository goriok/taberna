"use client";

import React, { useCallback, useEffect, useReducer, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DebateState, PhilosopherResponse } from "@/types/debate";
import { philosophers } from "@/philosophers";
import { DecorativeDivider } from "@/components/DecorativeDivider";
import { DebateGrid } from "@/components/DebateGrid";
import { InterventionArea } from "@/components/InterventionArea";
import { SummaryDisplay } from "@/components/SummaryDisplay";
import { ThemeToggle } from "@/components/ThemeToggle";

const MIN_DILEMMA_LENGTH = 10;
const MAX_DILEMMA_LENGTH = 500;

const initialState: DebateState = {
  phase: "idle",
  responses: [],
  summary: null,
  dilemma: "",
  sessionId: "",
};

type Action =
  | { type: "SUBMIT_DILEMMA"; dilemma: string; sessionId: string }
  | { type: "PHILOSOPHER_START"; philosopherName: string; round: number }
  | { type: "PHILOSOPHER_CHUNK"; philosopherName: string; round: number; chunk: string }
  | { type: "PHILOSOPHER_COMPLETE"; philosopherName: string; round: number; content: string }
  | { type: "PHILOSOPHER_ERROR"; philosopherName: string; round: number; error: string }
  | { type: "ROUND_COMPLETE"; round: number }
  | { type: "WAITING_FOR_USER" }
  | { type: "DEBATE_COMPLETE" }
  | { type: "SET_SUMMARY"; content: string }
  | { type: "RESET" };

function findResponseIndex(
  responses: PhilosopherResponse[],
  philosopherName: string,
  round: number,
): number {
  return responses.findIndex(
    (r) => r.philosopherName === philosopherName && r.round === round,
  );
}

function debateReducer(state: DebateState, action: Action): DebateState {
  switch (action.type) {
    case "SUBMIT_DILEMMA":
      return {
        ...state,
        phase: "round1",
        dilemma: action.dilemma,
        sessionId: action.sessionId,
        responses: [],
        summary: null,
      };

    case "PHILOSOPHER_START": {
      const idx = findResponseIndex(
        state.responses,
        action.philosopherName,
        action.round,
      );
      if (idx >= 0) {
        const updated = [...state.responses];
        updated[idx] = { ...updated[idx], status: "streaming" };
        return { ...state, responses: updated };
      }
      return {
        ...state,
        responses: [
          ...state.responses,
          {
            philosopherName: action.philosopherName,
            round: action.round,
            content: "",
            status: "streaming",
          },
        ],
      };
    }

    case "PHILOSOPHER_CHUNK": {
      const idx = findResponseIndex(
        state.responses,
        action.philosopherName,
        action.round,
      );
      if (idx < 0) return state;
      const updated = [...state.responses];
      updated[idx] = { ...updated[idx], content: updated[idx].content + action.chunk };
      return { ...state, responses: updated };
    }

    case "PHILOSOPHER_COMPLETE": {
      const idx = findResponseIndex(
        state.responses,
        action.philosopherName,
        action.round,
      );
      if (idx < 0) return state;
      const updated = [...state.responses];
      updated[idx] = {
        ...updated[idx],
        content: action.content,
        status: "complete",
      };
      return { ...state, responses: updated };
    }

    case "PHILOSOPHER_ERROR": {
      const idx = findResponseIndex(
        state.responses,
        action.philosopherName,
        action.round,
      );
      if (idx < 0) return state;
      const updated = [...state.responses];
      updated[idx] = { ...updated[idx], status: "error" };
      return { ...state, responses: updated };
    }

    case "ROUND_COMPLETE": {
      const nextPhase = action.round === 1 ? "round2" : state.phase;
      return { ...state, phase: nextPhase };
    }

    case "WAITING_FOR_USER":
      return { ...state, phase: "user-intervention" };

    case "DEBATE_COMPLETE":
      return { ...state, phase: "summary" };

    case "SET_SUMMARY":
      return { ...state, phase: "complete", summary: action.content };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

function generateSessionId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function Home() {
  const [state, dispatch] = useReducer(debateReducer, initialState);
  const [dilemmaInput, setDilemmaInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const consumeSSE = useCallback(
    async (response: Response, isIntervention: boolean) => {
      const reader = response.body?.getReader();
      if (!reader) {
        setIsLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (isIntervention) {
              dispatch({ type: "DEBATE_COMPLETE" });
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const eventText of events) {
            if (!eventText.trim()) continue;
            const dataMatch = eventText.match(/^data: (.+)$/m);
            if (!dataMatch) continue;

            try {
              const parsed = JSON.parse(dataMatch[1]);

              switch (parsed.type) {
                case "philosopher-start":
                  dispatch({
                    type: "PHILOSOPHER_START",
                    philosopherName: parsed.philosopherName,
                    round: parsed.round,
                  });
                  break;
                case "philosopher-chunk":
                  dispatch({
                    type: "PHILOSOPHER_CHUNK",
                    philosopherName: parsed.philosopherName,
                    round: parsed.round,
                    chunk: parsed.chunk,
                  });
                  break;
                case "philosopher-complete":
                  dispatch({
                    type: "PHILOSOPHER_COMPLETE",
                    philosopherName: parsed.philosopherName,
                    round: parsed.round,
                    content: parsed.content,
                  });
                  break;
                case "philosopher-error":
                  dispatch({
                    type: "PHILOSOPHER_ERROR",
                    philosopherName: parsed.philosopherName,
                    round: parsed.round,
                    error: parsed.error,
                  });
                  break;
                case "round-complete":
                  dispatch({ type: "ROUND_COMPLETE", round: parsed.round });
                  break;
                case "waiting-for-user":
                  dispatch({ type: "WAITING_FOR_USER" });
                  break;
                case "debate-complete":
                  dispatch({ type: "DEBATE_COMPLETE" });
                  break;
              }
            } catch {
              /* malformed SSE events are silently skipped */
            }
          }
        }
      } finally {
        reader.releaseLock();
        setIsLoading(false);
      }
    },
    [],
  );

  const handleSubmitDilemma = async () => {
    if (
      dilemmaInput.length < MIN_DILEMMA_LENGTH ||
      dilemmaInput.length > MAX_DILEMMA_LENGTH
    )
      return;

    const sessionId = generateSessionId();
    dispatch({ type: "SUBMIT_DILEMMA", dilemma: dilemmaInput, sessionId });
    setIsLoading(true);

    try {
      const response = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dilemma: dilemmaInput, sessionId }),
      });

      if (!response.ok) {
        setIsLoading(false);
        return;
      }

      await consumeSSE(response, false);
    } catch {
      setIsLoading(false);
    }
  };

  const handleIntervention = async (text: string) => {
    if (!state.sessionId || text.trim().length === 0) return;
    setIsLoading(true);

    try {
      const response = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "intervene",
          sessionId: state.sessionId,
          text,
        }),
      });

      if (!response.ok) {
        setIsLoading(false);
        return;
      }

      await consumeSSE(response, true);
    } catch {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (state.phase !== "summary" || !state.sessionId) return;

    let cancelled = false;

    const fetchSummary = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: state.sessionId,
            philosopherResponses: state.responses.filter(
              (r) => r.status === "complete",
            ),
          }),
        });

        if (cancelled) return;

        if (!response.ok) {
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        if (!cancelled) {
          dispatch({ type: "SET_SUMMARY", content: data.content ?? "" });
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchSummary();

    return () => {
      cancelled = true;
    };
  }, [state.phase, state.sessionId, state.responses]);

  const isSubmitDisabled =
    dilemmaInput.length < MIN_DILEMMA_LENGTH ||
    dilemmaInput.length > MAX_DILEMMA_LENGTH;

  const showGrid =
    state.phase === "round1" ||
    state.phase === "round2" ||
    state.phase === "round3" ||
    state.phase === "user-intervention";

  const showInput = state.phase === "idle";

  return (
    <main className="flex min-h-full flex-col items-center px-4 py-8 md:px-6 md:py-10 lg:px-8 lg:py-12">
      <div className="w-full max-w-5xl">
        <header className="relative mb-8 text-center md:mb-10">
          <div className="absolute right-0 top-0">
            <ThemeToggle />
          </div>
          <motion.h1
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="font-serif text-3xl font-bold tracking-tight text-primary md:text-4xl lg:text-5xl"
          >
            Taberna
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-2 font-sans text-base text-text/70"
          >
            Onde as ideias fluem como absinto e a sabedoria envelhece como vinho.
          </motion.p>
          <DecorativeDivider className="mx-auto mt-6 max-w-xs" />
        </header>

        <AnimatePresence mode="wait">
          {showInput && (
            <motion.section
              key="input"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="mx-auto max-w-2xl"
            >
              <label
                htmlFor="dilemma"
                className="mb-2 block text-center font-serif text-lg text-text"
              >
                Qual dilema traz à mesa esta noite?
              </label>

              <textarea
                id="dilemma"
                value={dilemmaInput}
                onChange={(e) => setDilemmaInput(e.target.value)}
                placeholder="Descreva seu dilema filosófico, moral ou existencial..."
                rows={6}
                disabled={isLoading}
                className="w-full resize-none rounded-md border border-card-border bg-card p-4 font-sans text-base leading-relaxed text-text shadow-sm outline-none transition-colors placeholder:text-text/30 focus:border-accent focus:shadow-gold disabled:opacity-60"
                data-testid="dilemma-input"
              />

              <div className="mt-2 flex items-center justify-between">
                <span
                  className={`font-sans text-xs ${
                    dilemmaInput.length > MAX_DILEMMA_LENGTH
                      ? "text-red-600"
                      : "text-text/60"
                  }`}
                  data-testid="char-counter"
                >
                  {dilemmaInput.length}/{MAX_DILEMMA_LENGTH}
                </span>

                <button
                  onClick={handleSubmitDilemma}
                  disabled={isSubmitDisabled || isLoading}
                  className="min-h-[44px] rounded-md bg-primary px-6 py-3 font-sans text-sm font-semibold text-text-light shadow-md transition-all hover:bg-primary-light hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="submit-dilemma"
                >
                  {isLoading ? "Convocando..." : "Oferecer aos Filósofos"}
                </button>
              </div>
            </motion.section>
          )}

          {showGrid && (
            <motion.section
              key="debate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {state.dilemma && (
                <div className="mx-auto mb-6 max-w-2xl md:mb-8">
                  <blockquote className="break-words rounded-lg border-l-4 border-accent bg-card p-4 font-serif text-base italic text-primary shadow-sm md:p-5 md:text-lg">
                    &ldquo;{state.dilemma}&rdquo;
                  </blockquote>
                </div>
              )}

              <DebateGrid
                philosophers={philosophers}
                responses={state.responses}
              />

              {state.phase === "user-intervention" && (
                <InterventionArea
                  onSubmit={handleIntervention}
                  disabled={isLoading}
                />
              )}
            </motion.section>
          )}

          {state.phase === "complete" && state.summary && (
            <motion.section
              key="summary"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <SummaryDisplay
                summary={state.summary}
                onReset={() => {
                  setDilemmaInput("");
                  dispatch({ type: "RESET" });
                }}
              />
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
