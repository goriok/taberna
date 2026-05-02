"use client";

import React, { useCallback, useEffect, useReducer, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DebateState, PhilosopherResponse, TableEvent } from "@/types/debate";
import { philosophers } from "@/philosophers";
import { DecorativeDivider } from "@/components/DecorativeDivider";
import { DebateGrid } from "@/components/DebateGrid";
import { GuestList } from "@/components/GuestList";
import { InterventionArea } from "@/components/InterventionArea";
import { SummaryDisplay } from "@/components/SummaryDisplay";
import { ThemeToggle } from "@/components/ThemeToggle";

const MIN_DILEMMA_LENGTH = 10;
const SESSION_KEY = "taberna-session";

const initialState: DebateState = {
  phase: "idle",
  responses: [],
  userInterventions: {},
  currentRound: 1,
  summary: null,
  dilemma: "",
  sessionId: "",
  activePhilosopherIds: [],
  tableEvents: [],
};

function loadPersistedState(): DebateState {
  if (typeof window === "undefined") return initialState;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return initialState;
    const saved = JSON.parse(raw) as Partial<DebateState>;

    // Only restore completed responses — drop any streaming/partial ones
    const responses = (saved.responses ?? []).filter(
      (r) => r.status === "complete"
    );

    // Sanitize phase:
    // - complete with summary → restore as complete
    // - debating/user-intervention with responses → restore as user-intervention so user can continue or end
    // - anything else → idle
    let phase: DebateState["phase"] = "idle";
    if (saved.phase === "complete" && saved.summary) {
      phase = "complete";
    } else if (
      (saved.phase === "debating" || saved.phase === "user-intervention") &&
      responses.length > 0
    ) {
      phase = "user-intervention";
    }

    if (phase === "idle") return initialState;

    return {
      phase,
      responses,
      userInterventions: saved.userInterventions ?? {},
      currentRound: saved.currentRound ?? 1,
      summary: saved.summary ?? null,
      dilemma: saved.dilemma ?? "",
      sessionId: saved.sessionId ?? "",
      activePhilosopherIds: saved.activePhilosopherIds ?? [],
      tableEvents: saved.tableEvents ?? [],
    };
  } catch {
    return initialState;
  }
}

function persistState(state: DebateState) {
  try {
    // Don't persist transient streaming state — only complete responses
    const toSave: DebateState = {
      ...state,
      responses: state.responses.filter((r) => r.status === "complete"),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(toSave));
  } catch { /* ignore */ }
}

function clearPersistedState() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

