// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import Home from "@/app/page";

function createMockReader(events: Array<Record<string, unknown>>) {
  const encoder = new TextEncoder();
  let index = 0;
  return {
    read: () => {
      if (index >= events.length) {
        return Promise.resolve({ done: true, value: undefined });
      }
      const data = `data: ${JSON.stringify(events[index++])}\n\n`;
      return Promise.resolve({ done: false, value: encoder.encode(data) });
    },
    releaseLock: () => {},
  };
}

function mockFetchResponse(events: Array<Record<string, unknown>>) {
  return {
    ok: true,
    body: {
      getReader: () => createMockReader(events),
    },
  } as unknown as Response;
}

function mockJsonResponse(body: Record<string, unknown>) {
  return {
    ok: true,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("Home Page", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("disables submit button when textarea has fewer than 10 characters", () => {
    render(<Home />);
    const input = screen.getByTestId("dilemma-input") as HTMLTextAreaElement;
    const button = screen.getByTestId("submit-dilemma") as HTMLButtonElement;

    expect(button.disabled).toBe(true);

    fireEvent.change(input, { target: { value: "short" } });
    expect(button.disabled).toBe(true);
  });

  it("disables submit button when textarea has more than 2000 characters", () => {
    render(<Home />);
    const input = screen.getByTestId("dilemma-input") as HTMLTextAreaElement;
    const button = screen.getByTestId("submit-dilemma") as HTMLButtonElement;

    fireEvent.change(input, { target: { value: "a".repeat(2001) } });
    expect(button.disabled).toBe(true);
  });

  it("shows debate grid after dilemma is submitted", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse([
        {
          type: "philosopher-start",
          philosopherName: "Heidegger",
          round: 1,
        },
        {
          type: "philosopher-chunk",
          philosopherName: "Heidegger",
          round: 1,
          chunk: "Ser ",
        },
        {
          type: "philosopher-complete",
          philosopherName: "Heidegger",
          round: 1,
          content: "Ser e tempo.",
        },
        { type: "round-complete", round: 1 },
      ]),
    );

    render(<Home />);
    const input = screen.getByTestId("dilemma-input") as HTMLTextAreaElement;
    const button = screen.getByTestId("submit-dilemma") as HTMLButtonElement;

    fireEvent.change(input, {
      target: { value: "What is the meaning of being?" },
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId("debate-grid")).toBeTruthy();
    });
  });

  it("shows intervention area after waiting-for-user event", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse([
        {
          type: "philosopher-complete",
          philosopherName: "Heidegger",
          round: 1,
          content: "...",
        },
        { type: "round-complete", round: 1 },
        {
          type: "philosopher-complete",
          philosopherName: "Heidegger",
          round: 2,
          content: "...",
        },
        { type: "waiting-for-user" },
      ]),
    );

    render(<Home />);
    const input = screen.getByTestId("dilemma-input") as HTMLTextAreaElement;
    const button = screen.getByTestId("submit-dilemma") as HTMLButtonElement;

    fireEvent.change(input, {
      target: { value: "What is the meaning of being?" },
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId("intervention-area")).toBeTruthy();
    });
  });

  it("shows summary after debate-complete and summary fetch", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

    mockFetch.mockResolvedValueOnce(
      mockFetchResponse([
        {
          type: "philosopher-complete",
          philosopherName: "Heidegger",
          round: 1,
          content: "...",
        },
        { type: "waiting-for-user" },
      ]),
    );

    render(<Home />);
    const input = screen.getByTestId("dilemma-input") as HTMLTextAreaElement;
    const button = screen.getByTestId("submit-dilemma") as HTMLButtonElement;

    fireEvent.change(input, {
      target: { value: "What is the meaning of being?" },
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId("intervention-area")).toBeTruthy();
    });

    mockFetch.mockResolvedValueOnce(
      mockFetchResponse([
        {
          type: "philosopher-complete",
          philosopherName: "Heidegger",
          round: 3,
          content: "...",
        },
      ]),
    );

    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        content: "Na noite de hoje, os filósofos debateram...",
      }),
    );

    const interventionTextarea = screen.getByPlaceholderText(
      "Compartilhe sua reflexão, questionamento ou argumento...",
    ) as HTMLTextAreaElement;
    const interventionButton = screen.getByText(
      "Intervir no Debate",
    ) as HTMLButtonElement;

    fireEvent.change(interventionTextarea, {
      target: { value: "My intervention" },
    });
    fireEvent.click(interventionButton);

    await waitFor(() => {
      expect(screen.getByTestId("summary-display")).toBeTruthy();
    });

    expect(
      screen.getByText("Na noite de hoje, os filósofos debateram..."),
    ).toBeTruthy();
  });

  it("resets all state when reset button is clicked", async () => {
    const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

    mockFetch.mockResolvedValueOnce(
      mockFetchResponse([
        {
          type: "philosopher-complete",
          philosopherName: "Heidegger",
          round: 1,
          content: "...",
        },
        { type: "waiting-for-user" },
      ]),
    );

    render(<Home />);
    const input = screen.getByTestId("dilemma-input") as HTMLTextAreaElement;
    const button = screen.getByTestId("submit-dilemma") as HTMLButtonElement;

    fireEvent.change(input, {
      target: { value: "What is the meaning of being?" },
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId("intervention-area")).toBeTruthy();
    });

    mockFetch.mockResolvedValueOnce(
      mockFetchResponse([
        {
          type: "philosopher-complete",
          philosopherName: "Heidegger",
          round: 3,
          content: "...",
        },
      ]),
    );

    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ content: "Resumo da noite." }),
    );

    const interventionTextarea = screen.getByPlaceholderText(
      "Compartilhe sua reflexão, questionamento ou argumento...",
    ) as HTMLTextAreaElement;
    const interventionButton = screen.getByText(
      "Intervir no Debate",
    ) as HTMLButtonElement;

    fireEvent.change(interventionTextarea, {
      target: { value: "My intervention" },
    });
    fireEvent.click(interventionButton);

    await waitFor(() => {
      expect(screen.getByTestId("summary-display")).toBeTruthy();
    });

    const resetButton = screen.getByText("Nova Noite na Taberna");
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(screen.getByTestId("dilemma-input")).toBeTruthy();
    });

    expect(screen.queryByTestId("debate-grid")).toBeNull();
    expect(screen.queryByTestId("intervention-area")).toBeNull();
    expect(screen.queryByTestId("summary-display")).toBeNull();
  });
});
