import { describe, it, expect, vi, beforeEach } from "vitest";
import { debateOrchestrator, selectNextSpeaker } from "@/lib/debate";
import { streamText, generateText } from "ai";
import type { PhilosopherConfig } from "@/types/philosopher";

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    streamText: vi.fn(),
    generateText: vi.fn(),
  };
});

vi.mock("@/lib/llm/provider", () => ({
  litellm: vi.fn((modelId: string) => ({ __provider: "litellm", modelId })),
}));

const mockStreamText = vi.mocked(streamText);
const mockGenerateText = vi.mocked(generateText);

function createMockStreamTextResult(chunks: string[]) {
  return {
    textStream: (async function* () {
      for (const chunk of chunks) {
        yield chunk;
      }
    })(),
    text: Promise.resolve(chunks.join("")),
  } as unknown as Awaited<ReturnType<typeof streamText>>;
}

function createPhilosopher(id: string, name: string): PhilosopherConfig {
  return {
    id,
    name,
    shortName: name,
    era: "Test",
    corePhilosophy: "Test philosophy",
    keyConcepts: [],
    method: "Test",
    vocabulary: [],
    writingStyle: "Test",
    quirks: "Test",
    antiPatterns: [],
    model: "gpt-4o",
    systemPrompt: `You are ${name}.`,
  };
}

const testPhilosophers = [
  createPhilosopher("p1", "Philosopher 1"),
  createPhilosopher("p2", "Philosopher 2"),
  createPhilosopher("p3", "Philosopher 3"),
  createPhilosopher("p4", "Philosopher 4"),
  createPhilosopher("p5", "Philosopher 5"),
  createPhilosopher("p6", "Philosopher 6"),
  createPhilosopher("p7", "Philosopher 7"),
];

