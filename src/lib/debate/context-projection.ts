import type { PhilosopherConfig } from "@/types/philosopher";
import type { PhilosopherResponse } from "@/types/debate";

export function projectContext(
  allResponses: PhilosopherResponse[],
  targetPhilosopher: PhilosopherConfig,
  dilemma: string,
  round: number,
  userIntervention?: string
): string {
  const previousResponses = allResponses.filter((r) => r.round < round);

  let context = `O usuário disse: ${dilemma}.\n\n`;

  for (const response of previousResponses) {
    context += `${response.philosopherName} respondeu: ${response.content}\n\n`;
  }

  if (round === 3 && userIntervention) {
    context += `O usuário interveio: ${userIntervention}\n\n`;
  }

  const ownPreviousResponses = previousResponses.filter(
    (r) => r.philosopherName === targetPhilosopher.name
  );

  if (ownPreviousResponses.length > 0) {
    const lastOwnResponse =
      ownPreviousResponses[ownPreviousResponses.length - 1];
    context += `Anteriormente, você respondeu: ${lastOwnResponse.content}\n\n`;
  }

  if (round === 1) {
    context += `Você é ${targetPhilosopher.name}. ${targetPhilosopher.corePhilosophy}. Responda ao dilema do usuário.`;
  } else {
    context += `Você é ${targetPhilosopher.name}. Como você responde?`;
  }

  return context;
}
