import { useState, useEffect } from "react";
import { useLang } from "@/lib/lang-context";
import { getShortcutList } from "@/hooks/use-keyboard-shortcuts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function KeyboardHelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { lang } = useLang();
  const shortcuts = getShortcutList(lang as "en" | "ru");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {lang === "ru" ? "Горячие клавиши" : "Keyboard Shortcuts"}
          </DialogTitle>
          <DialogDescription>
            {lang === "ru"
              ? "Используйте эти комбинации для быстрой работы"
              : "Use these shortcuts for faster workflow"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1 mt-2">
          {shortcuts.map((s) => (
            <div key={s.action} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50">
              <span className="text-sm">{s.action}</span>
              <kbd className="px-2 py-0.5 text-xs font-mono bg-muted rounded border border-border">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          {lang === "ru" ? "Нажмите Shift+? в любой момент" : "Press Shift+? anytime to toggle"}
        </p>
      </DialogContent>
    </Dialog>
  );
}