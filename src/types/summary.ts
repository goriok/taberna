import { z } from "zod";

export const SummaryGenerateRequestSchema = z.object({
  sessionId: z.string().uuid(),
  philosopherResponses: z.array(z.any()).optional(),
});

export type SummaryGenerateRequest = z.infer<typeof SummaryGenerateRequestSchema>;

export interface SummaryResponse {
  sessionId: string;
  content: string;
  createdAt: Date;
}
