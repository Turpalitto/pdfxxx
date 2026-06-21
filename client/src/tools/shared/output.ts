import type { ToolOutputDefinition } from "../types";

export interface ToolOutputValidation {
  ok: boolean;
  reason?: string;
}

export interface ToolResultReport {
  inputBytes: number;
  outputBytes: number;
  outputKind: ToolOutputDefinition["kind"];
  outputExtension: string;
  reductionPercent: number | null;
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

export function validateToolOutput(
  bytes: Uint8Array | null | undefined,
  output: ToolOutputDefinition,
): ToolOutputValidation {
  if (!bytes || bytes.length === 0) {
    return { ok: false, reason: "The tool produced an empty output file." };
  }

  const isPdf = startsWith(bytes, [0x25, 0x50, 0x44, 0x46]);
  const isZip = startsWith(bytes, [0x50, 0x4b]);

  if (output.kind === "pdf" && !isPdf) {
    return { ok: false, reason: "The output does not look like a valid PDF file." };
  }

  if (output.kind === "zip" && !isZip && !isPdf) {
    return { ok: false, reason: "The output does not look like a valid archive or PDF file." };
  }

  if ((output.kind === "docx" || output.kind === "xlsx" || output.kind === "pptx") && !isZip) {
    return { ok: false, reason: `The output does not look like a valid ${output.extension.toUpperCase()} file.` };
  }

  return { ok: true };
}

export function createToolResultReport(
  inputBytes: number,
  outputBytes: number,
  output: ToolOutputDefinition,
): ToolResultReport {
  return {
    inputBytes,
    outputBytes,
    outputKind: output.kind,
    outputExtension: output.extension,
    reductionPercent: outputBytes < inputBytes ? Math.round((1 - outputBytes / inputBytes) * 100) : null,
  };
}
