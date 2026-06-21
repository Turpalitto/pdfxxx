import type { LangCode } from "@/lib/i18n";
import { getToolBySlug } from "@/lib/tools";
import { getToolTranslation } from "@/lib/tool-translations";
import { WORKFLOW_PRESETS, pickCopy } from "@/lib/workflow-presets";
import type { RecentFile } from "@/hooks/use-recent-files";

export type WorkflowPresetCommand = {
  id: string;
  title: string;
  description: string;
  url: string;
  value: string;
};

export type RecentToolCommand = {
  slug: string;
  title: string;
  description: string;
  url: string;
  value: string;
};

export function workflowPresetUrl(presetId: string): string {
  return `/workflow?preset=${encodeURIComponent(presetId)}`;
}

export function buildWorkflowPresetCommands(lang: LangCode): WorkflowPresetCommand[] {
  return WORKFLOW_PRESETS.map((preset) => {
    const title = pickCopy(preset.title, lang);
    const description = pickCopy(preset.description, lang);

    return {
      id: preset.id,
      title,
      description,
      url: workflowPresetUrl(preset.id),
      value: `${title} ${description} workflow preset ${preset.id} ${preset.stepIds.join(" ")}`,
    };
  });
}

export function buildRecentToolCommands(
  recentFiles: RecentFile[],
  lang: LangCode,
  limit = 5,
): RecentToolCommand[] {
  const seen = new Set<string>();
  const commands: RecentToolCommand[] = [];

  for (const recentFile of recentFiles) {
    if (seen.has(recentFile.slug)) {
      continue;
    }

    const tool = getToolBySlug(recentFile.slug);

    if (!tool) {
      continue;
    }

    const translation = getToolTranslation(recentFile.slug, lang);
    seen.add(recentFile.slug);
    commands.push({
      slug: recentFile.slug,
      title: translation.name,
      description:
        lang === "ru"
          ? "Недавно использованный инструмент"
          : "Recently used tool",
      url: `/tools/${recentFile.slug}`,
      value: `${translation.name} ${translation.description} recent tool ${recentFile.slug}`,
    });

    if (commands.length >= limit) {
      break;
    }
  }

  return commands;
}