describe("debateOrchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStreamText.mockImplementation(() =>
      Promise.resolve(createMockStreamTextResult(["Hello", " world"])) as unknown as ReturnType<typeof streamText>
    );
    mockGenerateText.mockResolvedValue({
      text: testPhilosophers[0]!.id,
    } as Awaited<ReturnType<typeof generateText>>);
  });

  it("rejects empty dilemma", async () => {
    const gen = debateOrchestrator("", testPhilosophers, "test-session");
    await expect(gen.next()).rejects.toThrow("Dilemma cannot be empty");
  });

  it("rejects whitespace-only dilemma", async () => {
    const gen = debateOrchestrator("   ", testPhilosophers, "test-session");
    await expect(gen.next()).rejects.toThrow("Dilemma cannot be empty");
  });

  it("yields at least 7 philosopher-start events in round 1", async () => {
    const gen = debateOrchestrator(
      "Is free will real?",
      testPhilosophers,
      "test"
    );
    const events = [];
    for await (const event of gen) {
      events.push(event);
    }

    const starts = events.filter(
      (e) => e.type === "philosopher-start" && e.round === 1
    );
    expect(starts.length).toBe(7);
  });

  it("round 2 begins only after all round 1 responses complete", async () => {
    const gen = debateOrchestrator(
      "Is free will real?",
      testPhilosophers,
      "test"
    );
    let sawRound1Complete = false;
    let round2StartedBeforeComplete = false;

    for await (const event of gen) {
      if (event.type === "round-complete" && event.round === 1) {
        sawRound1Complete = true;
      }
      if (event.type === "philosopher-start" && event.round === 2) {
        if (!sawRound1Complete) {
          round2StartedBeforeComplete = true;
        }
      }
    }

    expect(sawRound1Complete).toBe(true);
    expect(round2StartedBeforeComplete).toBe(false);
  });

  it("yields user-intervention event between round 2 and round 3", async () => {
    const gen = debateOrchestrator(
      "Is free will real?",
      testPhilosophers,
      "test"
    );
    let sawUserIntervention = false;
    let round2CompleteBeforeIntervention = false;
    let round3StartedAfterIntervention = false;

    for await (const event of gen) {
      if (event.type === "round-complete" && event.round === 2) {
        round2CompleteBeforeIntervention = true;
      }
      if (event.type === "user-intervention") {
        sawUserIntervention = true;
      }
      if (event.type === "philosopher-start" && event.round === 3) {
        if (sawUserIntervention) {
          round3StartedAfterIntervention = true;
        }
      }
    }

    expect(round2CompleteBeforeIntervention).toBe(true);
    expect(sawUserIntervention).toBe(true);
    expect(round3StartedAfterIntervention).toBe(true);
  });

  it("user intervention text appears in round 3 philosopher contexts", async () => {
    const gen = debateOrchestrator(
      "Is free will real?",
      testPhilosophers,
      "test"
    );
    let userInterventionYielded = false;

    let result = await gen.next();
    while (!result.done) {
      if (result.value.type === "user-intervention") {
        result = await gen.next("User says free will is an illusion");
        userInterventionYielded = true;
        continue;
      }
      result = await gen.next();
    }

    expect(userInterventionYielded).toBe(true);

    const round3Calls = mockStreamText.mock.calls.filter((call) => {
      const opts = call[0] as { prompt: string };
      return opts.prompt.includes("User says free will is an illusion");
    });
    expect(round3Calls.length).toBe(7);
  });

  it("if 1 philosopher fails, 6 continue in round 1", async () => {
    let shouldFail = true;
    mockStreamText.mockImplementation((async () => {
      if (shouldFail) {
        shouldFail = false;
        throw new Error("API error");
      }
      return createMockStreamTextResult(["Response"]);
    }) as unknown as typeof mockStreamText);

    const gen = debateOrchestrator(
      "Is free will real?",
      testPhilosophers,
      "test"
    );
    const events = [];
    for await (const event of gen) {
      events.push(event);
    }

    const errors = events.filter(
      (e) => e.type === "philosopher-error" && e.round === 1
    );
    const completes = events.filter(
      (e) => e.type === "philosopher-complete" && e.round === 1
    );

    expect(errors.length).toBe(1);
    expect(completes.length).toBe(6);
  });

  it("yields philosopher-chunk events for each philosopher", async () => {
    const gen = debateOrchestrator(
      "Is free will real?",
      testPhilosophers,
      "test"
    );
    const events = [];
    for await (const event of gen) {
      events.push(event);
    }

    const chunks = events.filter(
      (e) => e.type === "philosopher-chunk" && e.round === 1
    );
    expect(chunks.length).toBeGreaterThanOrEqual(7);
  });

  it("yields debate-complete at the end", async () => {
    const gen = debateOrchestrator(
      "Is free will real?",
      testPhilosophers,
      "test"
    );
    const events = [];
    for await (const event of gen) {
      events.push(event);
    }

    const lastEvent = events[events.length - 1];
    expect(lastEvent).toEqual({ type: "debate-complete", summary: "" });
  });

  it("yields round-complete for all three rounds", async () => {
    const gen = debateOrchestrator(
      "Is free will real?",
      testPhilosophers,
      "test"
    );
    const events = [];
    for await (const event of gen) {
      events.push(event);
    }

    const roundCompletes = events.filter((e) => e.type === "round-complete");
    expect(roundCompletes.map((e) => e.round)).toEqual([1, 2, 3]);
  });

  it("round 2 is sequential (one philosopher at a time)", async () => {
    const gen = debateOrchestrator(
      "Is free will real?",
      testPhilosophers,
      "test"
    );
    const events = [];
    for await (const event of gen) {
      events.push(event);
    }

    const round2Starts = events
      .filter((e): e is Extract<typeof e, { type: "philosopher-start" }> => e.type === "philosopher-start" && e.round === 2)
      .map((e) => e.philosopherName);

    expect(new Set(round2Starts).size).toBe(7);
    expect(round2Starts.length).toBe(7);
  });

  it("round 3 is parallel (all 7 start)", async () => {
    const gen = debateOrchestrator(
      "Is free will real?",
      testPhilosophers,
      "test"
    );
    const events = [];
    for await (const event of gen) {
      events.push(event);
    }

    const round3Starts = events.filter(
      (e) => e.type === "philosopher-start" && e.round === 3
    );
    expect(round3Starts.length).toBe(7);
  });

  it("uses philosopher system prompts in streamText calls", async () => {
    const gen = debateOrchestrator(
      "Is free will real?",
      testPhilosophers,
      "test"
    );
    for await (const _ of gen) {
      void 0;
    }

    for (const p of testPhilosophers) {
      const calls = mockStreamText.mock.calls.filter((call) => {
        const opts = call[0] as { system: string };
        return opts.system === p.systemPrompt;
      });
      expect(calls.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("selectNextSpeaker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the only remaining philosopher", async () => {
    const result = await selectNextSpeaker("context", [testPhilosophers[0]!]);
    expect(result.id).toBe(testPhilosophers[0]!.id);
  });

  it("throws when no philosophers remain", async () => {
    await expect(selectNextSpeaker("context", [])).rejects.toThrow(
      "No philosophers remaining"
    );
  });

  it("uses generateText with gemini-flash-lite-3", async () => {
    mockGenerateText.mockResolvedValue({
      text: testPhilosophers[1]!.id,
    } as Awaited<ReturnType<typeof generateText>>);

    const result = await selectNextSpeaker("context", testPhilosophers);
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.objectContaining({ __provider: "litellm", modelId: "gemini-flash-lite-3" }),
      })
    );
    expect(result.id).toBe(testPhilosophers[1]!.id);
  });

  it("falls back to first philosopher on API error", async () => {
    mockGenerateText.mockRejectedValue(new Error("API error"));
    const result = await selectNextSpeaker("context", testPhilosophers);
    expect(result.id).toBe(testPhilosophers[0]!.id);
  });

  it("falls back to first philosopher on invalid ID", async () => {
    mockGenerateText.mockResolvedValue({
      text: "invalid-id",
    } as Awaited<ReturnType<typeof generateText>>);
    const result = await selectNextSpeaker("context", testPhilosophers);
    expect(result.id).toBe(testPhilosophers[0]!.id);
  });

  it("prompt includes context and philosopher list", async () => {
    mockGenerateText.mockResolvedValue({
      text: testPhilosophers[0]!.id,
    } as Awaited<ReturnType<typeof generateText>>);

    await selectNextSpeaker("debate context", testPhilosophers);

    const call = mockGenerateText.mock.calls[0];
    const opts = call![0] as { prompt: string };
    expect(opts.prompt).toContain("debate context");
    expect(opts.prompt).toContain(testPhilosophers[0]!.id);
    expect(opts.prompt).toContain(testPhilosophers[0]!.name);
  });
});
