import { generateText } from "ai";
import type { LanguageModel } from "ai";
import type { PhilosopherConfig } from "@/types/philosopher";
import { litellm } from "@/lib/llm/provider";

export async function selectNextSpeaker(
  context: string,
  remainingPhilosophers: PhilosopherConfig[]
): Promise<PhilosopherConfig> {
  if (remainingPhilosophers.length === 0) {
    throw new Error("No philosophers remaining");
  }
  if (remainingPhilosophers.length === 1) {
    return remainingPhilosophers[0]!;
  }

  const philosopherList = remainingPhilosophers
    .map((p) => `- ${p.id}: ${p.name} — ${p.corePhilosophy}`)
    .join("\n");

  const prompt = `Com base no contexto do debate a seguir, escolha qual filósofo deve falar em seguida. Responda APENAS com o ID exato do filósofo escolhido.\n\nContexto do debate:\n${context}\n\nFilósofos disponíveis:\n${philosopherList}\n\nID escolhido:`;

  try {
    const { text } = await generateText({
      model: litellm("gemini-flash-lite-3") as unknown as LanguageModel,
      prompt,
    });

    const chosenId = text.trim().split(/\s+/)[0];
    const chosen = remainingPhilosophers.find((p) => p.id === chosenId);
    if (chosen) {
      return chosen;
    }
  } catch {
    return remainingPhilosophers[0]!;
  }

  return remainingPhilosophers[0]!;
}
