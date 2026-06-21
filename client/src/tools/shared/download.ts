import type { ToolOutputDefinition } from "../types";

export type SplitMode = "range" | "every-n" | "all";

export type ToolDownloadPlan =
  | {
      kind: "blob";
      bytes: Uint8Array;
      filename: string;
      mimeType: string;
    }
  | {
      kind: "text";
      text: string;
      filename: string;
    }
  | {
      kind: "html";
      html: string;
      filename: string;
    };

export interface ToolDownloadContext {
  slug: string;
  originalFilename?: string;
  output: ToolOutputDefinition;
  resultBytes?: Uint8Array | null;
  resultText?: string | null;
  resultHtml?: string | null;
  splitMode?: SplitMode;
}

function baseName(filename: string | undefined): string {
  return filename?.replace(/\.[^.]+$/, "") || "output";
}

function isZip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function textExtension(output: ToolOutputDefinition): string {
  if (output.kind === "json") {
    return "json";
  }

  if (output.kind === "markdown") {
    return "md";
  }

  return output.extension || "txt";
}

function blobFilename(slug: string, originalName: string, bytes: Uint8Array, output: ToolOutputDefinition, splitMode?: SplitMode): string {
  if (slug === "pdf-to-jpg" || slug === "pdf-to-png" || slug === "extract-images") {
    return `${originalName}-pdfx-images.zip`;
  }

  if (slug === "split-pdf" && (splitMode === "all" || splitMode === "every-n")) {
    return `${originalName}-split.zip`;
  }

  if (slug === "split-by-size") {
    return isZip(bytes) ? `${originalName}-split-by-size.zip` : `${originalName}-pdfx.pdf`;
  }

  if (slug === "split-by-chapters") {
    return isZip(bytes) ? `${originalName}-chapters.zip` : `${originalName}-chapters.pdf`;
  }

  return `${originalName}-pdfx.${output.extension || "pdf"}`;
}

function blobMimeType(slug: string, bytes: Uint8Array, output: ToolOutputDefinition): string {
  if (slug === "split-by-size" || slug === "split-by-chapters") {
    return isZip(bytes) ? "application/zip" : "application/pdf";
  }

  if (slug === "split-pdf" && isZip(bytes)) {
    return "application/zip";
  }

  return output.mimeType;
}

export function createToolDownloadPlan(context: ToolDownloadContext): ToolDownloadPlan | null {
  const originalName = baseName(context.originalFilename);

  if (context.resultText !== null && context.resultText !== undefined) {
    const textKinds = new Set<ToolOutputDefinition["kind"]>(["text", "json", "markdown"]);

    if (textKinds.has(context.output.kind)) {
      return {
        kind: "text",
        text: context.resultText,
        filename: `${originalName}-pdfx.${textExtension(context.output)}`,
      };
    }
  }

  if (context.resultHtml !== null && context.resultHtml !== undefined && context.output.kind === "html") {
    return {
      kind: "html",
      html: context.resultHtml,
      filename: `${originalName}-pdfx.html`,
    };
  }

  if (!context.resultBytes) {
    return null;
  }

  return {
    kind: "blob",
    bytes: context.resultBytes,
    filename: blobFilename(context.slug, originalName, context.resultBytes, context.output, context.splitMode),
    mimeType: blobMimeType(context.slug, context.resultBytes, context.output),
  };
}
