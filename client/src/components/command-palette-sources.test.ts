import { describe, expect, it } from "vitest";
import { RECENT_FILES_STORAGE_KEY, loadRecentFiles } from "@/hooks/use-recent-files";
import {
  buildRecentToolCommands,
  buildWorkflowPresetCommands,
  workflowPresetUrl,
} from "./command-palette-sources";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("command palette sources", () => {
  it("builds workflow preset commands with deep links", () => {
    const commands = buildWorkflowPresetCommands("en");

    expect(commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "send-ready",
          url: workflowPresetUrl("send-ready"),
          value: expect.stringContaining("workflow preset"),
        }),
      ]),
    );
  });

  it("sanitizes recent files before building recent tool commands", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      RECENT_FILES_STORAGE_KEY,
      JSON.stringify([
        {
          name: "private-contract-final.pdf",
          size: 12345,
          lastOpened: 3,
          slug: "compress-pdf",
        },
        {
          name: "private-contract-final-copy.pdf",
          size: 45678,
          lastOpened: 2,
          slug: "compress-pdf",
        },
        {
          name: "secret-spreadsheet.pdf",
          size: 999,
          lastOpened: 1,
          slug: "pdf-to-excel",
        },
      ]),
    );

    const recentFiles = loadRecentFiles(storage);
    const stored = storage.getItem(RECENT_FILES_STORAGE_KEY);
    const commands = buildRecentToolCommands(recentFiles, "en");

    expect(stored).not.toContain("private-contract-final");
    expect(stored).not.toContain("secret-spreadsheet");
    expect(commands.map((command) => command.slug)).toEqual(["compress-pdf", "pdf-to-excel"]);
    expect(JSON.stringify(commands)).not.toContain("private-contract-final");
    expect(JSON.stringify(commands)).not.toContain("secret-spreadsheet");
  });
});
