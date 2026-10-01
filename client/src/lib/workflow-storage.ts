import {
  defaultStepOptions,
  getWorkflowStep,
  type StepOptions,
  type WorkflowItem,
  type WorkflowStepDef,
} from './workflow-engine';

export const WORKFLOW_CHAINS_STORAGE_KEY = 'pdfx.workflow.savedChains.v1';

const STORAGE_VERSION = 1;
const MAX_SAVED_CHAINS = 12;
const MAX_CHAIN_NAME_LENGTH = 80;
const MAX_TEXT_OPTION_LENGTH = 500;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type SavedWorkflowItem = {
  stepId: string;
  options: StepOptions;
};

export type SavedWorkflowChain = {
  id: string;
  version: typeof STORAGE_VERSION;
  name: string;
  items: SavedWorkflowItem[];
  createdAt: number;
  updatedAt: number;
};

type SaveWorkflowInput = {
  name: string;
  items: WorkflowItem[];
  now?: number;
};

function getBrowserStorage(): StorageLike | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toTimestamp(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toSafeName(value: unknown): string {
  if (typeof value !== 'string') {
    return 'Workflow';
  }

  const trimmed = value.trim().slice(0, MAX_CHAIN_NAME_LENGTH);
  return trimmed.length > 0 ? trimmed : 'Workflow';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeOptions(def: WorkflowStepDef, rawOptions: unknown): StepOptions {
  const defaults = defaultStepOptions(def);

  if (!isRecord(rawOptions)) {
    return defaults;
  }

  const output: StepOptions = { ...defaults };

  for (const option of def.options) {
    const value = rawOptions[option.key];

    if (option.kind === 'select') {
      const asString =
        typeof value === 'string' ? value : String(defaults[option.key] ?? option.default);
      const allowed = option.choices.some((choice) => choice.value === asString);
      output[option.key] = allowed ? asString : option.default;
      continue;
    }

    if (option.kind === 'range') {
      const asNumber = typeof value === 'number' ? value : Number(value);
      output[option.key] = Number.isFinite(asNumber)
        ? clamp(asNumber, option.min, option.max)
        : option.default;
      continue;
    }

    // Passwords belong only to the in-memory running workflow, never storage or share URLs.
    if (option.kind === 'password') {
      delete output[option.key];
      continue;
    }

    if (option.kind === 'text') {
      output[option.key] =
        typeof value === 'string' ? value.slice(0, MAX_TEXT_OPTION_LENGTH) : option.default;
    }
  }

  return output;
}

function sanitizeItem(value: unknown): SavedWorkflowItem | null {
  if (!isRecord(value) || typeof value.stepId !== 'string') {
    return null;
  }

  const def = getWorkflowStep(value.stepId);

  if (!def) {
    return null;
  }

  return {
    stepId: def.id,
    options: sanitizeOptions(def, value.options),
  };
}

function sanitizeChain(value: unknown, fallbackNow: number): SavedWorkflowChain | null {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return null;
  }

  const items = value.items
    .map(sanitizeItem)
    .filter((item): item is SavedWorkflowItem => item !== null);

  if (items.length === 0) {
    return null;
  }

  const updatedAt = toTimestamp(value.updatedAt, fallbackNow);
  const createdAt = toTimestamp(value.createdAt, updatedAt);

  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id : `workflow-${createdAt}`,
    version: STORAGE_VERSION,
    name: toSafeName(value.name),
    items,
    createdAt,
    updatedAt,
  };
}

function parseStoredChains(raw: string | null, now: number): SavedWorkflowChain[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((value) => sanitizeChain(value, now))
      .filter((chain): chain is SavedWorkflowChain => chain !== null)
      .toSorted((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_SAVED_CHAINS);
  } catch {
    return [];
  }
}

function persistChains(storage: StorageLike, chains: SavedWorkflowChain[]): void {
  try {
    if (chains.length === 0) {
      storage.removeItem(WORKFLOW_CHAINS_STORAGE_KEY);
      return;
    }

    storage.setItem(WORKFLOW_CHAINS_STORAGE_KEY, JSON.stringify(chains.slice(0, MAX_SAVED_CHAINS)));
  } catch {
    // Storage can be unavailable in private/locked-down browser contexts.
  }
}

function makeChainId(now: number): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `workflow-${now}-${random}`;
}

export function workflowItemsToSavedItems(items: WorkflowItem[]): SavedWorkflowItem[] {
  return items
    .map((item) => sanitizeItem({ stepId: item.stepId, options: item.options }))
    .filter((item): item is SavedWorkflowItem => item !== null);
}

export function savedItemsToWorkflowItems(
  items: SavedWorkflowItem[],
  createUid: () => string,
): WorkflowItem[] {
  return items
    .map((item) => {
      const sanitized = sanitizeItem(item);

      if (!sanitized) {
        return null;
      }

      return {
        uid: createUid(),
        stepId: sanitized.stepId,
        options: sanitized.options,
      };
    })
    .filter((item): item is WorkflowItem => item !== null);
}

export function loadSavedWorkflowChains(
  storage: StorageLike | null = getBrowserStorage(),
  now = Date.now(),
): SavedWorkflowChain[] {
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(WORKFLOW_CHAINS_STORAGE_KEY);
    const chains = parseStoredChains(raw, now);
    if (raw && JSON.stringify(chains) !== raw) persistChains(storage, chains);
    return chains;
  } catch {
    return [];
  }
}

export function saveWorkflowChain(
  input: SaveWorkflowInput,
  storage: StorageLike | null = getBrowserStorage(),
): SavedWorkflowChain[] {
  if (!storage) {
    return [];
  }

  const now = input.now ?? Date.now();
  const items = workflowItemsToSavedItems(input.items);

  if (items.length === 0) {
    return loadSavedWorkflowChains(storage, now);
  }

  const chain: SavedWorkflowChain = {
    id: makeChainId(now),
    version: STORAGE_VERSION,
    name: toSafeName(input.name),
    items,
    createdAt: now,
    updatedAt: now,
  };
  const next = [chain, ...loadSavedWorkflowChains(storage, now)].slice(0, MAX_SAVED_CHAINS);
  persistChains(storage, next);

  return next;
}

export function deleteSavedWorkflowChain(
  id: string,
  storage: StorageLike | null = getBrowserStorage(),
): SavedWorkflowChain[] {
  if (!storage) {
    return [];
  }

  const next = loadSavedWorkflowChains(storage).filter((chain) => chain.id !== id);
  persistChains(storage, next);

  return next;
}

// ============================================================
// Share links — encode a pipeline into a URL-safe payload.
// ============================================================

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Serializes pipeline steps into a compact base64url string for `#chain=`. */
export function encodeWorkflowShare(items: WorkflowItem[]): string {
  const payload = {
    v: 1 as const,
    steps: workflowItemsToSavedItems(items).map((item) => ({ s: item.stepId, o: item.options })),
  };
  return toBase64Url(JSON.stringify(payload));
}

/** Parses a `#chain=` payload back into steps; returns null when invalid. */
export function decodeWorkflowShare(encoded: string): SavedWorkflowItem[] | null {
  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as {
      v?: number;
      steps?: Array<{ s?: unknown; o?: unknown }>;
    };
    if (payload.v !== 1 || !Array.isArray(payload.steps) || payload.steps.length === 0) {
      return null;
    }
    if (payload.steps.length > 32) {
      return null;
    }
    const items = payload.steps
      .map((step) => sanitizeItem({ stepId: step.s, options: step.o }))
      .filter((item): item is SavedWorkflowItem => item !== null);
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}