type Action =
  | { type: "SUBMIT_DILEMMA"; dilemma: string; sessionId: string; activePhilosopherIds: string[] }
  | { type: "PHILOSOPHER_START"; philosopherName: string; round: number }
  | { type: "PHILOSOPHER_CHUNK"; philosopherName: string; round: number; chunk: string }
  | { type: "PHILOSOPHER_COMPLETE"; philosopherName: string; round: number; content: string }
  | { type: "PHILOSOPHER_ERROR"; philosopherName: string; round: number; error: string }
  | { type: "ROUND_COMPLETE"; round: number }
  | { type: "WAITING_FOR_USER" }
  | { type: "USER_INTERVENED"; round: number; text: string; activePhilosopherIds: string[] }
  | { type: "PHILOSOPHER_STATUS"; philosopherName: string; status: "left" | "joined"; message: string }
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
        phase: "debating",
        dilemma: action.dilemma,
        sessionId: action.sessionId,
        responses: [],
        userInterventions: {},
        currentRound: 1,
        summary: null,
        activePhilosopherIds: action.activePhilosopherIds,
      };

    case "PHILOSOPHER_START": {
      const idx = findResponseIndex(state.responses, action.philosopherName, action.round);
      if (idx >= 0) {
        const updated = [...state.responses];
        updated[idx] = { ...updated[idx], status: "streaming" };
        return { ...state, responses: updated };
      }
      return {
        ...state,
        responses: [
          ...state.responses,
          { philosopherName: action.philosopherName, round: action.round, content: "", status: "streaming" },
        ],
      };
    }

    case "PHILOSOPHER_CHUNK": {
      const idx = findResponseIndex(state.responses, action.philosopherName, action.round);
      if (idx < 0) return state;
      const updated = [...state.responses];
      updated[idx] = { ...updated[idx], content: updated[idx].content + action.chunk };
      return { ...state, responses: updated };
    }

    case "PHILOSOPHER_COMPLETE": {
      const idx = findResponseIndex(state.responses, action.philosopherName, action.round);
      if (idx < 0) return state;
      const updated = [...state.responses];
      updated[idx] = { ...updated[idx], content: action.content, status: "complete" };
      return { ...state, responses: updated };
    }

    case "PHILOSOPHER_ERROR": {
      const idx = findResponseIndex(state.responses, action.philosopherName, action.round);
      if (idx < 0) return state;
      const updated = [...state.responses];
      updated[idx] = { ...updated[idx], status: "error" };
      return { ...state, responses: updated };
    }

    case "ROUND_COMPLETE":
      return { ...state, currentRound: action.round };

    case "WAITING_FOR_USER":
      return { ...state, phase: "user-intervention" };

    case "USER_INTERVENED":
      return {
        ...state,
        phase: "debating",
        activePhilosopherIds: action.activePhilosopherIds,
        userInterventions: action.text.trim()
          ? { ...state.userInterventions, [action.round]: action.text }
          : state.userInterventions,
      };

    case "PHILOSOPHER_STATUS":
      return {
        ...state,
        tableEvents: [
          ...state.tableEvents,
          { philosopherName: action.philosopherName, status: action.status, message: action.message, afterRound: state.currentRound },
        ],
      };

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
  const [state, dispatch] = useReducer(debateReducer, undefined, loadPersistedState);
  const [dilemmaInput, setDilemmaInput] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return "";
      const saved = JSON.parse(raw) as Partial<DebateState>;
      return saved.dilemma ?? "";
    } catch { return ""; }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set(philosophers.slice(0, 5).map((p) => p.id));
    try {
      const stored = localStorage.getItem("taberna-guests");
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        const valid = parsed.filter((id) => philosophers.some((p) => p.id === id)).slice(0, 5);
        if (valid.length > 0) return new Set(valid);
      }
    } catch { /* ignore */ }
    return new Set(philosophers.slice(0, 5).map((p) => p.id));
  });

  const handleGuestChange = (next: Set<string>) => {
    setSelectedIds(next);
    try { localStorage.setItem("taberna-guests", JSON.stringify([...next])); } catch { /* ignore */ }
  };

  // During idle: use selectedIds. During debate: use state.activePhilosopherIds
  const activePhilosophers = state.phase === "idle" || state.activePhilosopherIds.length === 0
    ? philosophers.filter((p) => selectedIds.has(p.id))
    : philosophers.filter((p) => state.activePhilosopherIds.includes(p.id));

  // All philosophers ever seen in this debate (for the table manager)
  const debatePhilosophers = state.phase === "idle"
    ? philosophers.filter((p) => selectedIds.has(p.id))
    : philosophers.filter((p) => {
        const everSpoke = state.responses.some((r) => r.philosopherName === p.name);
        const isActive = state.activePhilosopherIds.includes(p.id);
        return everSpoke || isActive || selectedIds.has(p.id);
      });

  // Persist state on every change (skip idle — nothing to restore)
  useEffect(() => {
    if (state.phase === "idle") {
      clearPersistedState();
    } else {
      persistState(state);
    }
  }, [state]);

  const consumeSSE = useCallback(async (response: Response) => {
    const reader = response.body?.getReader();
    if (!reader) {
      setIsLoading(false);
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let pausedForUser = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (!pausedForUser) dispatch({ type: "DEBATE_COMPLETE" });
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
                dispatch({ type: "PHILOSOPHER_START", philosopherName: parsed.philosopherName, round: parsed.round });
                break;
              case "philosopher-chunk":
                dispatch({ type: "PHILOSOPHER_CHUNK", philosopherName: parsed.philosopherName, round: parsed.round, chunk: parsed.chunk });
                break;
              case "philosopher-complete":
                dispatch({ type: "PHILOSOPHER_COMPLETE", philosopherName: parsed.philosopherName, round: parsed.round, content: parsed.content });
                break;
              case "philosopher-error":
                dispatch({ type: "PHILOSOPHER_ERROR", philosopherName: parsed.philosopherName, round: parsed.round, error: parsed.error });
                break;
              case "round-complete":
                dispatch({ type: "ROUND_COMPLETE", round: parsed.round });
                break;
              case "waiting-for-user":
                pausedForUser = true;
                dispatch({ type: "WAITING_FOR_USER" });
                break;
              case "philosopher-status":
                dispatch({ type: "PHILOSOPHER_STATUS", philosopherName: parsed.philosopherName, status: parsed.status, message: parsed.message });
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
  }, []);

  const handleSubmitDilemma = async () => {
    if (dilemmaInput.length < MIN_DILEMMA_LENGTH) return;

    const sessionId = generateSessionId();
    const ids = [...selectedIds];
    dispatch({ type: "SUBMIT_DILEMMA", dilemma: dilemmaInput, sessionId, activePhilosopherIds: ids });
    setIsLoading(true);

    try {
      const response = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dilemma: dilemmaInput, sessionId, philosopherIds: ids }),
      });
      if (!response.ok) { setIsLoading(false); return; }
      await consumeSSE(response);
    } catch {
      setIsLoading(false);
    }
  };

  const handleIntervention = async (text: string, end: boolean, activeIds: string[]) => {
    if (!state.sessionId) return;

    dispatch({ type: "USER_INTERVENED", round: state.currentRound, text, activePhilosopherIds: activeIds });
    setIsLoading(true);

    try {
      const response = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "intervene", sessionId: state.sessionId, text, end, philosopherIds: activeIds }),
      });
      if (!response.ok) { setIsLoading(false); return; }
      await consumeSSE(response);
    } catch {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (state.phase !== "summary" || !state.sessionId) return;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: state.sessionId,
            philosopherResponses: state.responses.filter((r) => r.status === "complete"),
          }),
        });
        if (cancelled || !response.ok) { setIsLoading(false); return; }
        const data = await response.json();
        if (!cancelled) {
          dispatch({ type: "SET_SUMMARY", content: data.content ?? "" });
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [state.phase, state.sessionId, state.responses]);

  const isSubmitDisabled = dilemmaInput.length < MIN_DILEMMA_LENGTH;
  const showGrid = state.phase === "debating" || state.phase === "user-intervention";

  return (
    <main className="flex min-h-full flex-col items-center px-4 py-8 md:px-6 md:py-10 lg:px-8 lg:py-12">
      <div className="w-full max-w-5xl">
        <header className="relative mb-8 text-center md:mb-10">
          <div className="absolute right-0 top-0 flex items-center gap-3">
            {state.phase !== "idle" && !isLoading && (
              <button
                type="button"
                onClick={() => {
                  setDilemmaInput("");
                  clearPersistedState();
                  dispatch({ type: "RESET" });
                }}
                className="font-sans text-xs text-text/30 transition-colors hover:text-burgundy"
              >
                Nova sessão
              </button>
            )}
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
          {state.phase === "idle" && (
            <motion.section
              key="input"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="mx-auto max-w-2xl"
            >
              <GuestList
                philosophers={philosophers}
                selected={selectedIds}
                onChange={handleGuestChange}
              />

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

              <div className="mt-2 flex items-center justify-end">
                <button
                  onClick={handleSubmitDilemma}
                  disabled={isSubmitDisabled || isLoading}
                  className="btn-cta min-h-[44px] rounded-md px-6 py-3 font-sans text-sm"
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
                  <blockquote className="break-words rounded-lg border-l-4 border-accent bg-card p-4 font-serif text-base italic text-accent-light shadow-sm md:p-5 md:text-lg">
                    &ldquo;{state.dilemma}&rdquo;
                  </blockquote>
                </div>
              )}

              <DebateGrid
                philosophers={debatePhilosophers}
                activeIds={state.activePhilosopherIds}
                responses={state.responses}
                currentRound={state.currentRound}
                tableEvents={state.tableEvents}
                isWaiting={isLoading && state.phase === "debating"}
              />

              {state.phase === "user-intervention" && (
                <InterventionArea
                  onContinue={(text, ids) => handleIntervention(text, false, ids)}
                  onEnd={(text, ids) => handleIntervention(text, true, ids)}
                  round={state.currentRound}
                  disabled={isLoading}
                  allPhilosophers={philosophers}
                  activeIds={state.activePhilosopherIds}
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
                  clearPersistedState();
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
