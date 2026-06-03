import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const fixture = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "rotated.pdf",
);

test.describe("edit-pdf mobile layout", () => {
  test("editor loads, toolbar fits, thumbnails drawer works", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chrome", "mobile-only layout test");

    await page.goto("/tools/edit-pdf");

    // Upload a PDF to enter the editor view
    await page.setInputFiles('input[type="file"][accept=".pdf"]', fixture);

    // Editor is ready when the Save button is visible
    await expect(page.getByTestId("button-save-pdf")).toBeVisible({ timeout: 30_000 });

    // No horizontal overflow on mobile
    const dims = await page.evaluate(() => ({
      bodyWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(dims.bodyWidth).toBeLessThanOrEqual(dims.viewportWidth + 1);

    await page.screenshot({ path: testInfo.outputPath("editor-mobile-toolbar.png"), fullPage: false });

    // Desktop sidebar must be hidden on mobile
    const sidebar = page.locator("div.hidden.md\\:flex").first();
    await expect(sidebar).toBeHidden();

    // Open the mobile thumbnails drawer
    await page.getByRole("button", { name: /Страницы|Pages/ }).click();
    const firstThumb = page.getByRole("img", { name: "Page 1" }).first();
    await expect(firstThumb).toBeVisible();

    await page.screenshot({ path: testInfo.outputPath("editor-mobile-drawer.png"), fullPage: false });

    // Close by tapping the backdrop (right of the ≤80vw drawer panel)
    const vw = await page.evaluate(() => window.innerWidth);
    await page.mouse.click(vw - 5, 300);
    await expect(firstThumb).toBeHidden();
  });
});
