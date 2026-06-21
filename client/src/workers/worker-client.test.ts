import { describe, expect, it } from "vitest";
import { canUsePdfWorker, WorkerAbortError } from "./worker-client";

describe("worker-client capabilities", () => {
  it("requires Worker, OffscreenCanvas, and URL support", () => {
    expect(canUsePdfWorker({ Worker: function WorkerStub() {}, OffscreenCanvas: class {}, URL })).toBe(true);
    expect(canUsePdfWorker({ Worker: function WorkerStub() {}, URL })).toBe(false);
    expect(canUsePdfWorker({ OffscreenCanvas: class {}, URL })).toBe(false);
  });

  it("keeps abort errors distinguishable from worker failures", () => {
    const error = new WorkerAbortError();

    expect(error.name).toBe("WorkerAbortError");
    expect(error).toBeInstanceOf(Error);
  });
});
