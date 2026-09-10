import { describe, expect, it } from 'vitest';
import {
  getShortcutList,
  matchesShortcut,
  SHORTCUTS,
  type ShortcutAction,
} from './use-keyboard-shortcuts';

type KeyParts = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>;

function keyEvent(parts: Partial<KeyParts> & { key: string }): KeyParts {
  return {
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ...parts,
  };
}

describe('matchesShortcut', () => {
  it('matches the help shortcut via "?" (Shift+/ on US layouts)', () => {
    expect(matchesShortcut(keyEvent({ key: '?', shiftKey: true }), SHORTCUTS.help)).toBe(true);
  });

  it('matches the help shortcut via literal "/" + Shift', () => {
    expect(matchesShortcut(keyEvent({ key: '/', shiftKey: true }), SHORTCUTS.help)).toBe(true);
  });

  it('does not fire help without Shift or with Ctrl pressed', () => {
    expect(matchesShortcut(keyEvent({ key: '?' }), SHORTCUTS.help)).toBe(false);
    expect(
      matchesShortcut(keyEvent({ key: '/', shiftKey: true, ctrlKey: true }), SHORTCUTS.help),
    ).toBe(false);
  });

  it('matches ctrl-based shortcuts and treats meta as ctrl', () => {
    expect(matchesShortcut(keyEvent({ key: 'z', ctrlKey: true }), SHORTCUTS.undo)).toBe(true);
    expect(matchesShortcut(keyEvent({ key: 'z', metaKey: true }), SHORTCUTS.undo)).toBe(true);
    expect(matchesShortcut(keyEvent({ key: 'z' }), SHORTCUTS.undo)).toBe(false);
  });

  it('is case-insensitive for letter keys', () => {
    expect(matchesShortcut(keyEvent({ key: 'S', ctrlKey: true }), SHORTCUTS.download)).toBe(true);
  });

  it('rejects every shortcut for an unrelated key', () => {
    const event = keyEvent({ key: 'h' });
    const actions = Object.keys(SHORTCUTS) as ShortcutAction[];
    expect(actions.every((action) => !matchesShortcut(event, SHORTCUTS[action]))).toBe(true);
  });
});

describe('getShortcutList', () => {
  it('lists every registered shortcut with key combos', () => {
    const list = getShortcutList('en');
    expect(list).toHaveLength(Object.keys(SHORTCUTS).length);
    const help = list.find((s) => s.action === 'Show shortcuts');
    expect(help?.keys).toBe('Shift+/');
    const undo = list.find((s) => s.action === 'Undo');
    expect(undo?.keys).toBe('Ctrl+Z');
  });

  it('localizes labels and renders arrows for page navigation', () => {
    const ru = getShortcutList('ru');
    expect(ru.find((s) => s.action === 'Отменить')).toBeDefined();
    expect(ru.find((s) => s.action === 'Предыдущая страница')?.keys).toBe('←');
    expect(ru.find((s) => s.action === 'Следующая страница')?.keys).toBe('→');
  });
});
