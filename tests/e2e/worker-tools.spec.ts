import { expect, test } from "@playwright/test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * Browser verification for the Web Worker migration (Round 17–18).
 *
 * pdf-utils functions grayscalePdf / invertColors / pdfToImages / scannerEffect
 * / removeBlankPages / nUpPdf / toSinglePage / bookletImposition now run inside
 * a dedicated Web Worker (client/src/workers/) with a main-thread fallback.
 *
 * check/test/build only prove they compile. These tests prove the worker path
 * actually executes in a real browser:
 *   1. each tool produces a downloadable result;
 *   2. a dedicated `pdf-worker` is genuinely spawned (not the fallback);
 *   3. no "falling back to main thread" warning is emitted;
 *   4. the Cancel button aborts an in-flight worker job and returns to idle.
 */

// Multi-page fixture (page 3 is intentionally blank to exercise the
// remove-blank-pages pixel path).
let multiPagePdfPath = "";
// Heavier fixture for the cancel test — enough pages that scanner-effect is
// still running when we click Cancel.
let heavyPdfPath = "";
// Second file for the two-file tools (compare-pdf / pdf-diff) — different text
// so there is an actual difference to render/mark.
let secondPdfPath = "";
// Fixture containing an email address — exercises auto-redact's canvas
// redaction path (redactEmails is on by default) inside the worker.
let redactPdfPath = "";

test.beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), "pdfx-worker-"));

  // --- multi-page fixture ---
  {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    for (let i = 0; i < 5; i++) {
      const page = doc.addPage([595, 842]);
      if (i !== 2) {
        // page index 2 left blank on purpose
        page.drawText(`Page ${i + 1} — worker test content`, {
          x: 60,
          y: 760,
          size: 20,
          font,
          color: rgb(0, 0, 0),
        });
        page.drawText("The quick brown fox jumps over the lazy dog.", {
          x: 60,
          y: 720,
          size: 14,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
      }
    }
    const bytes = await doc.save();
    multiPagePdfPath = join(dir, "multipage.pdf");
    writeFileSync(multiPagePdfPath, bytes);
  }

  // --- heavy fixture (cancel test) ---
  {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    for (let i = 0; i < 24; i++) {
      const page = doc.addPage([595, 842]);
      for (let line = 0; line < 30; line++) {
        page.drawText(
          `Line ${line} of page ${i + 1} — dense text so rendering takes a while.`,
          { x: 40, y: 800 - line * 25, size: 12, font, color: rgb(0, 0, 0) }
        );
      }
    }
    const bytes = await doc.save();
    heavyPdfPath = join(dir, "heavy.pdf");
    writeFileSync(heavyPdfPath, bytes);
  }

  // --- second fixture (compare-pdf / pdf-diff) ---
  {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    for (let i = 0; i < 5; i++) {
      const page = doc.addPage([595, 842]);
      page.drawText(`Page ${i + 1} — DIFFERENT content for comparison`, {
        x: 60,
        y: 760,
        size: 20,
        font,
        color: rgb(0, 0, 0),
      });
    }
    const bytes = await doc.save();
    secondPdfPath = join(dir, "second.pdf");
    writeFileSync(secondPdfPath, bytes);
  }

  // --- redact fixture (auto-redact) ---
  {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    for (let i = 0; i < 3; i++) {
      const page = doc.addPage([595, 842]);
      page.drawText(`Page ${i + 1} — contact: john.doe@example.com`, {
        x: 60,
        y: 760,
        size: 18,
        font,
        color: rgb(0, 0, 0),
      });
    }
    const bytes = await doc.save();
    redactPdfPath = join(dir, "redact.pdf");
    writeFileSync(redactPdfPath, bytes);
  }
});

async function upload(page: import("@playwright/test").Page, path: string) {
  await page.getByTestId("input-file-hidden").setInputFiles(path);
}

// slug → human-readable label (for failure messages only)
const WORKER_TOOLS: { slug: string; name: string }[] = [
  { slug: "grayscale-pdf", name: "Grayscale" },
  { slug: "invert-colors", name: "Invert colors" },
  { slug: "pdf-to-jpg", name: "PDF → JPG" },
  { slug: "pdf-to-png", name: "PDF → PNG" },
  { slug: "scanner-effect", name: "Scanner effect" },
  { slug: "remove-blank-pages", name: "Remove blank pages" },
  { slug: "n-up-pdf", name: "N-up" },
  { slug: "to-single-page", name: "To single page" },
  { slug: "booklet-imposition", name: "Booklet imposition" },
];

test.describe("worker-backed tools produce a result in the browser", () => {
  for (const tool of WORKER_TOOLS) {
    test(`${tool.slug} completes and yields a download`, async ({ page }) => {
      const fallbackWarnings: string[] = [];
      page.on("console", (msg) => {
        if (msg.text().includes("falling back to main thread")) {
          fallbackWarnings.push(msg.text());
        }
      });

      await page.goto(`/tools/${tool.slug}`);
      await expect(page.getByTestId("dropzone-file-upload")).toBeVisible();

      await upload(page, multiPagePdfPath);
      await page.getByTestId("button-process").click();

      await expect(page.getByTestId("button-download")).toBeVisible({ timeout: 45_000 });

      // The worker path should have been used — no fallback to main thread.
      expect(fallbackWarnings, fallbackWarnings.join("\n")).toHaveLength(0);
    });
  }
});

