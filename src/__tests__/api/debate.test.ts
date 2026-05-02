import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DebateEvent } from "@/types/debate";
import type { PhilosopherConfig } from "@/types/philosopher";

const mockDebateOrchestrator = vi.hoisted(() => vi.fn());
const mockPrismaDebateSessionCreate = vi.hoisted(() => vi.fn());
const mockPrismaDebateSessionUpdate = vi.hoisted(() => vi.fn());
const mockPrismaPhilosopherRoundCreate = vi.hoisted(() => vi.fn());
const mockGetOrCreateSessionId = vi.hoisted(() => vi.fn());

vi.mock("@/lib/debate", () => ({
  debateOrchestrator: mockDebateOrchestrator,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    debateSession: {
      create: mockPrismaDebateSessionCreate,
      update: mockPrismaDebateSessionUpdate,
    },
    philosopherRound: {
      create: mockPrismaPhilosopherRoundCreate,
    },
  },
}));

vi.mock("@/lib/session", () => ({
  getOrCreateSessionId: mockGetOrCreateSessionId,
}));

vi.mock("@/philosophers", () => ({
  philosophers: [
    {
      id: "p1",
      name: "Test Philosopher",
      model: "test-model",
      systemPrompt: "test",
    },
  ] as PhilosopherConfig[],
}));

async function readSSE(response: Response): Promise<Array<DebateEvent | { type: "waiting-for-user" }>> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const events: Array<DebateEvent | { type: "waiting-for-user" }> = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const line = chunk.trim();
      if (line.startsWith("data: ")) {
        events.push(JSON.parse(line.slice(6)));
      }
    }
  }

  return events;
}

function createMockGenerator(
  events: DebateEvent[],
): AsyncGenerator<DebateEvent> {
  let index = 0;
  let pausedAtIntervention = false;

  return {
    async next(value?: string) {
      if (pausedAtIntervention) {
        pausedAtIntervention = false;
        index++;
      }

      if (index >= events.length) {
        return { done: true, value: undefined } as IteratorResult<DebateEvent>;
      }

      const event = events[index];

      if (event.type === "user-intervention") {
        pausedAtIntervention = true;
        return {
          done: false,
          value: event,
        } as IteratorResult<DebateEvent>;
      }

      const current = events[index++];
      return { done: false, value: current } as IteratorResult<DebateEvent>;
    },
    [Symbol.asyncIterator]() {
      return this;
    },
    return: async () => ({ done: true, value: undefined } as IteratorResult<DebateEvent>),
    throw: async () => ({ done: true, value: undefined } as IteratorResult<DebateEvent>),
    [Symbol.asyncDispose]: async () => {},
  };
}

