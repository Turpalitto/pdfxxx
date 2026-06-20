import { expect, test } from "@playwright/test";

test.describe("workflow page", () => {
  test("renders the chain builder and shared palette", async ({ page }) => {
    await page.goto("/workflow");

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /Build a chain of tools|Соберите цепочку из инструментов/i,
    );

    // Upload dropzone is the shared FileUpload component.
    await expect(page.getByTestId("dropzone-file-upload")).toBeVisible();

    // App is light-only — assert the stable light palette like the other pages.
    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark"),
    );
    expect(isDark).toBe(false);
  });

  test("adding a palette step builds the pipeline", async ({ page }) => {
    await page.goto("/workflow");

    const pipeline = page.getByTestId("workflow-pipeline");
    await expect(pipeline).toHaveCount(0);

    // Add two chainable steps from the palette.
    await page.getByTestId("workflow-add-compress").click();
    await page.getByTestId("workflow-add-watermark").click();

    await expect(pipeline).toBeVisible();
    await expect(pipeline.locator("> li")).toHaveCount(2);

    // Run stays disabled until a file is uploaded.
    await expect(page.getByTestId("workflow-run")).toBeDisabled();
  });
});
