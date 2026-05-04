import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
    render(<PhilosopherCard philosopher={mockPhilosopher} responses={[]} currentRound={1} />);

    expect(screen.getByText("Socrates")).toBeTruthy();
    expect(screen.getByText("Antiguidade Clássica · Sócrates")).toBeTruthy();
    expect(screen.getByText("Aguardando sua vez de falar…")).toBeTruthy();
  });

  it("renders streaming state with response content and cursor", () => {
    const response = createResponse("streaming", "Conhece-te a ti mesmo");
    render(<PhilosopherCard philosopher={mockPhilosopher} responses={[response]} currentRound={1} isWaiting={true} />);

    expect(screen.getByText("Conhece-te a ti mesmo")).toBeTruthy();
    expect(screen.getByTestId("philosopher-card").className).toContain("border-amber");
  });

  it("renders complete state with full response collapsed with accent border", () => {
    const response = createResponse("complete", "A vida não examinada não vale a pena ser vivida.");
    render(<PhilosopherCard philosopher={mockPhilosopher} responses={[response]} currentRound={1} />);

    expect(screen.getByTestId("philosopher-card").className).toContain("border-accent");
    expect(screen.getByTestId("round-container").className).toContain("border-accent");
  });

  it("renders error state with meditando em silencio message", () => {
    const response = createResponse("error", "");
    render(<PhilosopherCard philosopher={mockPhilosopher} responses={[response]} currentRound={1} />);

    expect(screen.getByText("Sócrates está meditando em silêncio…")).toBeTruthy();
    expect(screen.getByTestId("philosopher-card").className).toContain("opacity-60");
  });

  describe("CollapsibleRound - latest round behavior", () => {
    it("renders latest round initially collapsed with collapsible button", () => {
      const response = createResponse("complete", "This is the latest complete response");
      render(<PhilosopherCard philosopher={mockPhilosopher} responses={[response]} currentRound={2} />);

      expect(screen.getByText(/This is the latest complete response/)).toBeTruthy();
      const expandButton = screen.queryByRole("button");
      expect(expandButton).toBeTruthy();
    });

    it("renders latest round with accent border", () => {
      const response = createResponse("complete", "Latest response");
      render(<PhilosopherCard philosopher={mockPhilosopher} responses={[response]} currentRound={2} />);

      const roundContainer = screen.getByTestId(/round-container/);
      expect(roundContainer.className).toContain("border-accent");
    });

    it("can expand latest round by clicking button", () => {
      const response = createResponse("complete", "Full content of latest round");
      render(<PhilosopherCard philosopher={mockPhilosopher} responses={[response]} currentRound={2} />);

      const expandButton = screen.getByRole("button");
      fireEvent.click(expandButton);

      expect(screen.getByText("Full content of latest round")).toBeTruthy();
    });

    it("maintains accent border when latest round is expanded", () => {
      const response = createResponse("complete", "Latest round content");
      render(<PhilosopherCard philosopher={mockPhilosopher} responses={[response]} currentRound={2} />);

      const expandButton = screen.getByRole("button");
      expandButton.click();

      const roundContainer = screen.getByTestId(/round-container/);
      expect(roundContainer.className).toContain("border-accent");
    });

    it("can collapse previously expanded latest round", () => {
      const response = createResponse("complete", "Content to collapse");
      render(<PhilosopherCard philosopher={mockPhilosopher} responses={[response]} currentRound={2} />);

      const expandButton = screen.getByRole("button");
      expandButton.click();
      expandButton.click();

      const button = screen.getByRole("button");
      expect(button).toBeTruthy();
    });
  });

  describe("CollapsibleRound - non-latest rounds behavior", () => {
    it("renders non-latest rounds collapsed as before", () => {
      const oldResponse = createResponse("complete", "Older response from round 1");
      const newResponse = createResponse("complete", "Newer response from round 2");
      render(<PhilosopherCard philosopher={mockPhilosopher} responses={[oldResponse, newResponse]} currentRound={3} />);

      expect(screen.getByText(/Older response from round 1/)).toBeTruthy();
      const expandButton = screen.getAllByRole("button");
      expect(expandButton.length).toBeGreaterThan(0);
    });

    it("non-latest rounds do not have accent border", () => {
      const oldResponse = createResponse("complete", "Old response");
      const newResponse = createResponse("complete", "New response");
      render(<PhilosopherCard philosopher={mockPhilosopher} responses={[oldResponse, newResponse]} currentRound={3} />);

      const roundContainers = screen.getAllByTestId(/round-container/);
      const hasNonAccentBorder = roundContainers.some(container =>
        !container.className.includes("border-accent")
      );
      expect(hasNonAccentBorder).toBe(true);
    });
  });
});
