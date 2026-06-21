import { describe, expect, it } from "vitest";
import { createToolDownloadPlan } from "./download";
import type { ToolOutputDefinition } from "../types";

const pdfOutput: ToolOutputDefinition = { kind: "pdf", extension: "pdf", mimeType: "application/pdf" };
const zipOutput: ToolOutputDefinition = { kind: "zip", extension: "zip", mimeType: "application/zip" };
const textOutput: ToolOutputDefinition = { kind: "text", extension: "txt", mimeType: "text/plain" };
const jsonOutput: ToolOutputDefinition = { kind: "json", extension: "json", mimeType: "application/json" };
const htmlOutput: ToolOutputDefinition = { kind: "html", extension: "html", mimeType: "text/html" };
const pptxOutput: ToolOutputDefinition = {
  kind: "pptx",
  extension: "pptx",
  mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

describe("tool download planning", () => {
  it("uses registry output metadata for text-like downloads", () => {
    expect(createToolDownloadPlan({
      slug: "pdf-to-text",
      originalFilename: "client.pdf",
      output: textOutput,
      resultText: "hello",
    })).toEqual({
      kind: "text",
      text: "hello",
      filename: "client-pdfx.txt",
    });

    expect(createToolDownloadPlan({
      slug: "extract-forms",
      originalFilename: "client.pdf",
      output: jsonOutput,
      resultText: "{}",
    })?.filename).toBe("client-pdfx.json");
  });

  it("uses registry output metadata for html and office blob downloads", () => {
    expect(createToolDownloadPlan({
      slug: "pdf-to-html",
      originalFilename: "page.pdf",
      output: htmlOutput,
      resultHtml: "<p>Hi</p>",
    })).toEqual({
      kind: "html",
      html: "<p>Hi</p>",
      filename: "page-pdfx.html",
    });

    expect(createToolDownloadPlan({
      slug: "pdf-to-pptx",
      originalFilename: "slides.pdf",
      output: pptxOutput,
      resultBytes: new Uint8Array([0x50, 0x4b]),
    })).toEqual({
      kind: "blob",
      bytes: new Uint8Array([0x50, 0x4b]),
      filename: "slides-pdfx.pptx",
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
  });

  it("preserves image archive and split naming behavior", () => {
    expect(createToolDownloadPlan({
      slug: "pdf-to-png",
      originalFilename: "scan.pdf",
      output: zipOutput,
      resultBytes: new Uint8Array([0x50, 0x4b]),
    })?.filename).toBe("scan-pdfx-images.zip");

    expect(createToolDownloadPlan({
      slug: "split-pdf",
      originalFilename: "scan.pdf",
      output: zipOutput,
      resultBytes: new Uint8Array([0x50, 0x4b]),
      splitMode: "all",
    })?.filename).toBe("scan-split.zip");
  });

  it("detects dynamic PDF versus ZIP outputs for split tools", () => {
    expect(createToolDownloadPlan({
      slug: "split-by-size",
      originalFilename: "large.pdf",
      output: zipOutput,
      resultBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
    })).toEqual({
      kind: "blob",
      bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      filename: "large-pdfx.pdf",
      mimeType: "application/pdf",
    });

    expect(createToolDownloadPlan({
      slug: "split-by-chapters",
      originalFilename: "book.pdf",
      output: zipOutput,
      resultBytes: new Uint8Array([0x50, 0x4b]),
    })).toEqual({
      kind: "blob",
      bytes: new Uint8Array([0x50, 0x4b]),
      filename: "book-chapters.zip",
      mimeType: "application/zip",
    });
  });

  it("falls back to a PDF blob plan when no text/html result is present", () => {
    expect(createToolDownloadPlan({
      slug: "merge-pdf",
      output: pdfOutput,
      resultBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
    })?.filename).toBe("output-pdfx.pdf");
  });
});
