import { describe, expect, it, vi } from "vitest";
import type { PhilosopherConfig } from "@/types/philosopher";
import { runAnalysis } from "./analyze";

const hanStub: PhilosopherConfig = {
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
};

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

describe("runAnalysis", () => {
  it("returns null result for a philosopher when generateText throws", async () => {
    const { generateText } = await import("ai");
    vi.mocked(generateText).mockRejectedValueOnce(new Error("LLM error"));

    const result = await runAnalysis([hanStub], "texto longo o suficiente aqui", "Título");
    expect(result).toEqual({ han: null });
  });

  it("returns parsed JSON result when generateText succeeds", async () => {
    const { generateText } = await import("ai");
    vi.mocked(generateText).mockResolvedValueOnce({
      text: '{"fomo_index": 4, "burnout_risk": "high"}',
    } as never);

    const result = await runAnalysis([hanStub], "texto longo o suficiente aqui", "Título");
    expect(result).toEqual({ han: { fomo_index: 4, burnout_risk: "high" } });
  });

  it("returns null when LLM returns non-JSON prose", async () => {
    const { generateText } = await import("ai");
    vi.mocked(generateText).mockResolvedValueOnce({
      text: "Não consigo analisar isso.",
    } as never);

    const result = await runAnalysis([hanStub], "texto longo o suficiente aqui", "Título");
    expect(result).toEqual({ han: null });
  });

  it("returns results keyed by philosopher id for multiple philosophers", async () => {
    const sennettStub: PhilosopherConfig = { ...hanStub, id: "sennett", name: "Sennett" };
    const { generateText } = await import("ai");
    vi.mocked(generateText)
      .mockResolvedValueOnce({ text: '{"fomo_index": 2}' } as never)
      .mockResolvedValueOnce({ text: '{"quality_signal": "craft"}' } as never);

    const result = await runAnalysis(
      [hanStub, sennettStub],
      "texto longo o suficiente aqui",
      "Título",
    );
    expect(result).toEqual({
      han: { fomo_index: 2 },
      sennett: { quality_signal: "craft" },
    });
  });
});
