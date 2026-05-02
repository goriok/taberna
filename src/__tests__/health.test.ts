import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockQueryRaw } = vi.hoisted(() => ({
  mockQueryRaw: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { $queryRaw: mockQueryRaw },
}));

const { GET } = await import("@/app/api/health/route");

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with ok status when DB is connected", async () => {
    mockQueryRaw.mockResolvedValue([{ "1": 1 }]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: "ok",
      db: "connected",
      timestamp: expect.any(String),
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 503 with error status when DB is disconnected", async () => {
    mockQueryRaw.mockRejectedValue(new Error("DB connection failed"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      status: "error",
      db: "disconnected",
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
