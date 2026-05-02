import { z } from "zod";

export const DEBATE_PHASES = [
  "idle",
  "debating",
  "user-intervention",
  "summary",
  "complete",
] as const;

export type DebatePhase = (typeof DEBATE_PHASES)[number];

export const RESPONSE_STATUSES = ["streaming", "complete", "error"] as const;

export type ResponseStatus = (typeof RESPONSE_STATUSES)[number];

export interface PhilosopherResponse {
  philosopherName: string;
  round: number;
  content: string;
  status: ResponseStatus;
}

export interface DebateState {
  phase: DebatePhase;
  responses: PhilosopherResponse[];
  /** user text keyed by the round after which they intervened */
  userInterventions: Record<number, string>;
  currentRound: number;
  summary: string | null;
  dilemma: string;
  sessionId: string;
}

export const DebateRequestSchema = z.object({
  dilemma: z.string().min(10),
  sessionId: z.string().uuid().optional(),
});

export type DebateRequest = z.infer<typeof DebateRequestSchema>;

export type DebateEvent =
  | { type: "philosopher-start"; philosopherName: string; round: number }
  | { type: "philosopher-chunk"; philosopherName: string; round: number; chunk: string }
  | { type: "philosopher-complete"; philosopherName: string; round: number; content: string }
  | { type: "philosopher-error"; philosopherName: string; round: number; error: string }
  | { type: "round-complete"; round: number }
  | { type: "user-intervention" }
  | { type: "debate-complete"; summary: string }
  | { type: "summary"; content: string };
