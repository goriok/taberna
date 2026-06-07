import { describe, it, expect } from "vitest";
import {
  buildDebateMarkdown,
  buildDebateFilename,
} from "../../src/lib/export/markdown";
import type { PhilosopherResponse, TableEvent } from "../../src/types/debate";

const complete = (
  name: string,
  round: number,
  content: string,
): PhilosopherResponse => ({
  philosopherName: name,
  round,
  content,
  status: "complete",
});

const streaming = (
  name: string,
  round: number,
  content: string,
): PhilosopherResponse => ({
  philosopherName: name,
  round,
  content,
  status: "streaming",
});

describe("buildDebateMarkdown", () => {
  it("renders dilemma, round, and summary", () => {
    const md = buildDebateMarkdown({
      dilemma: "É justo punir sem intenção?",
      responses: [
        complete("Sócrates", 1, "A virtude guia a ação."),
        complete("Nietzsche", 1, "A vontade de poder define o justo."),
      ],
      userInterventions: {},
      tableEvents: [],
      summary: "A noite revelou que a justiça é relativa.",
    });

    expect(md).toContain("# Noite na Taberna");
    expect(md).toContain("> É justo punir sem intenção?");
    expect(md).toContain("## Rodada 1");
    expect(md).toContain("### Sócrates");
    expect(md).toContain("A virtude guia a ação.");
    expect(md).toContain("### Nietzsche");
    expect(md).toContain("## Crônica da Noite");
    expect(md).toContain("A noite revelou que a justiça é relativa.");
  });

  it("includes user intervention after a round", () => {
    const md = buildDebateMarkdown({
      dilemma: "Dilema X",
      responses: [complete("Marx", 1, "A classe determina a consciência.")],
      userInterventions: { 1: "E o indivíduo, onde fica?" },
      tableEvents: [],
      summary: null,
    });

    expect(md).toContain(
      "> **Intervenção do anfitrião:** E o indivíduo, onde fica?",
    );
  });

  it("includes tableEvents after the correct round", () => {
    const event: TableEvent = {
      philosopherName: "Beauvoir",
      status: "joined",
      message: "Chego para falar de liberdade.",
      afterRound: 1,
    };

    const md = buildDebateMarkdown({
      dilemma: "Dilema Y",
      responses: [complete("Sócrates", 1, "Resposta.")],
      userInterventions: {},
      tableEvents: [event],
      summary: null,
    });

    expect(md).toContain("_Beauvoir entrou na mesa: Chego para falar de liberdade._");
  });

  it("renders 'deixou a mesa' for status=left", () => {
    const event: TableEvent = {
      philosopherName: "Nietzsche",
      status: "left",
      message: "Minha obra está completa.",
      afterRound: 2,
    };

    const md = buildDebateMarkdown({
      dilemma: "Dilema Z",
      responses: [
        complete("Nietzsche", 1, "Primeiro."),
        complete("Nietzsche", 2, "Segundo."),
      ],
      userInterventions: {},
      tableEvents: [event],
      summary: null,
    });

    expect(md).toContain("_Nietzsche deixou a mesa: Minha obra está completa._");
  });

  it("skips responses with status !== complete", () => {
    const md = buildDebateMarkdown({
      dilemma: "Dilema W",
      responses: [
        streaming("Sócrates", 1, "Texto incompleto..."),
        complete("Marx", 1, "Texto completo."),
      ],
      userInterventions: {},
      tableEvents: [],
      summary: null,
    });

    expect(md).not.toContain("Texto incompleto");
    expect(md).toContain("Texto completo.");
  });

  it("skips empty interventions", () => {
    const md = buildDebateMarkdown({
      dilemma: "Dilema",
      responses: [complete("Sócrates", 1, "Sim.")],
      userInterventions: { 1: "   " },
      tableEvents: [],
      summary: null,
    });

    expect(md).not.toContain("Intervenção do anfitrião");
  });
});

describe("buildDebateFilename", () => {
  it("produces a valid slug with date", () => {
    const name = buildDebateFilename(
      "É justo punir sem intenção?",
      new Date("2026-05-11"),
    );
    expect(name).toBe("taberna-e-justo-punir-sem-intencao-2026-05-11.md");
  });

  it("truncates long dilemma at 40 chars", () => {
    const long = "a".repeat(80);
    const name = buildDebateFilename(long, new Date("2026-01-01"));
    expect(name.startsWith("taberna-")).toBe(true);
    const slug = name.replace("taberna-", "").replace("-2026-01-01.md", "");
    expect(slug.length).toBeLessThanOrEqual(40);
  });

  it("has no trailing hyphens in slug", () => {
    const name = buildDebateFilename("abc!!!", new Date("2026-01-01"));
    expect(name).not.toMatch(/--/);
    expect(name).toBe("taberna-abc-2026-01-01.md");
  });
});
