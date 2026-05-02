import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { PhilosopherConfig } from "@/types/philosopher";

const LITELLM_BASE_URL =
  process.env.LITELLM_BASE_URL ??
  "http://litellm.litellm.svc.cluster.local:4000/v1";
const LITELLM_API_KEY = process.env.LITELLM_API_KEY ?? "";

export const litellm = createOpenAI({
  baseURL: LITELLM_BASE_URL,
  apiKey: LITELLM_API_KEY,
});

export function getPhilosopherModel(config: PhilosopherConfig): LanguageModel {
  return litellm(config.model) as unknown as LanguageModel;
}
