import { streamText } from "ai";
import type { PhilosopherConfig } from "@/types/philosopher";
import { getPhilosopherModel } from "./provider";

const TIMEOUT_MS = 60000;

export async function* streamPhilosopherResponse(
  config: PhilosopherConfig,
  context: string
): AsyncGenerator<{ content: string; finishReason: string }> {
  const controller = new AbortController();

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      controller.abort();
      reject(new Error("Timeout"));
    }, TIMEOUT_MS);
  });

  try {
    const model = getPhilosopherModel(config);
    const result = await Promise.race([
      streamText({
        model,
        system: config.systemPrompt,
        prompt: context,
        abortSignal: controller.signal,
      }),
      timeoutPromise,
    ]);

    let accumulatedContent = "";
    for await (const chunk of result.textStream) {
      accumulatedContent += chunk;
      yield { content: chunk, finishReason: "unknown" };
    }

    yield { content: accumulatedContent, finishReason: "stop" };
  } catch {
    yield { content: "meditando em silêncio...", finishReason: "error" };
  }
}
