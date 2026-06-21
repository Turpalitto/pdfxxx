import { describe, expect, it } from "vitest";

import { getToolMaturity, getToolMaturityLabel, tools } from "./tools";

describe("tool maturity", () => {
  it("marks every tool with an explicit computed maturity", () => {
    const values = tools.map((tool) => getToolMaturity(tool));

    expect(values).toHaveLength(tools.length);
    expect(values.every((value) => ["stable", "beta", "experimental"].includes(value))).toBe(true);
  });

  it("keeps known limited tools out of stable", () => {
    expect(getToolMaturity("pdf-to-audio")).toBe("experimental");
    expect(getToolMaturity("pdf-diff")).toBe("beta");
  });

  it("localizes labels for English and Russian", () => {
    expect(getToolMaturityLabel("stable", "en")).toBe("Stable");
    expect(getToolMaturityLabel("experimental", "ru")).toBe("Эксперимент");
  });
});
