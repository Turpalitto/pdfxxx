import { memo } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { type Tool, categoryColors } from "@/lib/tools";
import { getToolIcon } from "@/lib/tool-icons";
import { getToolTranslation } from "@/lib/tool-translations";
import { useLang } from "@/lib/lang-context";

interface ToolCardProps {
  tool: Tool;
}

export const ToolCard = memo(function ToolCard({ tool }: ToolCardProps) {
  const { lang } = useLang();
  const colors = categoryColors[tool.color] || categoryColors.blue;
  const { name, description } = getToolTranslation(tool.slug, lang);
  const Icon = getToolIcon(tool.iconName);

  return (
    <Link href={`/tools/${tool.slug}`}>
      <div
        className="tool-card group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl"
        style={{
          background:
            "linear-gradient(160deg, rgba(15,23,42,0.95) 0%, rgba(20,30,55,0.85) 100%)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
        data-testid={`card-tool-${tool.slug}`}
      >
        {/* PRO badge */}
        {tool.pro && (
          <div
            className="absolute right-2 top-2 z-10 rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white"
            style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
          >
            PRO
          </div>
        )}

        {/* Icon area — colored top section (ilovepdf-style) */}
        <div
          className="flex items-center justify-center py-7 transition-all duration-500"
          style={{
            background: `linear-gradient(160deg, ${colors.from}1a 0%, ${colors.to}0d 100%)`,
          }}
        >
          <div
            className="tool-card-icon flex items-center justify-center rounded-2xl"
            style={{
              width: 56,
              height: 56,
              background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
              boxShadow: `0 8px 28px ${colors.glow}`,
            }}
          >
            <Icon className="size-7 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="tool-card-copy flex flex-1 flex-col px-4 pb-4 pt-3">
          <h3 className="mb-1 text-sm font-semibold leading-snug text-white">
            {name}
          </h3>
          <p
            className="line-clamp-2 flex-1 text-xs leading-relaxed"
            style={{ color: "#5e6677" }}
          >
            {description}
          </p>
          <div className="mt-2.5 flex justify-end">
            <ArrowRight
              className="size-3.5 transition-all duration-300 group-hover:translate-x-0.5"
              style={{ color: colors.from, opacity: 0.5 }}
            />
          </div>
        </div>

        {/* Animated color accent bottom border */}
        <div
          className="h-0.5 w-0 transition-[width] duration-500 ease-out group-hover:w-full"
          style={{
            background: `linear-gradient(90deg, ${colors.from}, ${colors.to})`,
          }}
        />
      </div>
    </Link>
  );
});
