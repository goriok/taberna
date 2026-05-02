import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TavernBackground } from "@/components/TavernBackground";
import { DecorativeDivider } from "@/components/DecorativeDivider";

describe("Design Tokens & Components", () => {
  it("TavernBackground renders without errors", () => {
    const { container } = render(<TavernBackground />);
    const bg = container.firstChild as HTMLElement;
    expect(bg).toBeTruthy();
    expect(bg.getAttribute("aria-hidden")).toBe("true");
    expect(bg.className).toContain("pointer-events-none");
    expect(bg.className).toContain("fixed");
  });

  it("DecorativeDivider renders without errors", () => {
    render(<DecorativeDivider />);
    const divider = screen.getByRole("separator", { hidden: true });
    expect(divider).toBeTruthy();
    expect(divider.getAttribute("aria-hidden")).toBe("true");
  });

  it("DecorativeDivider accepts custom width and className", () => {
    render(
      <DecorativeDivider width="50%" className="my-4" />
    );
    const divider = screen.getByRole("separator", { hidden: true });
    expect(divider.style.width).toBe("50%");
    expect(divider.className).toContain("my-4");
  });
});
