import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PhilosopherCard } from "@/components/PhilosopherCard";
import { PhilosopherConfig } from "@/types/philosopher";
import { PhilosopherResponse } from "@/types/debate";

const mockPhilosopher: PhilosopherConfig = {
  id: "socrates",
  name: "Socrates",
  shortName: "Sócrates",
  era: "Antiguidade Clássica",
  corePhilosophy: "Conhece-te a ti mesmo",
  keyConcepts: [{ term: "Maiêutica", definition: "Arte de dar à luz ideias" }],
  method: "Ironia e maiêutica",
  vocabulary: ["alma", "virtude", "verdade"],
  writingStyle: "Dialético",
  quirks: "Finge ignorância",
  antiPatterns: ["Dogmatismo"],
    model: "claude-sonnet-4-5",
  systemPrompt: "Você é Sócrates...",
};

function createResponse(status: PhilosopherResponse["status"], content: string): PhilosopherResponse {
  return {
    philosopherName: "Socrates",
    round: 1,
    content,
    status,
  };
}

describe("PhilosopherCard", () => {
  it("renders idle state with philosopher name and era", () => {
    render(<PhilosopherCard philosopher={mockPhilosopher} response={null} isActive={false} />);

    expect(screen.getByText("Socrates")).toBeTruthy();
    expect(screen.getByText("Antiguidade Clássica · Sócrates")).toBeTruthy();
    expect(screen.getByText("Aguardando sua vez de falar…")).toBeTruthy();
  });

  it("renders streaming state with response content and cursor", () => {
    const response = createResponse("streaming", "Conhece-te a ti mesmo");
    render(<PhilosopherCard philosopher={mockPhilosopher} response={response} isActive={true} />);

    expect(screen.getByText("Conhece-te a ti mesmo")).toBeTruthy();
    expect(screen.getByTestId("philosopher-card").className).toContain("border-amber");
  });

  it("renders complete state with full response", () => {
    const response = createResponse("complete", "A vida não examinada não vale a pena ser vivida.");
    render(<PhilosopherCard philosopher={mockPhilosopher} response={response} isActive={false} />);

    expect(
      screen.getByText("A vida não examinada não vale a pena ser vivida.")
    ).toBeTruthy();
    expect(screen.getByTestId("philosopher-card").className).toContain("border-accent");
  });

  it("renders error state with meditando em silencio message", () => {
    const response = createResponse("error", "");
    render(<PhilosopherCard philosopher={mockPhilosopher} response={response} isActive={false} />);

    expect(screen.getByText("Sócrates está meditando em silêncio…")).toBeTruthy();
    expect(screen.getByTestId("philosopher-card").className).toContain("opacity-60");
  });
});
