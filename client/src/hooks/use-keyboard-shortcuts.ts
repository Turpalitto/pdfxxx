import { useEffect, useCallback } from "react";

type ShortcutAction = 
  | "undo"
  | "redo"
  | "process"
  | "download"
  | "upload"
  | "help"
  | "prevPage"
  | "nextPage"
  | "zoomIn"
  | "zoomOut"
  | "deleteSelected";

interface ShortcutDef {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  label: { en: string; ru: string };
}

const SHORTCUTS: Record<ShortcutAction, ShortcutDef> = {
  undo:       { key: "z", ctrl: true, label: { en: "Undo", ru: "Отменить" } },
  redo:       { key: "y", ctrl: true, label: { en: "Redo", ru: "Повторить" } },
  process:    { key: "Enter", ctrl: true, label: { en: "Process", ru: "Обработать" } },
  download:   { key: "s", ctrl: true, label: { en: "Download result", ru: "Скачать результат" } },
  upload:     { key: "u", ctrl: true, label: { en: "Upload file", ru: "Загрузить файл" } },
  help:       { key: "/", shift: true, label: { en: "Show shortcuts", ru: "Показать шорткаты" } },
  prevPage:   { key: "ArrowLeft", label: { en: "Previous page", ru: "Предыдущая страница" } },
  nextPage:   { key: "ArrowRight", label: { en: "Next page", ru: "Следующая страница" } },
  zoomIn:    { key: "=", ctrl: true, label: { en: "Zoom in", ru: "Увеличить" } },
  zoomOut:   { key: "-", ctrl: true, label: { en: "Zoom out", ru: "Уменьшить" } },
  deleteSelected: { key: "Delete", label: { en: "Delete selected", ru: "Удалить выбранное" } },
};

function matchesShortcut(e: KeyboardEvent, def: ShortcutDef): boolean {
  const keyMatch = e.key.toLowerCase() === def.key.toLowerCase();
  const ctrlMatch = def.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
  const shiftMatch = def.shift ? e.shiftKey : !e.shiftKey;
  const altMatch = def.alt ? e.altKey : !e.altKey;
  return keyMatch && ctrlMatch && shiftMatch && altMatch;
}

export function useKeyboardShortcuts(
  handlers: Partial<Record<ShortcutAction, () => void>>,
  enabled: boolean = true
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        if (e.key === "?" && e.shiftKey) {
          // Allow help shortcut even in inputs
        } else {
          return;
        }
      }

      for (const [action, def] of Object.entries(SHORTCUTS)) {
        if (matchesShortcut(e, def) && handlers[action as ShortcutAction]) {
          e.preventDefault();
          handlers[action as ShortcutAction]!();
          return;
        }
      }
    },
    [handlers, enabled]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

export function getShortcutList(lang: "en" | "ru"): { action: string; keys: string }[] {
  return Object.entries(SHORTCUTS).map(([, def]) => {
    const parts: string[] = [];
    if (def.ctrl) parts.push(lang === "ru" ? "Ctrl" : "Ctrl");
    if (def.shift) parts.push("Shift");
    if (def.alt) parts.push("Alt");
    parts.push(def.key === "Enter" ? "Enter" : def.key === "ArrowLeft" ? "←" : def.key === "ArrowRight" ? "→" : def.key === "Delete" ? "Del" : def.key.toUpperCase());
    return {
      action: def.label[lang],
      keys: parts.join("+"),
    };
  });
}

export { SHORTCUTS };
export type { ShortcutAction };