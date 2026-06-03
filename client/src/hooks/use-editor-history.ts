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
  // Re-entrancy guard: пока loadFromJSON одного undo/redo в полёте, новые
  // вызовы игнорируются. Иначе резолв первого промиса снимает
  // suppressHistoryRef раньше, чем догрузится второй → порча истории (H9).
  const restoringRef = useRef(false);
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
    if (restoringRef.current) return;
    const idx = historyIndexRef.current;
    if (idx <= 0 || !fabricRef.current) return;
    historyIndexRef.current = idx - 1;
    setHistoryVersion((prev) => prev + 1);
    restoringRef.current = true;
    suppressHistoryRef.current = true;
    fabricRef.current.loadFromJSON(JSON.parse(historyRef.current[idx - 1])).then(() => {
      suppressHistoryRef.current = false;
      restoringRef.current = false;
      fabricRef.current.renderAll();
      setHistoryVersion((prev) => prev + 1);
    }).catch(() => {
      suppressHistoryRef.current = false;
      restoringRef.current = false;
      setHistoryVersion((prev) => prev + 1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    if (restoringRef.current) return;
    const idx = historyIndexRef.current;
    const hist = historyRef.current;
    if (idx >= hist.length - 1 || !fabricRef.current) return;
    historyIndexRef.current = idx + 1;
    setHistoryVersion((prev) => prev + 1);
    restoringRef.current = true;
    suppressHistoryRef.current = true;
    fabricRef.current.loadFromJSON(JSON.parse(hist[idx + 1])).then(() => {
      suppressHistoryRef.current = false;
      restoringRef.current = false;
      fabricRef.current.renderAll();
      setHistoryVersion((prev) => prev + 1);
    }).catch(() => {
      suppressHistoryRef.current = false;
      restoringRef.current = false;
      setHistoryVersion((prev) => prev + 1);
    });
  }, []);

  const resetHistory = useCallback(() => {
    historyRef.current = [];
    historyIndexRef.current = -1;
    restoringRef.current = false;
    suppressHistoryRef.current = false;
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