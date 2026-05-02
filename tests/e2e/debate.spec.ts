import { test, expect, Page } from "@playwright/test";

function buildSSEBody(events: Array<Record<string, unknown>>): string {
  return events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
}

async function mockDebateRoute(page: Page, events: Array<Record<string, unknown>>) {
  await page.route("**/api/debate", async (route) => {
    const postData = route.request().postData();
    const body = postData ? JSON.parse(postData) : {};

    if (body.action === "intervene") {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: { "Cache-Control": "no-cache, no-transform" },
        body: buildSSEBody(events),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: { "Cache-Control": "no-cache, no-transform" },
      body: buildSSEBody(events),
    });
  });
}

async function mockSummaryRoute(page: Page, content: string) {
  await page.route("**/api/summary", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ content, createdAt: new Date().toISOString() }),
    });
  });
}

async function mockDebateError(page: Page, status: number, error: string) {
  await page.route("**/api/debate", async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ error }),
    });
  });
}

test.describe("Debate E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("full debate flow: submit dilemma, wait for cards, intervene, see summary", async ({ page }) => {
    await mockDebateRoute(page, [
      { type: "philosopher-start", philosopherName: "Martin Heidegger", round: 1 },
      { type: "philosopher-chunk", philosopherName: "Martin Heidegger", round: 1, chunk: "Ser " },
      { type: "philosopher-complete", philosopherName: "Martin Heidegger", round: 1, content: "Ser e tempo." },
      { type: "round-complete", round: 1 },
      { type: "waiting-for-user" },
    ]);
    await mockSummaryRoute(page, "Na noite de hoje, os filósofos debateram...");

    const input = page.getByTestId("dilemma-input");
    const submit = page.getByTestId("submit-dilemma");

    await input.fill("What is the meaning of being?");
    await submit.click();

    await expect(page.getByTestId("debate-grid")).toBeVisible();
    await expect(page.getByText("Ser e tempo.")).toBeVisible();
    await expect(page.getByTestId("intervention-area")).toBeVisible();

    await mockDebateRoute(page, [
      { type: "philosopher-start", philosopherName: "Martin Heidegger", round: 3 },
      { type: "philosopher-complete", philosopherName: "Martin Heidegger", round: 3, content: "Ser-para-a-morte." },
      { type: "round-complete", round: 3 },
    ]);

    const interventionInput = page.getByPlaceholder("Compartilhe sua reflexão, questionamento ou argumento...");
    const interveneButton = page.getByText("Intervir no Debate");

    await interventionInput.fill("My perspective on being.");
    await interveneButton.click();

    await expect(page.getByTestId("summary-display")).toBeVisible();
    await expect(page.getByText("Na noite de hoje, os filósofos debateram...")).toBeVisible();
  });

  test("mobile viewport: full debate flow at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await mockDebateRoute(page, [
      { type: "philosopher-start", philosopherName: "Martin Heidegger", round: 1 },
      { type: "philosopher-complete", philosopherName: "Martin Heidegger", round: 1, content: "Ser e tempo." },
      { type: "round-complete", round: 1 },
      { type: "waiting-for-user" },
    ]);
    await mockSummaryRoute(page, "Resumo mobile.");

    const input = page.getByTestId("dilemma-input");
    const submit = page.getByTestId("submit-dilemma");

    await input.fill("What is the meaning of being?");
    await submit.click();

    await expect(page.getByTestId("debate-grid")).toBeVisible();
    await expect(page.getByTestId("intervention-area")).toBeVisible();

    await mockDebateRoute(page, [
      { type: "philosopher-complete", philosopherName: "Martin Heidegger", round: 3, content: "Fim." },
    ]);

    await page.getByPlaceholder("Compartilhe sua reflexão, questionamento ou argumento...").fill("OK");
    await page.getByText("Intervir no Debate").click();

    await expect(page.getByTestId("summary-display")).toBeVisible();
  });

  test("error recovery: philosopher failure shows error card and debate continues", async ({ page }) => {
    await mockDebateRoute(page, [
      { type: "philosopher-start", philosopherName: "Martin Heidegger", round: 1 },
      { type: "philosopher-error", philosopherName: "Martin Heidegger", round: 1, error: "LLM timeout" },
      { type: "round-complete", round: 1 },
      { type: "waiting-for-user" },
    ]);
    await mockSummaryRoute(page, "Resumo após erro.");

    await page.getByTestId("dilemma-input").fill("What is the meaning of being?");
    await page.getByTestId("submit-dilemma").click();

    await expect(page.getByTestId("debate-grid")).toBeVisible();
    await expect(page.getByText("Heidegger está meditando em silêncio…")).toBeVisible();
    await expect(page.getByTestId("intervention-area")).toBeVisible();

    await mockDebateRoute(page, [
      { type: "philosopher-complete", philosopherName: "Martin Heidegger", round: 3, content: "Continuação." },
    ]);

    await page.getByPlaceholder("Compartilhe sua reflexão, questionamento ou argumento...").fill("OK");
    await page.getByText("Intervir no Debate").click();

    await expect(page.getByTestId("summary-display")).toBeVisible();
  });

  test("input validation: empty dilemma is rejected", async ({ page }) => {
    await mockDebateError(page, 400, "O dilema não pode estar vazio");

    const input = page.getByTestId("dilemma-input");
    const submit = page.getByTestId("submit-dilemma");

    await input.fill("short");
    await expect(submit).toBeDisabled();

    await input.fill("");
    await expect(submit).toBeDisabled();
  });

  test("input validation: too-long dilemma is rejected", async ({ page }) => {
    const input = page.getByTestId("dilemma-input");
    const submit = page.getByTestId("submit-dilemma");

    await input.fill("a".repeat(501));
    await expect(submit).toBeDisabled();

    await mockDebateError(page, 400, "Dilema muito longo. Resuma em até 500 caracteres.");

    await input.fill("a".repeat(501));
    await expect(submit).toBeDisabled();
  });

  test("reset: completing debate and clicking reset restores clean state", async ({ page }) => {
    await mockDebateRoute(page, [
      { type: "philosopher-complete", philosopherName: "Martin Heidegger", round: 1, content: "Ser e tempo." },
      { type: "waiting-for-user" },
    ]);
    await mockSummaryRoute(page, "Resumo da noite.");

    await page.getByTestId("dilemma-input").fill("What is the meaning of being?");
    await page.getByTestId("submit-dilemma").click();

    await expect(page.getByTestId("intervention-area")).toBeVisible();

    await mockDebateRoute(page, [
      { type: "philosopher-complete", philosopherName: "Martin Heidegger", round: 3, content: "Fim." },
    ]);

    await page.getByPlaceholder("Compartilhe sua reflexão, questionamento ou argumento...").fill("OK");
    await page.getByText("Intervir no Debate").click();

    await expect(page.getByTestId("summary-display")).toBeVisible();

    await page.getByText("Nova Noite na Taberna").click();

    await expect(page.getByTestId("dilemma-input")).toBeVisible();
    await expect(page.getByTestId("debate-grid")).toHaveCount(0);
    await expect(page.getByTestId("intervention-area")).toHaveCount(0);
    await expect(page.getByTestId("summary-display")).toHaveCount(0);
  });
});
