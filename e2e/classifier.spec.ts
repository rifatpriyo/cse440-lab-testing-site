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

  await expect(page.getByLabel("Person A")).toBeVisible();
  await expect(page.getByLabel("Person B")).toBeVisible();
  await page.getByLabel("Person A").fill("Remember when I helped you?");
  await page.getByLabel("Person B").fill("Yes.");

  await page.getByRole("button", { name: "+ Add Turn" }).click();
  await expect(page.getByLabel("Person A")).toHaveCount(2);
  await page.getByRole("button", { name: "Remove turn 3" }).click();
  await expect(page.getByPlaceholder("Type conversation...")).toHaveCount(2);

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
