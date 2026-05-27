import { expect, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const dimensions = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
}

test.describe("public pages", () => {
  test("home page renders the premium tool catalog", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/PDF|ПДФ/i);
    await expect(page.getByRole("link", { name: /Все инструменты|All tools/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Выберите инструмент|Choose your tool/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("pricing page renders plans", async ({ page }) => {
    await page.goto("/pricing");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/PDFX/);
    await expect(page.getByText("Free").first()).toBeVisible();
    await expect(page.getByText("Pro").first()).toBeVisible();
    await expect(page.getByText("Team").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("tool pages keep the shared palette and theme toggle", async ({ page }) => {
    await page.goto("/tools/pdf-to-excel");

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/PDF в Excel|PDF to Excel/i);
    await expect(page.getByTestId("dropzone-file-upload")).toBeVisible();

    const initialTheme = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    await page.getByRole("button", { name: initialTheme ? "Switch to light mode" : "Switch to night mode" }).click();

    await expect.poll(async () => (
      page.evaluate(() => document.documentElement.classList.contains("dark"))
    )).toBe(!initialTheme);

    await page.goto("/");
    await expect.poll(async () => (
      page.evaluate(() => document.documentElement.classList.contains("dark"))
    )).toBe(!initialTheme);
    await expectNoHorizontalOverflow(page);
  });
});
