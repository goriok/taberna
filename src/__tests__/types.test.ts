import { describe, it, expect } from "vitest";
import {
  DEBATE_PHASES,
  DebateRequestSchema,
  SummaryGenerateRequestSchema,
} from "@/types";

describe("DebateRequestSchema", () => {
  it("validates a correct dilemma (min 10 chars)", () => {
    const result = DebateRequestSchema.safeParse({
      dilemma: "Is free will an illusion?",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty dilemma", () => {
    const result = DebateRequestSchema.safeParse({ dilemma: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a dilemma shorter than 10 characters", () => {
    const result = DebateRequestSchema.safeParse({ dilemma: "Short" });
    expect(result.success).toBe(false);
  });

  it("rejects a dilemma longer than 500 characters", () => {
    const result = DebateRequestSchema.safeParse({
      dilemma: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a dilemma at exactly 500 characters", () => {
    const result = DebateRequestSchema.safeParse({
      dilemma: "x".repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional valid UUID sessionId", () => {
    const result = DebateRequestSchema.safeParse({
      dilemma: "Is free will an illusion?",
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID sessionId", () => {
    const result = DebateRequestSchema.safeParse({
      dilemma: "Is free will an illusion?",
      sessionId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});

describe("DebatePhase", () => {
  it("has exactly 7 members", () => {
    expect(DEBATE_PHASES).toHaveLength(7);
  });

  it("includes all expected phases in order", () => {
    expect(DEBATE_PHASES).toEqual([
      "idle",
      "round1",
      "round2",
      "user-intervention",
      "round3",
      "summary",
      "complete",
    ]);
  });
});

describe("SummaryGenerateRequestSchema", () => {
  it("validates correct input with sessionId only", () => {
    const result = SummaryGenerateRequestSchema.safeParse({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("validates correct input with philosopherResponses", () => {
    const result = SummaryGenerateRequestSchema.safeParse({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      philosopherResponses: [{ someData: "test" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing sessionId", () => {
    const result = SummaryGenerateRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid sessionId", () => {
    const result = SummaryGenerateRequestSchema.safeParse({
      sessionId: "invalid",
    });
    expect(result.success).toBe(false);
  });
});
