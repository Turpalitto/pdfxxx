import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pdfx_recent_files";
const MAX_RECENT = 10;

export interface RecentFile {
  name: string;
  size: number;
  lastOpened: number;
  slug: string;
}

export function useRecentFiles() {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setRecentFiles(JSON.parse(stored));
    } catch {}
  }, []);

  const addRecentFile = useCallback((file: RecentFile) => {
    setRecentFiles((prev) => {
      const filtered = prev.filter((f) => f.name !== file.name || f.slug !== file.slug);
      const next = [file, ...filtered].slice(0, MAX_RECENT);
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