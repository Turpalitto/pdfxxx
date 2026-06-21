import { describe, expect, it } from "vitest";
import { TOOL_SLUGS } from "@shared/tool-registry";
import { tools, getToolMaturity } from "@/lib/tools";
import { toolRegistry, getToolRegistryEntry, getToolsByExecutionMode } from "./registry";
import { searchToolRegistry } from "./search-index";

describe("toolRegistry", () => {
  it("covers every UI tool and matches sitemap slugs", () => {
    const uiSlugs = tools.map((tool) => tool.slug);
    const registrySlugs = toolRegistry.map((entry) => entry.slug);

    expect(registrySlugs).toEqual(uiSlugs);
    expect(registrySlugs).toEqual(TOOL_SLUGS);
    expect(new Set(registrySlugs).size).toBe(registrySlugs.length);
  });

  it("keeps core metadata derived from the current tool catalog", () => {
    for (const tool of tools) {
      const entry = getToolRegistryEntry(tool.slug);

      expect(entry).toBeDefined();
      expect(entry?.category).toBe(tool.category);
      expect(entry?.maturity).toBe(getToolMaturity(tool));
      expect(entry?.limits.accept).toBe(tool.accept ?? ".pdf");
      expect(entry?.limits.multiple).toBe(Boolean(tool.multiple));
      expect(entry?.output.extension).toBeTruthy();
      expect(entry?.output.mimeType).toContain("/");
    }
  });

  it("marks worker-routed tools as hybrid without making OCR pretend to be worker-safe", () => {
    const hybridSlugs = getToolsByExecutionMode("hybrid").map((entry) => entry.slug);

    expect(hybridSlugs).toContain("grayscale-pdf");
    expect(hybridSlugs).toContain("pdf-to-pptx");
    expect(hybridSlugs).not.toContain("ocr-pdf");
  });

  it("searches across localized names and task language", () => {
    expect(searchToolRegistry("объединить", "ru")[0]?.entry.slug).toBe("merge-pdf");
    expect(searchToolRegistry("powerpoint", "en")[0]?.entry.slug).toBe("pdf-to-pptx");
  });
});
