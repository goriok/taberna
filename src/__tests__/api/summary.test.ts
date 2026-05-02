import { describe, it, expect, vi, beforeEach } from "vitest";
import type { generateText } from "ai";

const { mockGenerateText } = vi.hoisted(() => ({
  mockGenerateText: vi.fn(),
}));

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    generateText: mockGenerateText,
  };
});

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    summary: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    debateSession: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/llm/provider", () => ({
  litellm: vi.fn(() => ({ id: "gpt-4o-mini-mock" })),
}));

const { POST } = await import("@/app/api/summary/route");

describe("POST /api/summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createRequest(body: unknown) {
    return new Request("http://localhost/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as unknown as import("next/server").NextRequest;
  }

  it("returns 400 for invalid input", async () => {
    const request = createRequest({ sessionId: "not-a-uuid" });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Dados inválidos");
  });

  it("returns 409 if summary already exists for this session", async () => {
    mockPrisma.summary.findFirst.mockResolvedValue({
      id: "existing-summary-id",
    });
    const request = createRequest({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
    });
    const response = await POST(request);
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("Resumo já existe para esta sessão");
  });

  it("returns 404 if session not found", async () => {
    mockPrisma.summary.findFirst.mockResolvedValue(null);
    mockPrisma.debateSession.findUnique.mockResolvedValue(null);
    const request = createRequest({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
    });
    const response = await POST(request);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Sessão não encontrada");
  });

  it("generates summary, saves to DB, and returns 200 with content and createdAt", async () => {
    mockPrisma.summary.findFirst.mockResolvedValue(null);
    mockPrisma.debateSession.findUnique.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      dilemma: "Is free will real?",
    });
    mockGenerateText.mockResolvedValue({
      text: "Na noite de 2 de maio de 2026, sob a luz âmbar da Taberna...",
    } as Awaited<ReturnType<typeof generateText>>);
    mockPrisma.summary.create.mockResolvedValue({
      id: "summary-id",
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      content: "Na noite de 2 de maio de 2026, sob a luz âmbar da Taberna...",
      createdAt: new Date("2026-05-02T12:00:00Z"),
    });

    const request = createRequest({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      philosopherResponses: [
        { philosopherName: "Socrates", content: "Know thyself." },
      ],
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.content).toBe(
      "Na noite de 2 de maio de 2026, sob a luz âmbar da Taberna...",
    );
    expect(body.createdAt).toBe("2026-05-02T12:00:00.000Z");
  });

  it("calls generateText with gpt-4o-mini model", async () => {
    mockPrisma.summary.findFirst.mockResolvedValue(null);
    mockPrisma.debateSession.findUnique.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      dilemma: "What is justice?",
    });
    mockGenerateText.mockResolvedValue({
      text: "A poetic summary...",
    } as Awaited<ReturnType<typeof generateText>>);
    mockPrisma.summary.create.mockResolvedValue({
      id: "summary-id",
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      content: "A poetic summary...",
      createdAt: new Date(),
    });

    const request = createRequest({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
    });

    await POST(request);

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.objectContaining({ id: "gpt-4o-mini-mock" }),
      }),
    );
  });

  it("returns 500 when LLM fails", async () => {
    mockPrisma.summary.findFirst.mockResolvedValue(null);
    mockPrisma.debateSession.findUnique.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      dilemma: "Why are we here?",
    });
    mockGenerateText.mockRejectedValue(new Error("OpenAI API error"));

    const request = createRequest({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Erro ao gerar o resumo. Tente novamente.");
  });

  it("works without philosopherResponses", async () => {
    mockPrisma.summary.findFirst.mockResolvedValue(null);
    mockPrisma.debateSession.findUnique.mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      dilemma: "What is the good life?",
    });
    mockGenerateText.mockResolvedValue({
      text: "A summary without contributions...",
    } as Awaited<ReturnType<typeof generateText>>);
    mockPrisma.summary.create.mockResolvedValue({
      id: "summary-id",
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      content: "A summary without contributions...",
      createdAt: new Date("2026-05-02T12:00:00Z"),
    });

    const request = createRequest({
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.content).toBe("A summary without contributions...");
  });
});
