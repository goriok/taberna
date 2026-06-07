import { describe, expect, it } from "vitest";
import type { PhilosopherConfig } from "@/types/philosopher";
import { buildAnalysisPrompt } from "./prompts";

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

describe("buildAnalysisPrompt", () => {
  it("includes the article title in the prompt", () => {
    const prompt = buildAnalysisPrompt(hanStub, "conteúdo do artigo", "Título do Artigo");
    expect(prompt).toContain("Título do Artigo");
  });

  it("includes the article text in the prompt", () => {
    const prompt = buildAnalysisPrompt(hanStub, "corpo do artigo aqui", "T");
    expect(prompt).toContain("corpo do artigo aqui");
  });

  it("includes han schema fields for han philosopher", () => {
    const prompt = buildAnalysisPrompt(hanStub, "texto", "T");
    expect(prompt).toContain("fomo_index");
    expect(prompt).toContain("burnout_risk");
    expect(prompt).toContain("contemplative_value");
  });

  it("includes url when provided", () => {
    const prompt = buildAnalysisPrompt(hanStub, "texto", "T", "https://example.com");
    expect(prompt).toContain("https://example.com");
  });

  it("omits url line when not provided", () => {
    const prompt = buildAnalysisPrompt(hanStub, "texto", "T");
    expect(prompt).not.toContain("URL:");
  });

  it("uses default schema for unknown philosopher id", () => {
    const unknown = { ...hanStub, id: "desconhecido" };
    const prompt = buildAnalysisPrompt(unknown, "texto", "T");
    expect(prompt).toContain("summary_pt");
  });
});
