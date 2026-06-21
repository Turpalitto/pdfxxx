import { runPdfTask, type RunPdfTaskOptions } from "@/workers/worker-client";
import type { ToolRegistryEntry } from "../types";

export function shouldSimulateToolProgress(entry: ToolRegistryEntry): boolean {
  return entry.execution.progress === "simulated";
}

export async function runToolMainThreadTask<T>(
  entry: ToolRegistryEntry,
  task: () => Promise<T>
): Promise<T> {
  if (entry.execution.mode !== "main-thread" || entry.execution.workerOp) {
    throw new Error(`Tool "${entry.slug}" is not registered as a main-thread tool.`);
  }

  return task();
}

export async function runToolWorkerTask<T>(
  entry: ToolRegistryEntry,
  fallback: () => Promise<T>,
  options: RunPdfTaskOptions
): Promise<T> {
  const workerOp = entry.execution.workerOp;

  if (!workerOp) {
    throw new Error(`Tool "${entry.slug}" is missing worker metadata.`);
  }

  return runPdfTask(workerOp, fallback, options);
}