describe("POST /api/debate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetOrCreateSessionId.mockReturnValue({
      sessionId: "test-session-id",
      responseHeaders: new Headers(),
    });
    mockPrismaDebateSessionCreate.mockResolvedValue({ id: "test-session-id" });
    mockPrismaDebateSessionUpdate.mockResolvedValue({ id: "test-session-id" });
    mockPrismaPhilosopherRoundCreate.mockResolvedValue({ id: "round-id" });
  });

  it("returns 400 for dilemma shorter than 10 characters", async () => {
    const { POST } = await import("@/app/api/debate/route");
    const request = new Request("http://localhost:3000/api/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dilemma: "short" }),
    });

    const response = await POST(request as unknown as import("next/server").NextRequest);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("O dilema deve ter pelo menos 10 caracteres");
  });

  it("returns 400 for empty dilemma", async () => {
    const { POST } = await import("@/app/api/debate/route");
    const request = new Request("http://localhost:3000/api/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dilemma: "" }),
    });

    const response = await POST(request as unknown as import("next/server").NextRequest);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("O dilema não pode estar vazio");
  });

  it("returns 400 for whitespace-only dilemma", async () => {
    const { POST } = await import("@/app/api/debate/route");
    const request = new Request("http://localhost:3000/api/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dilemma: "   \n\t  " }),
    });

    const response = await POST(request as unknown as import("next/server").NextRequest);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("O dilema não pode estar vazio");
  });

  it("returns 400 for dilemma longer than 500 characters with custom message", async () => {
    const { POST } = await import("@/app/api/debate/route");
    const request = new Request("http://localhost:3000/api/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dilemma: "a".repeat(501) }),
    });

    const response = await POST(request as unknown as import("next/server").NextRequest);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Dilema muito longo. Resuma em até 500 caracteres.");
  });

  it("returns 429 when session already has an active generator", async () => {
    const events: DebateEvent[] = [
      { type: "philosopher-start", philosopherName: "Test Philosopher", round: 1 },
      { type: "user-intervention" },
    ];

    mockDebateOrchestrator.mockReturnValue(createMockGenerator(events));

    const { POST } = await import("@/app/api/debate/route");

    const firstRequest = new Request("http://localhost:3000/api/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dilemma: "Is free will real?" }),
    });

    const firstResponse = await POST(firstRequest as unknown as import("next/server").NextRequest);
    expect(firstResponse.status).toBe(200);

    const secondRequest = new Request("http://localhost:3000/api/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dilemma: "Another dilemma here?" }),
    });

    const secondResponse = await POST(secondRequest as unknown as import("next/server").NextRequest);
    const body = await secondResponse.json();

    expect(secondResponse.status).toBe(429);
    expect(body.error).toBe("Aguardem — os filósofos ainda estão debatendo");
  });

  it("handles client abort signal gracefully", async () => {
    const events: DebateEvent[] = [
      { type: "philosopher-start", philosopherName: "Test Philosopher", round: 1 },
      { type: "philosopher-chunk", philosopherName: "Test Philosopher", round: 1, chunk: "Hello" },
      { type: "user-intervention" },
    ];

    mockDebateOrchestrator.mockReturnValue(createMockGenerator(events));

    const { POST } = await import("@/app/api/debate/route");

    const controller = new AbortController();
    const request = new Request("http://localhost:3000/api/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dilemma: "Is free will real?" }),
      signal: controller.signal,
    });

    const response = await POST(request as unknown as import("next/server").NextRequest);
    expect(response.status).toBe(200);

    controller.abort();

    const reader = response.body!.getReader();
    try {
      await reader.read();
    } catch {
      // Expected: stream may error on abort
    }
  });

  it("returns 400 for dilemma longer than 500 characters", async () => {
    const { POST } = await import("@/app/api/debate/route");
    const request = new Request("http://localhost:3000/api/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dilemma: "a".repeat(501) }),
    });

    const response = await POST(request as unknown as import("next/server").NextRequest);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Dilema muito longo. Resuma em até 500 caracteres.");
  });

  it("starts debate and streams SSE events for initial POST", async () => {
    const events: DebateEvent[] = [
      { type: "philosopher-start", philosopherName: "Test Philosopher", round: 1 },
      { type: "philosopher-chunk", philosopherName: "Test Philosopher", round: 1, chunk: "Hello" },
      { type: "philosopher-complete", philosopherName: "Test Philosopher", round: 1, content: "Hello world" },
      { type: "round-complete", round: 1 },
      { type: "user-intervention" },
    ];

    mockDebateOrchestrator.mockReturnValue(createMockGenerator(events));

    const { POST } = await import("@/app/api/debate/route");
    const request = new Request("http://localhost:3000/api/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dilemma: "Is free will real?" }),
    });

    const response = await POST(request as unknown as import("next/server").NextRequest);
    const sseEvents = await readSSE(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(sseEvents).toEqual([
      { type: "philosopher-start", philosopherName: "Test Philosopher", round: 1 },
      { type: "philosopher-chunk", philosopherName: "Test Philosopher", round: 1, chunk: "Hello" },
      { type: "philosopher-complete", philosopherName: "Test Philosopher", round: 1, content: "Hello world" },
      { type: "round-complete", round: 1 },
      { type: "waiting-for-user" },
    ]);

    expect(mockPrismaDebateSessionCreate).toHaveBeenCalledWith({
      data: {
        id: "test-session-id",
        status: "ACTIVE",
        dilemma: "Is free will real?",
        philosopherCount: 1,
      },
    });

    expect(mockPrismaPhilosopherRoundCreate).toHaveBeenCalledWith({
      data: {
        sessionId: "test-session-id",
        philosopherName: "Test Philosopher",
        round: 1,
        content: "Hello world",
      },
    });
  });

  it("uses sessionId from body when provided", async () => {
    const events: DebateEvent[] = [
      { type: "philosopher-start", philosopherName: "Test Philosopher", round: 1 },
      { type: "philosopher-complete", philosopherName: "Test Philosopher", round: 1, content: "Done" },
      { type: "round-complete", round: 1 },
      { type: "user-intervention" },
    ];

    mockDebateOrchestrator.mockReturnValue(createMockGenerator(events));

    const { POST } = await import("@/app/api/debate/route");
    const request = new Request("http://localhost:3000/api/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dilemma: "Is free will real?",
        sessionId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    });

    const response = await POST(request as unknown as import("next/server").NextRequest);
    await readSSE(response);

    expect(mockPrismaDebateSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id: "550e8400-e29b-41d4-a716-446655440000" }),
      }),
    );
  });

  it("sets session cookie when no session exists", async () => {
    const events: DebateEvent[] = [
      { type: "philosopher-start", philosopherName: "Test Philosopher", round: 1 },
      { type: "philosopher-complete", philosopherName: "Test Philosopher", round: 1, content: "Done" },
      { type: "round-complete", round: 1 },
      { type: "user-intervention" },
    ];

    mockDebateOrchestrator.mockReturnValue(createMockGenerator(events));
    const cookieHeaders = new Headers();
    cookieHeaders.set("Set-Cookie", "taberna-sid=test-session-id");
    mockGetOrCreateSessionId.mockReturnValue({
      sessionId: "test-session-id",
      responseHeaders: cookieHeaders,
    });

    const { POST } = await import("@/app/api/debate/route");
    const request = new Request("http://localhost:3000/api/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dilemma: "Is free will real?" }),
    });

    const response = await POST(request as unknown as import("next/server").NextRequest);

    expect(response.headers.get("Set-Cookie")).toBe("taberna-sid=test-session-id");
  });

  it("yields waiting-for-user after round 2 and pauses stream", async () => {
    const events: DebateEvent[] = [
      { type: "round-complete", round: 1 },
      { type: "round-complete", round: 2 },
      { type: "user-intervention" },
    ];

    mockDebateOrchestrator.mockReturnValue(createMockGenerator(events));

    const { POST } = await import("@/app/api/debate/route");
    const request = new Request("http://localhost:3000/api/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dilemma: "Is free will real?" }),
    });

    const response = await POST(request as unknown as import("next/server").NextRequest);
    const sseEvents = await readSSE(response);

    expect(sseEvents).toContainEqual({ type: "waiting-for-user" });
  });

  it("resumes debate with intervention and completes round 3", async () => {
    const allEvents: DebateEvent[] = [
      { type: "round-complete", round: 1 },
      { type: "round-complete", round: 2 },
      { type: "user-intervention" },
      { type: "philosopher-start", philosopherName: "Test Philosopher", round: 3 },
      { type: "philosopher-complete", philosopherName: "Test Philosopher", round: 3, content: "Final thoughts" },
      { type: "round-complete", round: 3 },
      { type: "debate-complete", summary: "" },
    ];

    mockDebateOrchestrator.mockReturnValue(createMockGenerator(allEvents));

    const { POST } = await import("@/app/api/debate/route");

    const initialRequest = new Request("http://localhost:3000/api/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dilemma: "Is free will real?" }),
    });

    const initialResponse = await POST(initialRequest as unknown as import("next/server").NextRequest);
    await readSSE(initialResponse);

    const interventionRequest = new Request("http://localhost:3000/api/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "intervene",
        text: "I think free will is an illusion",
        sessionId: "test-session-id",
      }),
    });

    const interventionResponse = await POST(interventionRequest as unknown as import("next/server").NextRequest);
    const interventionEvents = await readSSE(interventionResponse);

    expect(interventionResponse.status).toBe(200);
    expect(interventionEvents).toEqual([
      { type: "philosopher-start", philosopherName: "Test Philosopher", round: 3 },
      { type: "philosopher-complete", philosopherName: "Test Philosopher", round: 3, content: "Final thoughts" },
      { type: "round-complete", round: 3 },
      { type: "debate-complete", summary: "" },
    ]);

    expect(mockPrismaDebateSessionUpdate).toHaveBeenCalledWith({
      where: { id: "test-session-id" },
      data: { status: "COMPLETED" },
    });
  });

  it("returns 400 for intervention without sessionId", async () => {
    const { POST } = await import("@/app/api/debate/route");
    const request = new Request("http://localhost:3000/api/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "intervene", text: "Hello" }),
    });

    const response = await POST(request as unknown as import("next/server").NextRequest);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("sessionId é obrigatório");
  });

  it("returns 400 for intervention without text", async () => {
    const { POST } = await import("@/app/api/debate/route");
    const request = new Request("http://localhost:3000/api/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "intervene", sessionId: "test-id" }),
    });

    const response = await POST(request as unknown as import("next/server").NextRequest);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Texto de intervenção é obrigatório");
  });

  it("returns 404 for intervention with non-existent sessionId", async () => {
    const { POST } = await import("@/app/api/debate/route");
    const request = new Request("http://localhost:3000/api/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "intervene",
        text: "Hello",
        sessionId: "non-existent-id",
      }),
    });

    const response = await POST(request as unknown as import("next/server").NextRequest);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Sessão de debate não encontrada ou já finalizada");
  });

  it("saves philosopher rounds to database during streaming", async () => {
    const events: DebateEvent[] = [
      { type: "philosopher-start", philosopherName: "P1", round: 1 },
      { type: "philosopher-complete", philosopherName: "P1", round: 1, content: "Response 1" },
      { type: "philosopher-start", philosopherName: "P2", round: 1 },
      { type: "philosopher-complete", philosopherName: "P2", round: 1, content: "Response 2" },
      { type: "round-complete", round: 1 },
      { type: "user-intervention" },
    ];

    mockDebateOrchestrator.mockReturnValue(createMockGenerator(events));

    const { POST } = await import("@/app/api/debate/route");
    const request = new Request("http://localhost:3000/api/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dilemma: "Is free will real?" }),
    });

    const response = await POST(request as unknown as import("next/server").NextRequest);
    await readSSE(response);

    expect(mockPrismaPhilosopherRoundCreate).toHaveBeenCalledTimes(2);
    expect(mockPrismaPhilosopherRoundCreate).toHaveBeenNthCalledWith(1, {
      data: {
        sessionId: "test-session-id",
        philosopherName: "P1",
        round: 1,
        content: "Response 1",
      },
    });
    expect(mockPrismaPhilosopherRoundCreate).toHaveBeenNthCalledWith(2, {
      data: {
        sessionId: "test-session-id",
        philosopherName: "P2",
        round: 1,
        content: "Response 2",
      },
    });
  });

  it("updates debate status to COMPLETED after full flow", async () => {
    const allEvents: DebateEvent[] = [
      { type: "round-complete", round: 1 },
      { type: "round-complete", round: 2 },
      { type: "user-intervention" },
      { type: "round-complete", round: 3 },
      { type: "debate-complete", summary: "" },
    ];

    mockDebateOrchestrator.mockReturnValue(createMockGenerator(allEvents));

    const { POST } = await import("@/app/api/debate/route");
    const request = new Request("http://localhost:3000/api/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dilemma: "Is free will real?" }),
    });

    const response = await POST(request as unknown as import("next/server").NextRequest);
    await readSSE(response);

    const interventionRequest = new Request("http://localhost:3000/api/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "intervene",
        text: "My take",
        sessionId: "test-session-id",
      }),
    });

    await POST(interventionRequest as unknown as import("next/server").NextRequest);

    expect(mockPrismaDebateSessionUpdate).toHaveBeenCalledWith({
      where: { id: "test-session-id" },
      data: { status: "COMPLETED" },
    });
  });

  it("handles stream errors gracefully", async () => {
    const failingGenerator: AsyncGenerator<DebateEvent> = {
      async next() {
        throw new Error("Stream error");
      },
      [Symbol.asyncIterator]() {
        return this;
      },
      return: async () => ({ done: true, value: undefined } as IteratorResult<DebateEvent>),
      throw: async () => ({ done: true, value: undefined } as IteratorResult<DebateEvent>),
      [Symbol.asyncDispose]: async () => {},
    };

    mockDebateOrchestrator.mockReturnValue(failingGenerator);

    const { POST } = await import("@/app/api/debate/route");
    const request = new Request("http://localhost:3000/api/debate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dilemma: "Is free will real?" }),
    });

    const response = await POST(request as unknown as import("next/server").NextRequest);
    const sseEvents = await readSSE(response);

    expect(sseEvents).toContainEqual({
      type: "philosopher-error",
      philosopherName: "Sistema",
      round: 0,
      error: "Error: Stream error",
    });
  });
});
