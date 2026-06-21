import { describe, expect, it } from "vitest";

import { STATIC_PAGES, TOOL_SLUGS } from "@shared/tool-registry";
import { tools } from "./tools";

describe("shared tool registry", () => {
  it("matches the UI tool catalog exactly", () => {
    const uiSlugs = tools.map((tool) => tool.slug);

    expect(TOOL_SLUGS).toEqual(uiSlugs);
  });

  it("contains unique slugs and the workflow static route", () => {
    expect(new Set(TOOL_SLUGS).size).toBe(TOOL_SLUGS.length);
    expect(STATIC_PAGES.some((page) => page.path === "/workflow")).toBe(true);
  });
});
