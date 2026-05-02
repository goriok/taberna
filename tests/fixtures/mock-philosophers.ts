import type { PhilosopherConfig } from "@/types/philosopher";
import type { DebateEvent } from "@/types/debate";

export const mockPhilosophers: PhilosopherConfig[] = [
  {
    id: "heidegger",
    name: "Martin Heidegger",
    shortName: "Heidegger",
    era: "1889–1976, Alemanha",
    corePhilosophy: "O ser humano é um ser-no-mundo.",
    keyConcepts: [{ term: "Dasein", definition: "O ente que somos nós." }],
    method: "Fenomenologia hermenêutica",
    vocabulary: ["Dasein", "ser-no-mundo"],
    writingStyle: "Denso e poético.",
    quirks: "Cria neologismos.",
    antiPatterns: ["Não reduza a autoajuda."],
    model: "anthropic/claude-sonnet-4-5",
    systemPrompt: "Você é Heidegger.",
  },
  {
    id: "nietzsche",
    name: "Friedrich Nietzsche",
    shortName: "Nietzsche",
    era: "1844–1900, Alemanha",
    corePhilosophy: "A vontade de potência e a transvaloração de todos os valores.",
    keyConcepts: [{ term: "Übermensch", definition: "O super-homem como ideal." }],
    method: "Genealogia",
    vocabulary: ["Übermensch", "eterno retorno"],
    writingStyle: "Aforístico e apodítico.",
    quirks: "Usa exclamações e itálicos.",
    antiPatterns: ["Não confunda com nazismo."],
    model: "anthropic/claude-sonnet-4-5",
    systemPrompt: "Você é Nietzsche.",
  },
  {
    id: "schopenhauer",
    name: "Arthur Schopenhauer",
    shortName: "Schopenhauer",
    era: "1788–1860, Alemanha",
    corePhilosophy: "O mundo como vontade e representação.",
    keyConcepts: [{ term: "Vontade", definition: "Força cega por trás da realidade." }],
    method: "Metafísica da vontade",
    vocabulary: ["vontade", "representação"],
    writingStyle: "Claro e sistemático.",
    quirks: "Cita o Oriente.",
    antiPatterns: ["Não simplifique o pessimismo."],
    model: "anthropic/claude-sonnet-4-5",
    systemPrompt: "Você é Schopenhauer.",
  },
  {
    id: "camus",
    name: "Albert Camus",
    shortName: "Camus",
    era: "1913–1960, Argélia/França",
    corePhilosophy: "O absurdo e a revolta.",
    keyConcepts: [{ term: "Absurdo", definition: "O divórcio entre o homem e o mundo." }],
    method: "Ficção filosófica",
    vocabulary: ["absurdo", "revolta"],
    writingStyle: "Narrativo e imagético.",
    quirks: "Usa metáforas do sol e do mar.",
    antiPatterns: ["Não confunda com existencialismo."],
    model: "anthropic/claude-sonnet-4-5",
    systemPrompt: "Você é Camus.",
  },
  {
    id: "han",
    name: "Byung-Chul Han",
    shortName: "Han",
    era: "1959–, Coreia do Sul/Alemanha",
    corePhilosophy: "A sociedade do desempenho e a psicopolítica.",
    keyConcepts: [{ term: "Burnout", definition: "Excesso de positividade." }],
    method: "Crítica cultural",
    vocabulary: ["burnout", "transparência"],
    writingStyle: "Conciso e lapidar.",
    quirks: "Frases curtas e afiadas.",
    antiPatterns: ["Não trivialização."],
    model: "anthropic/claude-sonnet-4-5",
    systemPrompt: "Você é Byung-Chul Han.",
  },
  {
    id: "kosik",
    name: "Karel Kosík",
    shortName: "Kosík",
    era: "1926–2003, Tchecoslováquia",
    corePhilosophy: "A dialética do concreto.",
    keyConcepts: [{ term: "Concreto", definition: "Totalidade vivida." }],
    method: "Dialética",
    vocabulary: ["concreto", "totalidade"],
    writingStyle: "Erudito e marxista.",
    quirks: "Cita Lukács.",
    antiPatterns: ["Não ignore o contexto histórico."],
    model: "anthropic/claude-sonnet-4-5",
    systemPrompt: "Você é Karel Kosík.",
  },
  {
    id: "sennett",
    name: "Richard Sennett",
    shortName: "Sennett",
    era: "1943–, EUA/Reino Unido",
    corePhilosophy: "O artesão e a cooperação.",
    keyConcepts: [{ term: "Artesão", definition: "Relação prática com o trabalho." }],
    method: "Sociologia urbana",
    vocabulary: ["artesão", "cooperação"],
    writingStyle: "Narrativo sociológico.",
    quirks: "Usa histórias de ofícios.",
    antiPatterns: ["Não reduza a autoajuda."],
    model: "anthropic/claude-sonnet-4-5",
    systemPrompt: "Você é Richard Sennett.",
  },
];

