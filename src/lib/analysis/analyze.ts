import { generateText } from "ai";
import type { PhilosopherConfig } from "@/types/philosopher";
import type { AnalyzeResponse } from "@/types/analysis";
import { buildAnalysisPrompt } from "./prompts";
import { extractJSON } from "./extractor";
import { getPhilosopherModel } from "@/lib/llm/provider";

export async function runAnalysis(
  philosophers: PhilosopherConfig[],
  text: string,
  title: string,
  url?: string,
): Promise<AnalyzeResponse> {
  const results = await Promise.allSettled(
    philosophers.map(async (philosopher) => {
      const prompt = buildAnalysisPrompt(philosopher, text, title, url);
      const { text: raw } = await generateText({
        model: getPhilosopherModel(philosopher),
        system: philosopher.systemPrompt,
        prompt,
      });
      return { id: philosopher.id, data: extractJSON(raw, null) };
    }),
  );

  const output: AnalyzeResponse = {};
  for (const result of results) {
    if (result.status === "fulfilled") {
      output[result.value.id] = result.value.data;
    } else {
      const philosopher = philosophers[results.indexOf(result)];
      output[philosopher.id] = null;
    }
  }
  return output;
}
