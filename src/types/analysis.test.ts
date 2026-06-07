import { describe, expect, it } from "vitest";
import { AnalyzeRequestSchema } from "./analysis";

describe("AnalyzeRequestSchema", () => {
  const validBase = {
    text: "a".repeat(50),
    title: "Título válido",
    philosopher_ids: ["han"],
  };

  it("rejects request with text too short", () => {
    const result = AnalyzeRequestSchema.safeParse({ ...validBase, text: "curto" });
    expect(result.success).toBe(false);
  });

  it("accepts valid request without url", () => {
    const result = AnalyzeRequestSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("accepts valid request with url", () => {
    const result = AnalyzeRequestSchema.safeParse({ ...validBase, url: "https://example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid url format", () => {
    const result = AnalyzeRequestSchema.safeParse({ ...validBase, url: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("rejects empty philosopher_ids array", () => {
    const result = AnalyzeRequestSchema.safeParse({ ...validBase, philosopher_ids: [] });
    expect(result.success).toBe(false);
  });

  it("rejects more than 10 philosopher_ids", () => {
    const result = AnalyzeRequestSchema.safeParse({
      ...validBase,
      philosopher_ids: Array.from({ length: 11 }, (_, i) => `p${i}`),
    });
    expect(result.success).toBe(false);
  });
});