test.describe("worker infrastructure", () => {
  test("a dedicated pdf-worker is spawned in the browser", async ({ page }) => {
    // Capture worker creation BEFORE triggering the operation.
    const workerPromise = page
      .waitForEvent("worker", {
        predicate: (w) => /pdf-worker/.test(w.url()),
        timeout: 45_000,
      })
      .catch(() => null);

    await page.goto("/tools/grayscale-pdf");
    await expect(page.getByTestId("dropzone-file-upload")).toBeVisible();

    // Confirm the browser actually supports the worker path (else it's fallback).
    const supported = await page.evaluate(
      () => typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined"
    );
    expect(supported, "browser lacks Worker/OffscreenCanvas").toBe(true);

    await upload(page, multiPagePdfPath);
    await page.getByTestId("button-process").click();

    const worker = await workerPromise;
    expect(worker, "expected a dedicated pdf-worker to be created").not.toBeNull();

    await expect(page.getByTestId("button-download")).toBeVisible({ timeout: 45_000 });
  });
});

test.describe("cancel aborts an in-flight worker job", () => {
  test("Cancel returns the tool to idle without an error", async ({ page }) => {
    await page.goto("/tools/scanner-effect");
    await expect(page.getByTestId("dropzone-file-upload")).toBeVisible();

    await upload(page, heavyPdfPath);
    await page.getByTestId("button-process").click();

    // Cancel button only shows while processing.
    const cancel = page.getByTestId("button-cancel");
    await expect(cancel).toBeVisible({ timeout: 15_000 });
    await cancel.click();

    // Back to idle: the process button reappears (error state would show
    // try-again instead, done state would show download).
    await expect(page.getByTestId("button-process")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("button-download")).toHaveCount(0);
  });
});

test.describe("two-file worker tools produce a result in the browser", () => {
  const TWO_FILE_TOOLS: { slug: string; secondInputTestId: string }[] = [
    { slug: "compare-pdf", secondInputTestId: "input-compare-file2" },
    { slug: "pdf-diff", secondInputTestId: "input-diff-file2" },
  ];

  for (const tool of TWO_FILE_TOOLS) {
    test(`${tool.slug} completes and yields a download`, async ({ page }) => {
      const fallbackWarnings: string[] = [];
      page.on("console", (msg) => {
        if (msg.text().includes("falling back to main thread")) {
          fallbackWarnings.push(msg.text());
        }
      });

      await page.goto(`/tools/${tool.slug}`);
      await expect(page.getByTestId("dropzone-file-upload")).toBeVisible();

      // First file via the main dropzone, second via the tool-specific input.
      await upload(page, multiPagePdfPath);
      await page.getByTestId(tool.secondInputTestId).setInputFiles(secondPdfPath);

      await page.getByTestId("button-process").click();

      await expect(page.getByTestId("button-download")).toBeVisible({ timeout: 45_000 });
      expect(fallbackWarnings, fallbackWarnings.join("\n")).toHaveLength(0);
    });
  }
});

test.describe("auto-redact runs its canvas path in the worker", () => {
  test("auto-redact completes and yields a download", async ({ page }) => {
    const fallbackWarnings: string[] = [];
    page.on("console", (msg) => {
      if (msg.text().includes("falling back to main thread")) {
        fallbackWarnings.push(msg.text());
      }
    });

    await page.goto("/tools/auto-redact");
    await expect(page.getByTestId("dropzone-file-upload")).toBeVisible();

    // redactEmails is on by default; the fixture contains an email, so the
    // worker exercises the render-and-mask canvas path (not just page copy).
    await upload(page, redactPdfPath);
    await page.getByTestId("button-process").click();

    await expect(page.getByTestId("button-download")).toBeVisible({ timeout: 45_000 });
    expect(fallbackWarnings, fallbackWarnings.join("\n")).toHaveLength(0);
  });
});

test.describe("redact-pdf rasterises matching pages in the worker", () => {
  test("redact-pdf completes and yields a download", async ({ page }) => {
    const fallbackWarnings: string[] = [];
    page.on("console", (msg) => {
      if (msg.text().includes("falling back to main thread")) {
        fallbackWarnings.push(msg.text());
      }
    });

    await page.goto("/tools/redact-pdf");
    await expect(page.getByTestId("dropzone-file-upload")).toBeVisible();

    await upload(page, redactPdfPath);
    // "contact" appears on every page of the redact fixture, so matching pages
    // are rendered and masked — exercising the canvas path inside the worker.
    await page.getByTestId("input-redact-text").fill("contact");
    await page.getByTestId("button-process").click();

    await expect(page.getByTestId("button-download")).toBeVisible({ timeout: 45_000 });
    expect(fallbackWarnings, fallbackWarnings.join("\n")).toHaveLength(0);
  });
});

test.describe("pdf-to-pptx runs in the worker (pptxgenjs has no DOM dependency)", () => {
  // ocrPdf is deliberately NOT covered here: tesseract.js spawns nested workers
  // that fail inside our module worker, so OCR stays on the main thread (the
  // worker path always fell back — verified via a one-off probe).
  test("pdf-to-pptx completes and yields a download", async ({ page }) => {
    const fallbackWarnings: string[] = [];
    page.on("console", (msg) => {
      if (msg.text().includes("falling back to main thread")) {
        fallbackWarnings.push(msg.text());
      }
    });

    await page.goto("/tools/pdf-to-pptx");
    await expect(page.getByTestId("dropzone-file-upload")).toBeVisible();

    await upload(page, multiPagePdfPath);
    await page.getByTestId("button-process").click();

    await expect(page.getByTestId("button-download")).toBeVisible({ timeout: 45_000 });
    expect(fallbackWarnings, fallbackWarnings.join("\n")).toHaveLength(0);
  });
});
