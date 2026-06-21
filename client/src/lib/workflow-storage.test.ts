import { describe, expect, it } from "vitest";
import {
  WORKFLOW_CHAINS_STORAGE_KEY,
  deleteSavedWorkflowChain,
  loadSavedWorkflowChains,
  saveWorkflowChain,
  savedItemsToWorkflowItems,
} from "./workflow-storage";

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

class ThrowingStorage {
  getItem(): string | null {
    throw new Error("blocked");
  }

  setItem(): void {
    throw new Error("blocked");
  }

  removeItem(): void {
    throw new Error("blocked");
  }
}

describe("workflow-storage", () => {
  it("stores only chain step ids and sanitized options", () => {
    const storage = new MemoryStorage();

    const chains = saveWorkflowChain(
      {
        name: "  Legal send  ",
        now: 1_700_000_000_000,
        items: [
          {
            uid: "client-only-1",
            stepId: "compress",
            options: { level: "high", fileName: "client-contract.pdf" },
          },
          {
            uid: "client-only-2",
            stepId: "watermark",
            options: { text: "CONFIDENTIAL", position: "tile", bytes: 1234 },
          },
        ],
      },
      storage,
    );

    expect(chains).toHaveLength(1);
    expect(chains[0].name).toBe("Legal send");
    expect(chains[0].items).toEqual([
      { stepId: "compress", options: { level: "high" } },
      { stepId: "watermark", options: { text: "CONFIDENTIAL", position: "tile" } },
    ]);

    const stored = storage.getItem(WORKFLOW_CHAINS_STORAGE_KEY);
    expect(stored).not.toContain("client-contract.pdf");
    expect(stored).not.toContain("fileName");
    expect(stored).not.toContain("bytes");
    expect(stored).not.toContain("client-only");
  });

  it("drops malformed payloads and unknown workflow steps on read", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      WORKFLOW_CHAINS_STORAGE_KEY,
      JSON.stringify([
        {
          id: "kept",
          name: "Scan",
          createdAt: 1,
          updatedAt: 2,
          items: [
            { stepId: "scanner", options: { intensity: 99 } },
            { stepId: "unknown-step", options: { text: "bad" } },
          ],
        },
        {
          id: "empty",
          name: "Empty",
          items: [{ stepId: "missing", options: {} }],
        },
      ]),
    );

    expect(loadSavedWorkflowChains(storage, 10)).toEqual([
      {
        id: "kept",
        version: 1,
        name: "Scan",
        createdAt: 1,
        updatedAt: 2,
        items: [{ stepId: "scanner", options: { intensity: 1 } }],
      },
    ]);

    storage.setItem(WORKFLOW_CHAINS_STORAGE_KEY, "{not-json");
    expect(loadSavedWorkflowChains(storage)).toEqual([]);
  });

  it("hydrates saved items into fresh workflow items", () => {
    const items = savedItemsToWorkflowItems(
      [
        { stepId: "compress", options: { level: "medium" } },
        { stepId: "missing", options: {} },
      ],
      () => "fresh-uid",
    );

    expect(items).toEqual([
      { uid: "fresh-uid", stepId: "compress", options: { level: "medium" } },
    ]);
  });

  it("deletes a saved chain and clears storage when none remain", () => {
    const storage = new MemoryStorage();
    const chains = saveWorkflowChain(
      {
        name: "Temporary",
        now: 123,
        items: [{ uid: "a", stepId: "compress", options: { level: "low" } }],
      },
      storage,
    );

    expect(deleteSavedWorkflowChain(chains[0].id, storage)).toEqual([]);
    expect(storage.getItem(WORKFLOW_CHAINS_STORAGE_KEY)).toBeNull();
  });

  it("handles unavailable storage without throwing", () => {
    const storage = new ThrowingStorage();

    expect(loadSavedWorkflowChains(storage)).toEqual([]);
    expect(() =>
      saveWorkflowChain(
        {
          name: "Blocked",
          items: [{ uid: "a", stepId: "compress", options: { level: "low" } }],
        },
        storage,
      ),
    ).not.toThrow();
  });
});
