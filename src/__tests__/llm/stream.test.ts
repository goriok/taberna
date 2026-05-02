import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { streamPhilosopherResponse, getPhilosopherModel } from "@/lib/llm";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { PhilosopherConfig } from "@/types/philosopher";

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    streamText: vi.fn(),
  };
});

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() =>
    vi.fn((modelId: string) => ({
      __provider: "litellm",
      modelId,
    }))
  ),
}));

const mockStreamText = vi.mocked(streamText);
const mockCreateOpenAI = vi.mocked(createOpenAI);

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

function createPhilosopher(
  overrides: Partial<PhilosopherConfig> = {}
): PhilosopherConfig {
  return {
    id: "test",
    name: "Test Philosopher",
    shortName: "Test",
    era: "Test",
    corePhilosophy: "Test",
    keyConcepts: [],
    method: "Test",
    vocabulary: [],
    writingStyle: "Test",
    quirks: "Test",
    antiPatterns: [],
    model: "claude-sonnet-4-5",
    systemPrompt: "You are a test philosopher.",
    ...overrides,
  };
}

describe("getPhilosopherModel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns litellm provider with model name", () => {
    const config = createPhilosopher({ model: "claude-sonnet-4-5" });
    const model = getPhilosopherModel(config);
    expect(model).toEqual({ __provider: "litellm", modelId: "claude-sonnet-4-5" });
  });

  it("returns litellm provider for gpt-4o-mini", () => {
    const config = createPhilosopher({ model: "gpt-4o-mini" });
    const model = getPhilosopherModel(config);
    expect(model).toEqual({ __provider: "litellm", modelId: "gpt-4o-mini" });
  });

  it("defaults to litellm with the config model as-is", () => {
    const config = createPhilosopher({ model: "unknown-model" });
    const model = getPhilosopherModel(config);
    expect(model).toEqual({ __provider: "litellm", modelId: "unknown-model" });
  });
});

describe("streamPhilosopherResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStreamText.mockImplementation(() =>
      Promise.resolve(createMockStreamTextResult(["Hello", " world"])) as unknown as ReturnType<typeof streamText>
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("yields token chunks for valid input", async () => {
    const config = createPhilosopher();
    const gen = streamPhilosopherResponse(config, "test context");
    const results = [];
    for await (const result of gen) {
      results.push(result);
    }

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ content: "Hello", finishReason: "unknown" });
    expect(results[1]).toEqual({ content: " world", finishReason: "unknown" });
    expect(results[2]).toEqual({ content: "Hello world", finishReason: "stop" });
  });

  it("passes correct arguments to streamText", async () => {
    const config = createPhilosopher();
    const gen = streamPhilosopherResponse(config, "test context");
    for await (const _ of gen) {
      void 0;
    }

    expect(mockStreamText).toHaveBeenCalledTimes(1);
    const call = mockStreamText.mock.calls[0]![0] as {
      model: unknown;
      system: string;
      prompt: string;
      abortSignal: AbortSignal;
    };
    expect(call.system).toBe(config.systemPrompt);
    expect(call.prompt).toBe("test context");
    expect(call.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("yields error on streamText failure", async () => {
    mockStreamText.mockImplementation(() => Promise.reject(new Error("API key invalid")) as unknown as ReturnType<typeof streamText>);
    const config = createPhilosopher();
    const gen = streamPhilosopherResponse(config, "test context");
    const results = [];
    for await (const result of gen) {
      results.push(result);
    }

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      content: "meditando em silêncio...",
      finishReason: "error",
    });
  });

  it("yields error on rate limit failure", async () => {
    mockStreamText.mockImplementation(() => Promise.reject(new Error("Rate limit exceeded")) as unknown as ReturnType<typeof streamText>);
    const config = createPhilosopher();
    const gen = streamPhilosopherResponse(config, "test context");
    const results = [];
    for await (const result of gen) {
      results.push(result);
    }

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      content: "meditando em silêncio...",
      finishReason: "error",
    });
  });

  it("timeout triggers error event, not hang", async () => {
    vi.useFakeTimers();

    mockStreamText.mockImplementation(() => new Promise(() => {}) as unknown as ReturnType<typeof streamText>);

    const config = createPhilosopher();
    const gen = streamPhilosopherResponse(config, "test context");

    const promise = (async () => {
      const results = [];
      for await (const result of gen) {
        results.push(result);
      }
      return results;
    })();

    vi.advanceTimersByTime(61000);

    const results = await promise;

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      content: "meditando em silêncio...",
      finishReason: "error",
    });
  });
});
