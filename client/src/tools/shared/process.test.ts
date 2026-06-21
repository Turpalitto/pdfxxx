import { beforeEach, describe, expect, it, vi } from "vitest";
import { runPdfTask } from "@/workers/worker-client";
import { getToolRegistryEntry } from "../registry";
import {
  createToolTextResult,
  runToolMainThreadTask,
  runToolWorkerTask,
  shouldSimulateToolProgress,
} from "./process";

vi.mock("@/workers/worker-client", () => ({
  runPdfTask: vi.fn(async (_op, fallback) => fallback()),
}));

const mockedRunPdfTask = vi.mocked(runPdfTask);

function expectEntry(slug: string) {
  const entry = getToolRegistryEntry(slug);

  expect(entry).toBeDefined();

  return entry;
}

describe("tool process metadata", () => {
  beforeEach(() => {
    mockedRunPdfTask.mockClear();
  });

  it("keeps callback-progress tools out of simulated progress", () => {
    for (const slug of ["redact-pdf", "grayscale-pdf", "compare-pdf", "auto-redact", "pdf-diff"]) {
      const entry = expectEntry(slug);

      if (!entry) {
        continue;
      }

      expect(entry.execution.progress).toBe("callback");
      expect(shouldSimulateToolProgress(entry)).toBe(false);
    }
  });

  it("preserves simulated progress for worker tools without established callback UI", () => {
    for (const slug of ["pdf-to-png", "extract-images", "pdf-to-pptx"]) {
      const entry = expectEntry(slug);

      if (!entry) {
        continue;
      }

      expect(entry.execution.workerOp).toBeDefined();
      expect(entry.execution.progress).toBe("simulated");
      expect(shouldSimulateToolProgress(entry)).toBe(true);
    }
  });

  it("uses simulated progress for main-thread tools", () => {
    const entry = expectEntry("merge-pdf");

    if (!entry) {
      return;
    }

    expect(entry.execution.mode).toBe("main-thread");
    expect(shouldSimulateToolProgress(entry)).toBe(true);
  });

  it("creates display-ready bytes for text-like tool results from output metadata", () => {
    const expectations = [
      { slug: "pdf-to-text", target: "text" },
      { slug: "pdf-to-html", target: "html" },
      { slug: "pdf-bookmarks", target: "text" },
      { slug: "extract-forms", target: "text" },
      { slug: "pdf-to-markdown", target: "text" },
    ] as const;

    for (const expectation of expectations) {
      const entry = expectEntry(expectation.slug);

      if (!entry) {
        continue;
      }

      const result = createToolTextResult(entry, "Generated content");

      expect(result.target).toBe(expectation.target);
      expect(result.content).toBe("Generated content");
      expect(new TextDecoder().decode(result.bytes)).toBe("Generated content");
    }
  });

  it("rejects text result creation for binary outputs", () => {
    const entry = expectEntry("merge-pdf");

    if (!entry) {
      return;
    }

    expect(() => createToolTextResult(entry, "Generated content"))
      .toThrow('Tool "merge-pdf" does not produce a text-like result.');
  });

  it("runs worker tools through the registry worker op", async () => {
    const entry = expectEntry("grayscale-pdf");
    const file = new File(["%PDF-1.7"], "input.pdf", { type: "application/pdf" });
    const fallback = vi.fn(async () => new Uint8Array([1, 2, 3]));

    if (!entry) {
      return;
    }

    const result = await runToolWorkerTask(entry, fallback, { file });

    expect(result).toEqual(new Uint8Array([1, 2, 3]));
    expect(mockedRunPdfTask).toHaveBeenCalledWith("grayscalePdf", fallback, { file });
  });

  it("rejects worker execution when registry metadata has no worker op", async () => {
    const entry = expectEntry("merge-pdf");
    const file = new File(["%PDF-1.7"], "input.pdf", { type: "application/pdf" });

    if (!entry) {
      return;
    }

    await expect(runToolWorkerTask(entry, async () => new Uint8Array(), { file }))
      .rejects
      .toThrow('Tool "merge-pdf" is missing worker metadata.');
  });

  it("runs main-thread tools without touching the worker client", async () => {
    const entry = expectEntry("merge-pdf");
    const task = vi.fn(async () => new Uint8Array([4, 5, 6]));

    if (!entry) {
      return;
    }

    const result = await runToolMainThreadTask(entry, task);

    expect(result).toEqual(new Uint8Array([4, 5, 6]));
    expect(task).toHaveBeenCalledOnce();
    expect(mockedRunPdfTask).not.toHaveBeenCalled();
  });

  it("rejects main-thread execution for hybrid worker tools", async () => {
    const entry = expectEntry("grayscale-pdf");

    if (!entry) {
      return;
    }

    await expect(runToolMainThreadTask(entry, async () => new Uint8Array()))
      .rejects
      .toThrow('Tool "grayscale-pdf" is not registered as a main-thread tool.');
  });
});
