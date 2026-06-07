import type { PhilosopherResponse, TableEvent } from "@/types/debate";

interface ExportInput {
  dilemma: string;
  responses: PhilosopherResponse[];
  userInterventions: Record<number, string>;
  tableEvents: TableEvent[];
  summary: string | null;
}

export function buildDebateMarkdown(
  input: ExportInput,
  opts?: { generatedAt?: Date },
): string {
  const { dilemma, responses, userInterventions, tableEvents, summary } = input;
  const date = (opts?.generatedAt ?? new Date()).toISOString();

  const maxRound = responses.reduce((max, r) => Math.max(max, r.round), 0);
  const lines: string[] = [];

  lines.push("# Noite na Taberna", "");
  lines.push(`> ${dilemma}`, "");
  lines.push(`_Exportado em ${date}_`, "");

  for (let round = 1; round <= maxRound; round++) {
    lines.push(`## Rodada ${round}`, "");

    const roundResponses = responses.filter(
      (r) => r.round === round && r.status === "complete",
    );

    for (const resp of roundResponses) {
      lines.push(`### ${resp.philosopherName}`, "");
      lines.push(resp.content.trim(), "");
    }

    const events = tableEvents.filter((e) => e.afterRound === round);
    for (const ev of events) {
      const verb = ev.status === "left" ? "deixou a mesa" : "entrou na mesa";
      lines.push(`_${ev.philosopherName} ${verb}: ${ev.message}_`, "");
    }

    const intervention = userInterventions[round];
    if (intervention?.trim()) {
      lines.push(`> **Intervenção do anfitrião:** ${intervention.trim()}`, "");
    }
  }

  if (summary) {
    lines.push("## Crônica da Noite", "");
    lines.push(summary.trim(), "");
  }

  return lines.join("\n");
}

export function buildDebateFilename(dilemma: string, date: Date): string {
  const slug = dilemma
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40)
    .replace(/-+$/, "");

  const dateStr = date.toISOString().slice(0, 10);
  return `taberna-${slug}-${dateStr}.md`;
}
