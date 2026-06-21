import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pdfx_recent_files";
const MAX_RECENT = 10;

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

export function useRecentFiles() {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        if (!Array.isArray(parsed)) return;
        const sanitized = parsed.map(sanitizeRecentFile);
        setRecentFiles(sanitized);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      }
    } catch {}
  }, []);

  const addRecentFile = useCallback((file: RecentFile) => {
    setRecentFiles((prev) => {
      const safeFile = sanitizeRecentFile(file);
      const filtered = prev.filter((f) => f.slug !== safeFile.slug || f.size !== safeFile.size);
      const next = [safeFile, ...filtered].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const clearRecentFiles = useCallback(() => {
    setRecentFiles([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return { recentFiles, addRecentFile, clearRecentFiles };
}
