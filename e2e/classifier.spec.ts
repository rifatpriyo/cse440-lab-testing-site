import { expect, test } from "@playwright/test";

const response = {
  prediction: "guilt_tripping",
  confidence: 0.784,
  probabilities: {
    charm_flattery: 0.01,
    direct_coercion: 0.05,
    gaslighting: 0.08,
    guilt_tripping: 0.784,
    love_bombing: 0.02,
    neutral: 0.036,
    passive_aggressive: 0.02
  }
};

test("builds a conversation and displays the API result", async ({ page }, testInfo) => {
  await page.route("**/api/predict", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("main[data-hydrated='true']")).toHaveCount(1);

  const guideButton = page.getByRole("button", { name: "How to get the best prediction" });
  await expect(guideButton).toHaveAttribute("aria-expanded", "false");
  await guideButton.click();
  await expect(page.getByText("Best match to the training data")).toBeVisible();
  await expect(page.getByText(/3–8 turns and roughly 10–90 words/)).toBeVisible();
  await guideButton.click();
  await expect(page.getByText("Best match to the training data")).toHaveCount(0);

  await expect(page.getByLabel("Person A")).toHaveCount(2);
  await expect(page.getByLabel("Person B")).toBeVisible();
  await expect(page.getByPlaceholder("Type conversation...")).toHaveCount(3);
  await page.locator("#turn-0").fill("Remember when I helped you?");
  await page.locator("#turn-1").fill("Yes.");
  await page.locator("#turn-2").fill("Then help me now.");

  await page.getByRole("button", { name: "+ Add Turn" }).click();
  await expect(page.getByLabel("Person B")).toHaveCount(2);
  await page.getByRole("button", { name: "Remove turn 4" }).click();
  await expect(page.getByPlaceholder("Type conversation...")).toHaveCount(3);

  await page.getByRole("button", { name: "Analyze Conversation" }).click();
  await expect(page.getByRole("heading", { name: "Guilt Tripping" })).toBeVisible();
  await page.getByText("View Details").click();
  await expect(page.getByRole("progressbar")).toHaveCount(7);

  const fitsViewport = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth
  );
  expect(fitsViewport).toBe(true);

  await page.screenshot({
    path: "test-results/classifier-result-" + testInfo.project.name + ".png",
    fullPage: true
  });
});
