import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDebateSessionCreate = vi.fn();
const mockDebateSessionFindUnique = vi.fn();
const mockDebateSessionUpdate = vi.fn();
const mockSummaryCreate = vi.fn();
const mockPhilosopherRoundCreate = vi.fn();

vi.mock("@/generated/prisma/client", () => ({
  PrismaClient: vi.fn(() => ({
    debateSession: {
      create: mockDebateSessionCreate,
      findUnique: mockDebateSessionFindUnique,
      update: mockDebateSessionUpdate,
    },
    summary: {
      create: mockSummaryCreate,
    },
    philosopherRound: {
      create: mockPhilosopherRoundCreate,
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  })),
}));

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: vi.fn(),
}));

describe("Prisma Models", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("DebateSession", () => {
    it("creates a debate session with correct data", async () => {
      const mockData = {
        id: "test-session-id",
        status: "ACTIVE" as const,
        dilemma: "What is the meaning of life?",
        philosopherCount: 7,
      };

      mockDebateSessionCreate.mockResolvedValue({
        ...mockData,
        createdAt: new Date(),
      });

      const result = await mockDebateSessionCreate({ data: mockData });

      expect(mockDebateSessionCreate).toHaveBeenCalledWith({ data: mockData });
      expect(result.id).toBe("test-session-id");
      expect(result.status).toBe("ACTIVE");
      expect(result.dilemma).toBe("What is the meaning of life?");
    });

    it("finds a debate session by id", async () => {
      const mockSession = {
        id: "test-session-id",
        status: "COMPLETED",
        dilemma: "What is free will?",
        philosopherCount: 7,
        createdAt: new Date(),
      };

      mockDebateSessionFindUnique.mockResolvedValue(mockSession);

      const result = await mockDebateSessionFindUnique({
        where: { id: "test-session-id" },
      });

      expect(mockDebateSessionFindUnique).toHaveBeenCalledWith({
        where: { id: "test-session-id" },
      });
      expect(result?.id).toBe("test-session-id");
    });

    it("updates debate session status to COMPLETED", async () => {
      const mockData = {
        where: { id: "test-session-id" },
        data: { status: "COMPLETED" as const },
      };

      mockDebateSessionUpdate.mockResolvedValue({
        id: "test-session-id",
        status: "COMPLETED",
      });

      const result = await mockDebateSessionUpdate(mockData);

      expect(mockDebateSessionUpdate).toHaveBeenCalledWith(mockData);
      expect(result.status).toBe("COMPLETED");
    });
  });

  describe("Summary", () => {
    it("creates a summary linked to a debate session", async () => {
      const mockData = {
        sessionId: "test-session-id",
        content: "The philosophers concluded...",
      };

      mockSummaryCreate.mockResolvedValue({
        id: "summary-id",
        ...mockData,
        createdAt: new Date(),
      });

      const result = await mockSummaryCreate({ data: mockData });

      expect(mockSummaryCreate).toHaveBeenCalledWith({ data: mockData });
      expect(result.sessionId).toBe("test-session-id");
      expect(result.content).toBe("The philosophers concluded...");
    });
  });

  describe("PhilosopherRound", () => {
    it("creates a philosopher round with correct data", async () => {
      const mockData = {
        sessionId: "test-session-id",
        philosopherName: "Martin Heidegger",
        round: 1,
        content: "Ser e tempo.",
      };

      mockPhilosopherRoundCreate.mockResolvedValue({
        id: "round-id",
        ...mockData,
        createdAt: new Date(),
      });

      const result = await mockPhilosopherRoundCreate({ data: mockData });

      expect(mockPhilosopherRoundCreate).toHaveBeenCalledWith({ data: mockData });
      expect(result.philosopherName).toBe("Martin Heidegger");
      expect(result.round).toBe(1);
      expect(result.content).toBe("Ser e tempo.");
    });
  });
});
