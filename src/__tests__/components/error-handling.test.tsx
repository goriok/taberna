import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorCard } from "@/components/ErrorCard";
import { Toast } from "@/components/Toast";

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test explosion");
  }
  return <div>Safe</div>;
}

describe("ErrorBoundary", () => {
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    consoleErrorSpy.mockClear();
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Hello</div>
      </ErrorBoundary>,
    );

    expect(screen.getByTestId("child")).toBeTruthy();
  });

  it("catches errors and shows fallback UI", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("A taverna está temporariamente fechada")).toBeTruthy();
    expect(screen.getByText("Algo inesperado aconteceu. Os filósofos estão confusos.")).toBeTruthy();
    expect(screen.getByRole("button", { name: /tentar novamente/i })).toBeTruthy();
  });

  it("logs errors to console", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("resets error state when retry is clicked", () => {
    let shouldExplode = true;
    function ControlledBomb() {
      if (shouldExplode) throw new Error("boom");
      return <div>Safe</div>;
    }

    render(
      <ErrorBoundary>
        <ControlledBomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText("A taverna está temporariamente fechada")).toBeTruthy();

    shouldExplode = false;
    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));

    expect(screen.queryByText("A taverna está temporariamente fechada")).toBeNull();
    expect(screen.getByText("Safe")).toBeTruthy();
  });
});

describe("ErrorCard", () => {
  it("renders philosopher name with meditating message", () => {
    render(<ErrorCard philosopherName="Sócrates" />);

    expect(screen.getByText("Sócrates está meditando em silêncio…")).toBeTruthy();
  });

  it("has faded opacity", () => {
    render(<ErrorCard philosopherName="Platão" />);

    const card = screen.getByTestId("error-card");
    expect(card.className).toContain("opacity-60");
  });

  it("does not render a retry button", () => {
    render(<ErrorCard philosopherName="Aristóteles" />);

    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the message", () => {
    render(<Toast message="Olá, filósofos!" variant="info" onDismiss={() => {}} />);

    expect(screen.getByText("Olá, filósofos!")).toBeTruthy();
  });

  it("auto-dismisses after 5 seconds", async () => {
    const onDismiss = vi.fn();
    render(<Toast message="Vai sumir" variant="info" onDismiss={onDismiss} />);

    expect(screen.getByText("Vai sumir")).toBeTruthy();

    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  it("calls onDismiss when close button is clicked", () => {
    const onDismiss = vi.fn();
    render(<Toast message="Clique para fechar" variant="info" onDismiss={onDismiss} />);

    fireEvent.click(screen.getByLabelText(/fechar notificação/i));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders info variant with copper styling", () => {
    render(<Toast message="Info" variant="info" onDismiss={() => {}} />);

    const toast = screen.getByTestId("toast");
    expect(toast.className).toContain("border-accent");
  });

  it("renders success variant with green styling", () => {
    render(<Toast message="Sucesso" variant="success" onDismiss={() => {}} />);

    const toast = screen.getByTestId("toast");
    expect(toast.className).toContain("border-primary");
  });

  it("renders error variant with red styling", () => {
    render(<Toast message="Erro" variant="error" onDismiss={() => {}} />);

    const toast = screen.getByTestId("toast");
    expect(toast.className).toContain("border-red-700");
  });
});
