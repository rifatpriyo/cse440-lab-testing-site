import { expect, test } from "@playwright/test";

test.skip(
  process.env.REAL_MODEL_TEST !== "1",
  "Set REAL_MODEL_TEST=1 while the local FastAPI server and LR_C1.joblib are available."
);

test("shows a genuine LR_C1 prediction", async ({ page }, testInfo) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("main[data-hydrated='true']")).toHaveCount(1);

  await page.getByLabel("Person A").fill("Remember when I helped you?");
  await page.getByLabel("Person B").fill("Then you should do this for me.");
  await page.getByRole("button", { name: "Analyze Conversation" }).click();

  await expect(page.getByRole("heading", { name: "Guilt Tripping" })).toBeVisible();
  await expect(page.getByText("29.8%")).toHaveCount(2);
  await page.getByText("View Details").click();
  await expect(page.getByRole("progressbar")).toHaveCount(7);

  const fitsViewport = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth
  );
  expect(fitsViewport).toBe(true);

  await page.screenshot({
    path: "test-results/real-model-" + testInfo.project.name + ".png",
    fullPage: true
  });
});
