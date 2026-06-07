import { describe, expect, it } from "vitest";
import { extractJSON } from "./extractor";

describe("extractJSON", () => {
  it("returns fallback when input has no JSON", () => {
    expect(extractJSON("sem nenhum json aqui", null)).toBeNull();
  });

  it("parses clean JSON object", () => {
    expect(extractJSON('{"fomo_index": 3}', null)).toEqual({ fomo_index: 3 });
  });

  it("parses JSON inside markdown fence", () => {
    const raw = 'Aqui está a análise:\n```json\n{"quality_signal": "craft"}\n```';
    expect(extractJSON(raw, null)).toEqual({ quality_signal: "craft" });
  });

  it("returns fallback for malformed JSON in fence", () => {
    const raw = "```json\n{broken json\n```";
    expect(extractJSON(raw, { fallback: true })).toEqual({ fallback: true });
  });

  it("returns fallback for malformed inline JSON", () => {
    expect(extractJSON("{not valid json}", null)).toBeNull();
  });

  it("extracts JSON when preceded by prose without fence", () => {
    const raw = 'Minha análise: {"fomo_index": 4, "burnout_risk": "high"}';
    expect(extractJSON(raw, null)).toEqual({ fomo_index: 4, burnout_risk: "high" });
  });
});
