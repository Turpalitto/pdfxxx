import type { LangCode } from "@/lib/i18n";
import { getToolTranslation } from "@/lib/tool-translations";
import { toolRegistry } from "./registry";
import type { ToolRegistryEntry } from "./types";

export interface ToolSearchResult {
  entry: ToolRegistryEntry;
  score: number;
}

function normalizeQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/[^a-zа-яё0-9]+/i)
    .filter(Boolean);
}

function scoreEntry(entry: ToolRegistryEntry, tokens: string[], lang: LangCode): number {
  const translation = getToolTranslation(entry.slug, lang);
  const haystack = [
    entry.slug,
    entry.category,
    entry.output.kind,
    entry.maturity,
    translation.name,
    translation.description,
    ...entry.search.en,
    ...entry.search.ru,
  ].join(" ").toLowerCase();

  return tokens.reduce((score, token) => {
    if (entry.slug.includes(token)) return score + 6;
    if (translation.name.toLowerCase().includes(token)) return score + 4;
    if (haystack.includes(token)) return score + 1;
    return score;
  }, 0);
}

export function searchToolRegistry(query: string, lang: LangCode = "en", limit = 12): ToolSearchResult[] {
  const tokens = normalizeQuery(query);

  if (tokens.length === 0) {
    return [];
  }

  return toolRegistry
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens, lang) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.slug.localeCompare(b.entry.slug))
    .slice(0, limit);
}
