import type { ToolRegistryEntry } from "../types";

export function shouldSimulateToolProgress(entry: ToolRegistryEntry): boolean {
  return entry.execution.progress === "simulated";
}
