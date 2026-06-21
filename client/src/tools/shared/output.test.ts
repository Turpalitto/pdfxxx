import { describe, expect, it } from "vitest";
import { createToolResultReport, validateToolOutput } from "./output";
import type { ToolOutputDefinition } from "../types";

const pdfOutput: ToolOutputDefinition = { kind: "pdf", extension: "pdf", mimeType: "application/pdf" };
const zipOutput: ToolOutputDefinition = { kind: "zip", extension: "zip", mimeType: "application/zip" };
const docxOutput: ToolOutputDefinition = {
  kind: "docx",
  extension: "docx",
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

describe("tool output validation", () => {
  it("accepts PDF and rejects empty or mismatched PDF output", () => {
    expect(validateToolOutput(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), pdfOutput).ok).toBe(true);
    expect(validateToolOutput(new Uint8Array(), pdfOutput).ok).toBe(false);
    expect(validateToolOutput(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), pdfOutput).ok).toBe(false);
  });

  it("accepts archive outputs and dynamic split PDF fallbacks", () => {
    expect(validateToolOutput(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), zipOutput).ok).toBe(true);
    expect(validateToolOutput(new Uint8Array([0x25, 0x50, 0x44, 0x46]), zipOutput).ok).toBe(true);
    expect(validateToolOutput(new Uint8Array([0x7b, 0x7d]), zipOutput).ok).toBe(false);
  });

  it("treats office files as zip containers", () => {
    expect(validateToolOutput(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), docxOutput).ok).toBe(true);
    expect(validateToolOutput(new Uint8Array([0x25, 0x50, 0x44, 0x46]), docxOutput).ok).toBe(false);
  });

  it("creates a compact size report", () => {
    expect(createToolResultReport(1000, 700, pdfOutput)).toEqual({
      inputBytes: 1000,
      outputBytes: 700,
      outputKind: "pdf",
      outputExtension: "pdf",
      reductionPercent: 30,
    });
  });
});