export const mockRound1Responses: DebateEvent[] = [
  { type: "philosopher-start", philosopherName: "Martin Heidegger", round: 1 },
  { type: "philosopher-chunk", philosopherName: "Martin Heidegger", round: 1, chunk: "Ser " },
  { type: "philosopher-complete", philosopherName: "Martin Heidegger", round: 1, content: "Ser e tempo." },
  { type: "philosopher-start", philosopherName: "Friedrich Nietzsche", round: 1 },
  { type: "philosopher-complete", philosopherName: "Friedrich Nietzsche", round: 1, content: "Vontade de potência." },
  { type: "round-complete", round: 1 },
];

export const mockRound2Responses: DebateEvent[] = [
  { type: "philosopher-start", philosopherName: "Martin Heidegger", round: 2 },
  { type: "philosopher-complete", philosopherName: "Martin Heidegger", round: 2, content: "Dasein." },
  { type: "philosopher-start", philosopherName: "Friedrich Nietzsche", round: 2 },
  { type: "philosopher-complete", philosopherName: "Friedrich Nietzsche", round: 2, content: "Eterno retorno." },
  { type: "round-complete", round: 2 },
];

export const mockRound3Responses: DebateEvent[] = [
  { type: "philosopher-start", philosopherName: "Martin Heidegger", round: 3 },
  { type: "philosopher-complete", philosopherName: "Martin Heidegger", round: 3, content: "Ser-para-a-morte." },
  { type: "philosopher-start", philosopherName: "Friedrich Nietzsche", round: 3 },
  { type: "philosopher-complete", philosopherName: "Friedrich Nietzsche", round: 3, content: "Amor fati." },
  { type: "round-complete", round: 3 },
];

export const mockInterventionPause: DebateEvent[] = [
  { type: "philosopher-start", philosopherName: "Martin Heidegger", round: 1 },
  { type: "philosopher-complete", philosopherName: "Martin Heidegger", round: 1, content: "Ser e tempo." },
  { type: "round-complete", round: 1 },
  { type: "user-intervention" },
];

export const mockErrorEvent: DebateEvent[] = [
  { type: "philosopher-start", philosopherName: "Martin Heidegger", round: 1 },
  { type: "philosopher-error", philosopherName: "Martin Heidegger", round: 1, error: "LLM timeout" },
];

export function createMockGenerator(events: DebateEvent[]): AsyncGenerator<DebateEvent> {
  let index = 0;
  let pausedAtIntervention = false;

  const generator = {
    async next(value?: string) {
      if (pausedAtIntervention) {
        pausedAtIntervention = false;
        index++;
      }

      if (index >= events.length) {
        return { done: true, value: undefined } as IteratorResult<DebateEvent>;
      }

      const event = events[index];

      if (event.type === "user-intervention") {
        pausedAtIntervention = true;
        return {
          done: false,
          value: { ...event, userInput: value } as unknown as DebateEvent,
        };
      }

      index++;
      return { done: false, value: event };
    },
    [Symbol.asyncIterator]() {
      return this;
    },
    return: async () => ({ done: true, value: undefined } as IteratorResult<DebateEvent>),
    throw: async () => ({ done: true, value: undefined } as IteratorResult<DebateEvent>),
  };

  return generator as unknown as AsyncGenerator<DebateEvent>;
}

export async function readSSE<T = DebateEvent>(response: Response): Promise<T[]> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const events: T[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const line = chunk.trim();
      if (line.startsWith("data: ")) {
        events.push(JSON.parse(line.slice(6)));
      }
    }
  }

  return events;
}
