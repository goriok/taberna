import type { PhilosopherConfig } from "@/types/philosopher";

const PHILOSOPHER_SCHEMAS: Record<string, string> = {
  han: `{
  "fomo_index": <integer 1-5, where 5 = maximum FOMO acceleration>,
  "burnout_risk": <"low"|"medium"|"high">,
  "contemplative_value": <"low"|"medium"|"high">,
  "summary_pt": <"diagnóstico em pt-BR, máx 120 chars">
}`,
  sennett: `{
  "quality_signal": <"craft"|"velocity"|"mixed">,
  "tacit_knowledge_present": <boolean>,
  "craft_resistance": <"low"|"medium"|"high">,
  "summary_pt": <"diagnóstico em pt-BR, máx 120 chars">
}`,
  marcuse: `{
  "one_dimensionality_risk": <"low"|"medium"|"high">,
  "false_need_detected": <boolean>,
  "critical_distance": <"absent"|"partial"|"present">,
  "summary_pt": <"diagnóstico em pt-BR, máx 120 chars">
}`,
};

const DEFAULT_SCHEMA = `{ "summary_pt": "<string>" }`;

export function buildAnalysisPrompt(
  philosopher: PhilosopherConfig,
  text: string,
  title: string,
  url?: string,
): string {
  const schema = PHILOSOPHER_SCHEMAS[philosopher.id] ?? DEFAULT_SCHEMA;
  const lines = [
    "Analise o texto abaixo sob sua perspectiva filosófica.",
    "Retorne APENAS um objeto JSON válido no formato especificado. Sem prosa, sem markdown, sem explicações.",
    "",
    "Schema esperado:",
    schema,
    "",
    `Título: ${title}`,
  ];
  if (url) lines.push(`URL: ${url}`);
  lines.push("", "Texto:", text.slice(0, 8000));
  return lines.join("\n");
}
