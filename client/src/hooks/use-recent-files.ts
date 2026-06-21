import { useCallback, useEffect, useState } from "react";

export const RECENT_FILES_STORAGE_KEY = "pdfx_recent_files";
const MAX_RECENT = 10;
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface RecentFile {
  name: string;
  size: number;
  lastOpened: number;
  slug: string;
}

function privateRecentLabel(name: string): string {
  const ext = name.split(".").pop()?.trim().toUpperCase();
  return ext ? `${ext} file` : "Local file";
}

function sanitizeRecentFile(file: RecentFile): RecentFile {
  return {
    name: privateRecentLabel(file.name),
    size: file.size,
    lastOpened: file.lastOpened,
    slug: file.slug,
  };
}

function isRecentFile(value: unknown): value is RecentFile {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "size" in value &&
    "lastOpened" in value &&
    "slug" in value &&
    typeof value.name === "string" &&
    typeof value.size === "number" &&
    typeof value.lastOpened === "number" &&
    typeof value.slug === "string" &&
    Number.isFinite(value.size) &&
    Number.isFinite(value.lastOpened)
  );
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadRecentFiles(storage: StorageLike | null = getBrowserStorage()): RecentFile[] {
  if (!storage) {
    return [];
  }

  try {
    const stored = storage.getItem(RECENT_FILES_STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const sanitized = parsed
      .filter(isRecentFile)
      .map(sanitizeRecentFile)
      .slice(0, MAX_RECENT);
    storage.setItem(RECENT_FILES_STORAGE_KEY, JSON.stringify(sanitized));

    return sanitized;
  } catch {
    return [];
  }
}

export function useRecentFiles() {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(() => loadRecentFiles());

  useEffect(() => {
    setRecentFiles(loadRecentFiles());
  }, []);

  const addRecentFile = useCallback((file: RecentFile) => {
    setRecentFiles((prev) => {
      const safeFile = sanitizeRecentFile(file);
      const filtered = prev.filter((f) => f.slug !== safeFile.slug || f.size !== safeFile.size);
      const next = [safeFile, ...filtered].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_FILES_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const clearRecentFiles = useCallback(() => {
    setRecentFiles([]);
    try {
      localStorage.removeItem(RECENT_FILES_STORAGE_KEY);
    } catch {}
  }, []);

  return { recentFiles, addRecentFile, clearRecentFiles };
}
