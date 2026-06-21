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

  test("home search and command palette navigate to matching tools", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("input-tool-search").fill("markdown");
    await expect(page.getByRole("link", { name: /PDF to Markdown/i }).first()).toBeVisible();

    await page.keyboard.press("Control+K");
    await expect(page.getByPlaceholder(/What do you need to do with a PDF/i)).toBeVisible();
    await page.getByPlaceholder(/What do you need to do with a PDF/i).fill("powerpoint");
    await page.getByText("PDF to PowerPoint").click();

    await expect(page).toHaveURL(/\/tools\/pdf-to-pptx$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/PDF to PowerPoint/i);
  });

  test("pricing page renders plans", async ({ page }) => {
    await page.goto("/pricing");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/PDFX/);
    await expect(page.getByText("Free").first()).toBeVisible();
    await expect(page.getByText("Pro").first()).toBeVisible();
    await expect(page.getByText("Team").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("tool pages keep the shared palette", async ({ page }) => {
    await page.goto("/tools/pdf-to-excel");

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/PDF в Excel|PDF to Excel/i);
    await expect(page.getByTestId("dropzone-file-upload")).toBeVisible();

    // App is light-only (theme switching was removed); assert the stable light palette.
    const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(isDark).toBe(false);

    await page.goto("/");
    await expect(page.getByRole("banner")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
