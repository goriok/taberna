import { describe, it, expect } from "vitest";
import { philosophers } from "@/philosophers";
import type { PhilosopherConfig } from "@/types/philosopher";

describe("Philosopher Personas", () => {
  it("should export all 7 philosophers", () => {
    expect(philosophers).toHaveLength(7);
  });

  it("each philosopher should have a valid PhilosopherConfig structure", () => {
    for (const p of philosophers) {
      expect(p).toBeDefined();
      expect(typeof p.id).toBe("string");
      expect(p.id.length).toBeGreaterThan(0);
      expect(typeof p.name).toBe("string");
      expect(p.name.length).toBeGreaterThan(0);
      expect(typeof p.shortName).toBe("string");
      expect(p.shortName.length).toBeGreaterThan(0);
      expect(typeof p.era).toBe("string");
      expect(p.era.length).toBeGreaterThan(0);
      expect(typeof p.corePhilosophy).toBe("string");
      expect(p.corePhilosophy.length).toBeGreaterThan(0);
      expect(typeof p.method).toBe("string");
      expect(p.method.length).toBeGreaterThan(0);
      expect(typeof p.writingStyle).toBe("string");
      expect(p.writingStyle.length).toBeGreaterThan(0);
      expect(typeof p.quirks).toBe("string");
      expect(p.quirks.length).toBeGreaterThan(0);
      expect(typeof p.model).toBe("string");
      expect(p.model.length).toBeGreaterThan(0);
      expect(typeof p.systemPrompt).toBe("string");
      expect(p.systemPrompt.length).toBeGreaterThan(0);
      expect(Array.isArray(p.keyConcepts)).toBe(true);
      expect(p.keyConcepts.length).toBeGreaterThanOrEqual(3);
      expect(Array.isArray(p.vocabulary)).toBe(true);
      expect(p.vocabulary.length).toBeGreaterThanOrEqual(5);
      expect(Array.isArray(p.antiPatterns)).toBe(true);
    }
  });

  it("each systemPrompt should contain the philosopher's name", () => {
    for (const p of philosophers) {
      expect(p.systemPrompt).toContain(p.name.split(",")[0]!);
    }
  });

  it("no two philosophers share the same id", () => {
    const ids = philosophers.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("no two philosophers share the same shortName", () => {
    const shortNames = philosophers.map((p) => p.shortName);
    const unique = new Set(shortNames);
    expect(unique.size).toBe(shortNames.length);
  });

  it("each philosopher has at least 2 antiPatterns", () => {
    for (const p of philosophers) {
      expect(p.antiPatterns.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('each systemPrompt contains "Responda sempre em português brasileiro"', () => {
    for (const p of philosophers) {
      expect(p.systemPrompt).toContain("Responda sempre em português brasileiro");
    }
  });
});
