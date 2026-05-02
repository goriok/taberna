export interface PhilosopherConfig {
  id: string;
  name: string;
  shortName: string;
  era: string;
  corePhilosophy: string;
  keyConcepts: Array<{ term: string; definition: string }>;
  method: string;
  vocabulary: string[];
  writingStyle: string;
  quirks: string;
  antiPatterns: string[];
  model: string;
  systemPrompt: string;
  /** Set to false to exclude from debates and dim the card visually */
  enabled?: boolean;
}
