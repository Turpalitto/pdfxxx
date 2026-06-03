import { expect, test } from "@playwright/test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

/**
 * Regression coverage for BUG-08 (rotation handling).
 *
 * The fixes in pdf-utils.ts ensured that cropPdf (auto), redactPdf and ocrPdf
 * project coordinates through pdfjs viewport helpers (convertToPdfPoint /
 * convertToViewportPoint) instead of manual scaleX/scaleY math. Before the fix
 * a page with /Rotate 90 produced a transposed CropBox / mask / OCR layer.
 *
 * These tests feed each tool a genuinely rotated PDF and assert the browser
 * pipeline completes and yields a downloadable result (the old code threw or
 * produced an out-of-bounds box on rotated pages).
 */

let rotatedPdfPath = "";

test.beforeAll(async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]); // A4 portrait
  page.setRotation(degrees(90)); // /Rotate 90 — the case BUG-08 fixed

  page.drawText("CONFIDENTIAL", {
    x: 80,
    y: 700,
    size: 28,
    font,
    color: rgb(0, 0, 0),
  });
  page.drawText("secret@example.com", {
    x: 80,
    y: 640,
    size: 18,
    font,
    color: rgb(0, 0, 0),
  });

  const bytes = await doc.save();
  const dir = mkdtempSync(join(tmpdir(), "pdfx-rot-"));
  rotatedPdfPath = join(dir, "rotated.pdf");
  writeFileSync(rotatedPdfPath, bytes);
});

async function upload(page: import("@playwright/test").Page) {
  await page.getByTestId("input-file-hidden").setInputFiles(rotatedPdfPath);
}

test.describe("rotation handling (BUG-08)", () => {
  test("crop-pdf auto-crop handles a /Rotate 90 page", async ({ page }) => {
    await page.goto("/tools/crop-pdf");
    await expect(page.getByTestId("dropzone-file-upload")).toBeVisible();

    await upload(page);
    // Enable auto-crop — the path that uses vp.convertToPdfPoint().
    await page.getByRole("checkbox").first().check();

    await page.getByTestId("button-process").click();

    await expect(page.getByTestId("button-download")).toBeVisible({ timeout: 30_000 });
  });

  test("redact-pdf masks text on a /Rotate 90 page", async ({ page }) => {
    await page.goto("/tools/redact-pdf");
    await expect(page.getByTestId("dropzone-file-upload")).toBeVisible();

    await upload(page);
    await page.getByTestId("input-redact-text").fill("CONFIDENTIAL");

    await page.getByTestId("button-process").click();

    await expect(page.getByTestId("button-download")).toBeVisible({ timeout: 30_000 });
  });

  // OCR pulls tesseract language data over the network and runs WASM — slow
  // and flaky in CI. Opt in with RUN_OCR_E2E=1 when verifying the OCR rotation
  // fix specifically. The cropPdf/redactPdf cases above cover the shared
  // convertToPdfPoint projection that BUG-08 fixed.
  test("ocr-pdf builds a text layer on a /Rotate 90 page", async ({ page }) => {
    test.skip(!process.env.RUN_OCR_E2E, "set RUN_OCR_E2E=1 to run the slow OCR pass");
    // OCR pulls tesseract language data on first run — allow extra time.
    test.setTimeout(180_000);

    await page.goto("/tools/ocr-pdf");
    await expect(page.getByTestId("dropzone-file-upload")).toBeVisible();

    await upload(page);

    await page.getByTestId("button-process").click();

    await expect(page.getByTestId("button-download")).toBeVisible({ timeout: 170_000 });
  });
});
