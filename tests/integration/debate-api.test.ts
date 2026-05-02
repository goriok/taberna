import { describe, it, expect, vi, beforeEach } from "vitest";
import type { generateText } from "ai";
import {
  mockPhilosophers,
  mockRound1Responses,
  mockInterventionPause,
  createMockGenerator,
  readSSE,
} from "../fixtures/mock-philosophers";

const mockDebateOrchestrator = vi.hoisted(() => vi.fn());
const mockPrismaDebateSessionCreate = vi.hoisted(() => vi.fn());
const mockPrismaDebateSessionUpdate = vi.hoisted(() => vi.fn());
const mockPrismaPhilosopherRoundCreate = vi.hoisted(() => vi.fn());
const mockGetOrCreateSessionId = vi.hoisted(() => vi.fn());
const mockGenerateText = vi.hoisted(() => vi.fn());
const mockPrismaSummaryFindFirst = vi.hoisted(() => vi.fn());
const mockPrismaSummaryCreate = vi.hoisted(() => vi.fn());
const mockPrismaDebateSessionFindUnique = vi.hoisted(() => vi.fn());

vi.mock("@/lib/debate", () => ({
  debateOrchestrator: mockDebateOrchestrator,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    debateSession: {
      create: mockPrismaDebateSessionCreate,
      update: mockPrismaDebateSessionUpdate,
      findUnique: mockPrismaDebateSessionFindUnique,
    },
    philosopherRound: {
      create: mockPrismaPhilosopherRoundCreate,
    },
    summary: {
      findFirst: mockPrismaSummaryFindFirst,
      create: mockPrismaSummaryCreate,
    },
  },
}));

vi.mock("@/lib/session", () => ({
  getOrCreateSessionId: mockGetOrCreateSessionId,
}));

vi.mock("@/philosophers", () => ({
  philosophers: mockPhilosophers,
}));

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    generateText: mockGenerateText,
  };
});

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn(() => ({ id: "gpt-4o-mini-mock" }))),
}));

describe("Integration: POST /api/debate", () => {
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

  function createDebateRequest(body: unknown, cookie?: string) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (cookie) headers["Cookie"] = cookie;
    return new Request("http://localhost:3000/api/debate", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }) as unknown as import("next/server").NextRequest;
  }

  it("returns SSE stream with correct event types and content-type", async () => {
    mockDebateOrchestrator.mockReturnValue(createMockGenerator(mockRound1Responses));

    const { POST } = await import("@/app/api/debate/route");
    const request = createDebateRequest({ dilemma: "What is the meaning of life?" });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");

    const events = await readSSE(response);
    expect(events).toHaveLength(mockRound1Responses.length);
    expect(events[0]).toMatchObject({ type: "philosopher-start", philosopherName: "Martin Heidegger", round: 1 });
    expect(events[events.length - 1]).toMatchObject({ type: "round-complete", round: 1 });
  });

  it("returns 400 for empty dilemma", async () => {
    const { POST } = await import("@/app/api/debate/route");
    const request = createDebateRequest({ dilemma: "" });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("O dilema não pode estar vazio");
  });

  it("returns 400 for whitespace-only dilemma", async () => {
    const { POST } = await import("@/app/api/debate/route");
    const request = createDebateRequest({ dilemma: "   \n\t  " });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("O dilema não pode estar vazio");
  });

  it("returns 429 when session already has an active generator", async () => {
    mockDebateOrchestrator.mockReturnValue(createMockGenerator(mockInterventionPause));

    const { POST } = await import("@/app/api/debate/route");

    const firstRequest = createDebateRequest({ dilemma: "Is free will real?" });
    const firstResponse = await POST(firstRequest);
    expect(firstResponse.status).toBe(200);

    const secondRequest = createDebateRequest({ dilemma: "Another dilemma here?" });
    const secondResponse = await POST(secondRequest);
    const body = await secondResponse.json();

    expect(secondResponse.status).toBe(429);
    expect(body.error).toBe("Aguardem — os filósofos ainda estão debatendo");
  });

  it("maintains session cookie consistency across requests", async () => {
    mockGetOrCreateSessionId.mockImplementation((req: Request) => {
      const cookie = req.headers.get("cookie");
      if (cookie && cookie.includes("taberna-sid=existing-session")) {
        return { sessionId: "existing-session", responseHeaders: new Headers() };
      }
      const headers = new Headers();
      headers.set("Set-Cookie", "taberna-sid=new-session; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600");
      return { sessionId: "new-session", responseHeaders: headers };
    });

    mockDebateOrchestrator.mockReturnValue(createMockGenerator(mockInterventionPause));

    const { POST } = await import("@/app/api/debate/route");

    const firstRequest = createDebateRequest({ dilemma: "Is free will real?" });
    const firstResponse = await POST(firstRequest);
    expect(firstResponse.status).toBe(200);
    expect(firstResponse.headers.get("Set-Cookie")).toContain("taberna-sid=new-session");
    expect(mockPrismaDebateSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id: "new-session" }),
      }),
    );

    vi.clearAllMocks();
    mockDebateOrchestrator.mockReturnValue(createMockGenerator(mockInterventionPause));

    const secondRequest = createDebateRequest(
      { dilemma: "Is free will real?" },
      "taberna-sid=existing-session",
    );
    const secondResponse = await POST(secondRequest);
    expect(secondResponse.status).toBe(200);
    expect(secondResponse.headers.get("Set-Cookie")).toBeNull();
    expect(mockPrismaDebateSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id: "existing-session" }),
      }),
    );
  });
});

describe("Integration: POST /api/summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockPrismaSummaryFindFirst.mockResolvedValue(null);
    mockPrismaDebateSessionFindUnique.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      dilemma: "What is the good life?",
    });
    mockGenerateText.mockResolvedValue({
      text: "Na noite de hoje, os filósofos debateram...",
    } as Awaited<ReturnType<typeof generateText>>);
    mockPrismaSummaryCreate.mockResolvedValue({
      id: "summary-id",
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      content: "Na noite de hoje, os filósofos debateram...",
      createdAt: new Date("2026-05-02T12:00:00Z"),
    });
  });

  function createSummaryRequest(body: unknown) {
    return new Request("http://localhost/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as unknown as import("next/server").NextRequest;
  }

  it("generates summary, persists to DB, and returns content", async () => {
    const { POST } = await import("@/app/api/summary/route");
    const request = createSummaryRequest({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      philosopherResponses: [
        { philosopherName: "Heidegger", content: "Ser e tempo." },
      ],
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.content).toBe("Na noite de hoje, os filósofos debateram...");

    expect(mockPrismaSummaryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sessionId: "550e8400-e29b-41d4-a716-446655440000",
          content: "Na noite de hoje, os filósofos debateram...",
        }),
      }),
    );
  });

  it("returns 409 if summary already exists", async () => {
    mockPrismaSummaryFindFirst.mockResolvedValue({ id: "existing-summary" });
    const { POST } = await import("@/app/api/summary/route");
    const request = createSummaryRequest({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("Resumo já existe para esta sessão");
  });
});
