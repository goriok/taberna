import type { DebateEvent } from "@/types/debate";
import type { PhilosopherConfig } from "@/types/philosopher";
import { streamText } from "ai";
import { getPhilosopherModel } from "@/lib/llm/provider";
import { selectNextSpeaker } from "./ai-selector";

async function* mergeAsyncIterables<T>(
  iterables: AsyncIterable<T>[]
): AsyncGenerator<T> {
  if (iterables.length === 0) return;

  const iterators = iterables.map((it) => it[Symbol.asyncIterator]());
  const pending = new Map<
    number,
    Promise<{ idx: number; result: IteratorResult<T> }>
  >();

  for (let i = 0; i < iterators.length; i++) {
    pending.set(
      i,
      iterators[i]!.next().then((result) => ({ idx: i, result }))
    );
  }

  while (pending.size > 0) {
    const { idx, result } = await Promise.race(pending.values());
    pending.delete(idx);

    if (!result.done) {
      yield result.value;
      pending.set(
        idx,
        iterators[idx]!.next().then((r) => ({ idx, result: r }))
      );
    }
  }
}

async function* philosopherStream(
  philosopher: PhilosopherConfig,
  round: number,
  prompt: string
): AsyncGenerator<DebateEvent> {
  yield { type: "philosopher-start", philosopherName: philosopher.name, round };
  try {
    const result = await streamText({
      model: getPhilosopherModel(philosopher),
      system: philosopher.systemPrompt,
      prompt,
    });
    let content = "";
    for await (const chunk of result.textStream) {
      content += chunk;
      yield { type: "philosopher-chunk", philosopherName: philosopher.name, round, chunk };
    }
    yield { type: "philosopher-complete", philosopherName: philosopher.name, round, content };
  } catch (error) {
    yield { type: "philosopher-error", philosopherName: philosopher.name, round, error: String(error) };
  }
}

function buildPrompt(
  dilemma: string,
  allResponses: Map<number, Map<string, string>>,
  userInterventions: Map<number, string>,
  round: number
): string {
  if (round === 1) return dilemma;

  const lines: string[] = [`Dilema em debate: ${dilemma}\n`];

  for (let r = 1; r < round; r++) {
    const roundResponses = allResponses.get(r);
    if (roundResponses) {
      lines.push(`--- Round ${r} ---`);
      for (const [name, content] of roundResponses) {
        lines.push(`${name}: ${content}`);
      }
    }
    const userText = userInterventions.get(r);
    if (userText?.trim()) {
      lines.push(`\nInterlocutor: "${userText.trim()}"`);
    }
    lines.push("");
  }

  const userText = userInterventions.get(round - 1);
  const userPart = userText?.trim()
    ? `O interlocutor disse: "${userText.trim()}". Leve isso em conta ao responder.`
    : `Aprofunde sua posição em réplica aos demais.`;

  lines.push(`Com base em tudo acima: ${userPart}`);
  return lines.join("\n");
}

// Yielded value is { end: boolean; text: string }
type UserInput = { end: boolean; text: string };

export async function* debateOrchestrator(
  dilemma: string,
  philosophers: PhilosopherConfig[],
  _sessionId: string
): AsyncGenerator<DebateEvent, void, UserInput | undefined> {
  if (!dilemma || dilemma.trim().length === 0) {
    throw new Error("Dilemma cannot be empty");
  }

  // allResponses[round] = Map<philosopherName, content>
  const allResponses = new Map<number, Map<string, string>>();
  const userInterventions = new Map<number, string>();

  let round = 1;

  while (true) {
    const roundResponses = new Map<string, string>();
    allResponses.set(round, roundResponses);

    const prompt = buildPrompt(dilemma, allResponses, userInterventions, round);

    if (round === 1) {
      // Round 1: all philosophers speak in parallel
      const streams = philosophers.map((p) => philosopherStream(p, round, prompt));
      for await (const event of mergeAsyncIterables(streams)) {
        yield event;
        if (event.type === "philosopher-complete") {
          roundResponses.set(event.philosopherName, event.content);
        }
      }
    } else {
      // Subsequent rounds: sequential, AI-selected order
      const remaining = [...philosophers];
      while (remaining.length > 0) {
        const context = [...roundResponses.entries()]
          .map(([n, c]) => `${n}: ${c}`)
          .join("\n\n");
        const next = await selectNextSpeaker(context || prompt, remaining);
        const idx = remaining.findIndex((p) => p.id === next.id);
        if (idx !== -1) remaining.splice(idx, 1);

        const stream = philosopherStream(next, round, prompt);
        for await (const event of stream) {
          yield event;
          if (event.type === "philosopher-complete") {
            roundResponses.set(event.philosopherName, event.content);
          }
        }
      }
    }

    yield { type: "round-complete", round };

    // Pause and ask user what to do
    const userInput = yield { type: "user-intervention" };
    const text = userInput?.text ?? "";
    const end = userInput?.end ?? false;

    if (text.trim()) {
      userInterventions.set(round, text);
    }

    if (end) {
      yield { type: "debate-complete", summary: "" };
      return;
    }

    round++;
  }
}
