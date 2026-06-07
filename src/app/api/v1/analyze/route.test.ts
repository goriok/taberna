import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/analysis/analyze", () => ({
  runAnalysis: vi.fn(),
}));

vi.mock("@/philosophers", () => ({
  philosophers: [
    {
      id: "han",
      name: "Byung-Chul Han",
      shortName: "Han",
      era: "1959–",
      corePhilosophy: "...",
      keyConcepts: [],
      method: "...",
      vocabulary: [],
      writingStyle: "...",
      quirks: "...",
      antiPatterns: [],
      model: "deepseek",
      systemPrompt: "Você é Han.",
    },
  ],
}));

describe("POST /api/v1/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function makeRequest(body: unknown) {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/v1/analyze", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
    return POST(req as never);
  }

  it("returns 400 for invalid request body", async () => {
    const res = await makeRequest({ text: "curto", title: "T", philosopher_ids: ["han"] });
    expect(res.status).toBe(400);
  });

  it("returns 400 when all philosopher_ids are unknown", async () => {
    const res = await makeRequest({
      text: "a".repeat(50),
      title: "T",
      philosopher_ids: ["naoexiste"],
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("no valid philosopher_ids");
  });

  it("returns 200 with analysis result for valid request", async () => {
    const { runAnalysis } = await import("@/lib/analysis/analyze");
    vi.mocked(runAnalysis).mockResolvedValueOnce({ han: { fomo_index: 3 } });

    const res = await makeRequest({
      text: "a".repeat(50),
      title: "Título",
      philosopher_ids: ["han"],
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ han: { fomo_index: 3 } });
  });
});
