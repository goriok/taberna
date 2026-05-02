import type { DebateEvent } from "@/types/debate";
import type { PhilosopherConfig } from "@/types/philosopher";
import { streamText } from "ai";
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
  yield {
    type: "philosopher-start",
    philosopherName: philosopher.name,
    round,
  };
  try {
    const result = await streamText({
      model: philosopher.model,
      system: philosopher.systemPrompt,
      prompt,
    });
    let content = "";
    for await (const chunk of result.textStream) {
      content += chunk;
      yield {
        type: "philosopher-chunk",
        philosopherName: philosopher.name,
        round,
        chunk,
      };
    }
    yield {
      type: "philosopher-complete",
      philosopherName: philosopher.name,
      round,
      content,
    };
  } catch (error) {
    yield {
      type: "philosopher-error",
      philosopherName: philosopher.name,
      round,
      error: String(error),
    };
  }
}

function buildRound1Prompt(dilemma: string): string {
  return dilemma;
}

function buildRound2Prompt(context: string): string {
  return `Contexto do debate até agora:\n${context}\n\nCom base nesses argumentos, apresente sua réplica.`;
}

function buildRound3Prompt(context: string, userInput: string): string {
  return `Contexto do debate até agora:\n${context}\n\nIntervenção do usuário:\n${userInput}\n\nReaja à intervenção do usuário e aos argumentos anteriores.`;
}

function buildContextFromResponses(
  responses: Map<string, string>
): string {
  const lines: string[] = [];
  for (const [name, content] of responses) {
    lines.push(`${name}: ${content}`);
  }
  return lines.join("\n\n");
}

export async function* debateOrchestrator(
  dilemma: string,
  philosophers: PhilosopherConfig[],
  sessionId: string
): AsyncGenerator<DebateEvent> {
  if (!dilemma || dilemma.trim().length === 0) {
    throw new Error("Dilemma cannot be empty");
  }

  const round1Prompt = buildRound1Prompt(dilemma);
  const round1Streams = philosophers.map((p) =>
    philosopherStream(p, 1, round1Prompt)
  );

  const round1Responses = new Map<string, string>();

  for await (const event of mergeAsyncIterables(round1Streams)) {
    yield event;
    if (event.type === "philosopher-complete") {
      round1Responses.set(event.philosopherName, event.content);
    }
  }

  yield { type: "round-complete", round: 1 };

  let context = buildContextFromResponses(round1Responses);
  const remaining = [...philosophers];
  const round2Responses = new Map<string, string>();

  while (remaining.length > 0) {
    const next = await selectNextSpeaker(context, remaining);
    const idx = remaining.findIndex((p) => p.id === next.id);
    if (idx !== -1) remaining.splice(idx, 1);

    const stream = philosopherStream(next, 2, buildRound2Prompt(context));
    let responseContent = "";

    for await (const event of stream) {
      yield event;
      if (event.type === "philosopher-complete") {
        responseContent = event.content;
      }
    }

    round2Responses.set(next.name, responseContent);
    context = buildContextFromResponses(
      new Map([...round1Responses, ...round2Responses])
    );
  }

  yield { type: "round-complete", round: 2 };

  const userInput = yield { type: "user-intervention" };
  const userInterventionText = typeof userInput === "string" ? userInput : "";

  const fullContext = buildContextFromResponses(
    new Map([...round1Responses, ...round2Responses])
  );
  const round3Prompt = buildRound3Prompt(fullContext, userInterventionText);
  const round3Streams = philosophers.map((p) =>
    philosopherStream(p, 3, round3Prompt)
  );

  for await (const event of mergeAsyncIterables(round3Streams)) {
    yield event;
  }

  yield { type: "round-complete", round: 3 };
  yield { type: "debate-complete", summary: "" };
}
