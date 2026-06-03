import { useCallback, useRef, useState } from "react";
import type { MutableRefObject } from "react";

export interface UseEditorHistoryReturn {
  pushHistory: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  suppressHistoryRef: MutableRefObject<boolean>;
  resetHistory: () => void;
}

export function useEditorHistory(
  fabricRef: MutableRefObject<any>
): UseEditorHistoryReturn {
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const suppressHistoryRef = useRef(false);
  const [historyVersion, setHistoryVersion] = useState(0);

  const pushHistory = useCallback(() => {
    if (!fabricRef.current || suppressHistoryRef.current) return;
    const json = JSON.stringify(fabricRef.current.toJSON());
    const hist = historyRef.current;
    const idx = historyIndexRef.current;
    if (idx >= 0 && hist[idx] === json) return;
    const newHist = hist.slice(0, idx + 1);
    newHist.push(json);
    if (newHist.length > 50) newHist.shift();
    historyRef.current = newHist;
    historyIndexRef.current = newHist.length - 1;
    setHistoryVersion((prev) => prev + 1);
  }, []);

  const handleUndo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx <= 0 || !fabricRef.current) return;
    historyIndexRef.current = idx - 1;
    setHistoryVersion((prev) => prev + 1);
    suppressHistoryRef.current = true;
    fabricRef.current.loadFromJSON(JSON.parse(historyRef.current[idx - 1])).then(() => {
      suppressHistoryRef.current = false;
      fabricRef.current.renderAll();
      setHistoryVersion((prev) => prev + 1);
    }).catch(() => {
      suppressHistoryRef.current = false;
      setHistoryVersion((prev) => prev + 1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    const idx = historyIndexRef.current;
    const hist = historyRef.current;
    if (idx >= hist.length - 1 || !fabricRef.current) return;
    historyIndexRef.current = idx + 1;
    setHistoryVersion((prev) => prev + 1);
    suppressHistoryRef.current = true;
    fabricRef.current.loadFromJSON(JSON.parse(hist[idx + 1])).then(() => {
      suppressHistoryRef.current = false;
      fabricRef.current.renderAll();
      setHistoryVersion((prev) => prev + 1);
    }).catch(() => {
      suppressHistoryRef.current = false;
      setHistoryVersion((prev) => prev + 1);
    });
  }, []);

  const resetHistory = useCallback(() => {
    historyRef.current = [];
    historyIndexRef.current = -1;
    setHistoryVersion((prev) => prev + 1);
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo =
    historyIndexRef.current >= 0 &&
    historyIndexRef.current < historyRef.current.length - 1;

  return {
    pushHistory,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    suppressHistoryRef,
    resetHistory,
  };
}