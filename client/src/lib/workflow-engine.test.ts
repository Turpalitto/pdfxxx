import { describe, expect, it } from "vitest";
import { runWorkflow, WorkflowAbortError } from "./workflow-engine";

describe("runWorkflow cancellation", () => {
  it("throws a distinguishable abort error before starting work", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(runWorkflow([], [], undefined, { signal: controller.signal })).rejects.toBeInstanceOf(
      WorkflowAbortError,
    );
  });
});
