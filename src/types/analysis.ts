import { z } from "zod";

export const AnalyzeRequestSchema = z.object({
  text: z.string().min(50).max(50_000),
  title: z.string().min(1).max(500),
  url: z.string().url().optional(),
  philosopher_ids: z.array(z.string()).min(1).max(10),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export type PhilosopherAnalysisResult = Record<string, unknown>;

export type AnalyzeResponse = Record<string, PhilosopherAnalysisResult | null>;
