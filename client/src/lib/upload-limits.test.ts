import { describe, expect, it } from "vitest";

import { estimateUploadRisk, highestUploadRisk, mbToBytes } from "./upload-limits";

describe("upload risk estimates", () => {
  it("classifies small, medium, and high usage ratios", () => {
    expect(estimateUploadRisk(mbToBytes(10), 100).level).toBe("low");
    expect(estimateUploadRisk(mbToBytes(40), 100).level).toBe("medium");
    expect(estimateUploadRisk(mbToBytes(75), 100).level).toBe("high");
  });

  it("picks the highest risk in a batch", () => {
    const estimate = highestUploadRisk([
      estimateUploadRisk(mbToBytes(10), 100),
      estimateUploadRisk(mbToBytes(90), 100),
      estimateUploadRisk(mbToBytes(50), 100),
    ]);

    expect(estimate?.level).toBe("high");
  });
});
