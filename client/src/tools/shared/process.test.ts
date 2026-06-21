import { describe, expect, it } from "vitest";
import { getToolRegistryEntry } from "../registry";
import { shouldSimulateToolProgress } from "./process";

function expectEntry(slug: string) {
  const entry = getToolRegistryEntry(slug);

  expect(entry).toBeDefined();

  return entry;
}

describe("tool process metadata", () => {
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
});
