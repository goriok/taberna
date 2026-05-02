import { describe, it, expect } from "vitest";
import { projectContext } from "@/lib/debate/context-projection";
import type { PhilosopherConfig } from "@/types/philosopher";
import type { PhilosopherResponse } from "@/types/debate";

function createPhilosopher(
  overrides: Partial<PhilosopherConfig> = {}
): PhilosopherConfig {
  return {
    id: "p1",
    name: "Sócrates",
    shortName: "Sócrates",
    era: "Antiguidade",
    corePhilosophy: "Conhece-te a ti mesmo",
    keyConcepts: [],
    method: "Maiêutica",
    vocabulary: [],
    writingStyle: "Diálogo",
    quirks: "Faz perguntas",
    antiPatterns: [],
    model: "gpt-4o",
    systemPrompt: "You are Sócrates.",
    ...overrides,
  };
}

function createResponse(
  overrides: Partial<PhilosopherResponse> = {}
): PhilosopherResponse {
  return {
    philosopherName: "Sócrates",
    round: 1,
    content: "Resposta padrão",
    status: "complete",
    ...overrides,
  };
}

const DILEMMA = "Devo sacrificar minha felicidade pela verdade?";

describe("projectContext", () => {
  it("round 1: includes dilemma and target philosopher role", () => {
    const philosopher = createPhilosopher();
    const result = projectContext([], philosopher, DILEMMA, 1);

    expect(result).toContain(`O usuário disse: ${DILEMMA}.`);
    expect(result).toContain("Você é Sócrates.");
    expect(result).toContain("Conhece-te a ti mesmo");
    expect(result).toContain("Responda ao dilema do usuário.");
  });

  it("round 1: has no previous responses", () => {
    const philosopher = createPhilosopher();
    const result = projectContext([], philosopher, DILEMMA, 1);

    expect(result).not.toContain("respondeu:");
    expect(result).not.toContain("Anteriormente, você respondeu:");
  });

  it("round 2: includes all round-1 responses with speaker labels", () => {
    const socrates = createPhilosopher({ name: "Sócrates" });
    const plato = createPhilosopher({
      id: "p2",
      name: "Platão",
      shortName: "Platão",
      corePhilosophy: "O mundo das ideias",
    });

    const responses: PhilosopherResponse[] = [
      createResponse({ philosopherName: "Sócrates", round: 1, content: "A verdade é superior." }),
      createResponse({ philosopherName: "Platão", round: 1, content: "A felicidade reflete a ideia do bem." }),
    ];

    const result = projectContext(responses, socrates, DILEMMA, 2);

    expect(result).toContain("Sócrates respondeu: A verdade é superior.");
    expect(result).toContain("Platão respondeu: A felicidade reflete a ideia do bem.");
    expect(result).toContain("Você é Sócrates. Como você responde?");
  });

  it("round 2: injects target philosopher's own previous response for continuity", () => {
    const socrates = createPhilosopher({ name: "Sócrates" });
    const responses: PhilosopherResponse[] = [
      createResponse({ philosopherName: "Sócrates", round: 1, content: "Minha resposta anterior." }),
      createResponse({ philosopherName: "Platão", round: 1, content: "Resposta do Platão." }),
    ];

    const result = projectContext(responses, socrates, DILEMMA, 2);

    expect(result).toContain("Anteriormente, você respondeu: Minha resposta anterior.");
  });

  it("round 2: does not inject continuity line when target has no previous response", () => {
    const aristotle = createPhilosopher({
      id: "p3",
      name: "Aristóteles",
      shortName: "Aristóteles",
      corePhilosophy: "A virtude é o meio-termo",
    });
    const responses: PhilosopherResponse[] = [
      createResponse({ philosopherName: "Sócrates", round: 1, content: "Resposta do Sócrates." }),
    ];

    const result = projectContext(responses, aristotle, DILEMMA, 2);

    expect(result).not.toContain("Anteriormente, você respondeu:");
  });

  it("round 3: includes full history from rounds 1 and 2", () => {
    const socrates = createPhilosopher({ name: "Sócrates" });
    const responses: PhilosopherResponse[] = [
      createResponse({ philosopherName: "Sócrates", round: 1, content: "R1 Sócrates." }),
      createResponse({ philosopherName: "Platão", round: 1, content: "R1 Platão." }),
      createResponse({ philosopherName: "Sócrates", round: 2, content: "R2 Sócrates." }),
      createResponse({ philosopherName: "Platão", round: 2, content: "R2 Platão." }),
    ];

    const result = projectContext(responses, socrates, DILEMMA, 3, "O usuário discorda.");

    expect(result).toContain("Sócrates respondeu: R1 Sócrates.");
    expect(result).toContain("Platão respondeu: R1 Platão.");
    expect(result).toContain("Sócrates respondeu: R2 Sócrates.");
    expect(result).toContain("Platão respondeu: R2 Platão.");
  });

  it("round 3: includes user intervention text", () => {
    const socrates = createPhilosopher();
    const intervention = "Mas e se a verdade causar sofrimento?";
    const responses: PhilosopherResponse[] = [
      createResponse({ philosopherName: "Sócrates", round: 1, content: "R1." }),
    ];

    const result = projectContext(responses, socrates, DILEMMA, 3, intervention);

    expect(result).toContain(`O usuário interveio: ${intervention}`);
  });

  it("round 3: omits user intervention line when not provided", () => {
    const socrates = createPhilosopher();
    const responses: PhilosopherResponse[] = [
      createResponse({ philosopherName: "Sócrates", round: 1, content: "R1." }),
    ];

    const result = projectContext(responses, socrates, DILEMMA, 3);

    expect(result).not.toContain("O usuário interveio:");
  });

  it("only includes responses from rounds strictly less than current round", () => {
    const socrates = createPhilosopher();
    const responses: PhilosopherResponse[] = [
      createResponse({ philosopherName: "Sócrates", round: 2, content: "R2." }),
    ];

    const result = projectContext(responses, socrates, DILEMMA, 2);

    expect(result).not.toContain("R2.");
    expect(result).not.toContain("respondeu: R2.");
  });

  it("uses the most recent own response for continuity when multiple exist", () => {
    const socrates = createPhilosopher({ name: "Sócrates" });
    const responses: PhilosopherResponse[] = [
      createResponse({ philosopherName: "Sócrates", round: 1, content: "Primeira resposta." }),
      createResponse({ philosopherName: "Sócrates", round: 2, content: "Resposta mais recente." }),
    ];

    const result = projectContext(responses, socrates, DILEMMA, 3);

    expect(result).toContain("Anteriormente, você respondeu: Resposta mais recente.");
    const continuityIndex = result.indexOf("Anteriormente, você respondeu: Resposta mais recente.");
    const firstResponseIndex = result.indexOf("Sócrates respondeu: Primeira resposta.");
    expect(firstResponseIndex).toBeLessThan(continuityIndex);
  });

  it("formats multiple philosopher responses in order", () => {
    const socrates = createPhilosopher({ name: "Sócrates" });
    const responses: PhilosopherResponse[] = [
      createResponse({ philosopherName: "Sócrates", round: 1, content: "A" }),
      createResponse({ philosopherName: "Platão", round: 1, content: "B" }),
      createResponse({ philosopherName: "Aristóteles", round: 1, content: "C" }),
    ];

    const result = projectContext(responses, socrates, DILEMMA, 2);

    const socratesIndex = result.indexOf("Sócrates respondeu: A");
    const platoIndex = result.indexOf("Platão respondeu: B");
    const aristotleIndex = result.indexOf("Aristóteles respondeu: C");

    expect(socratesIndex).toBeLessThan(platoIndex);
    expect(platoIndex).toBeLessThan(aristotleIndex);
  });
});
