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
        data-testid={`card-tool-${tool.slug}`}
      >
        {/* Gradient border overlay (visible on hover) */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `linear-gradient(135deg, ${colors.from}40, transparent 50%, ${colors.to}30)`,
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            maskComposite: "exclude",
            WebkitMaskComposite: "xor",
            padding: "1px",
          }}
        />

        {/* PRO badge */}
        {tool.pro && (
          <div
            className="absolute right-3 top-3 z-10 rounded-md px-2 py-0.5 text-[9px] font-bold tracking-wider text-white shadow-lg"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #ec4899)",
              boxShadow: "0 2px 12px rgba(124,58,237,0.4)",
            }}
          >
            PRO
          </div>
        )}

        {/* Icon area — colored top section */}
        <div
          className="relative flex items-center justify-center py-8 transition-all duration-500"
          style={{
            background: `linear-gradient(160deg, ${colors.from}15 0%, ${colors.to}08 100%)`,
          }}
        >
          {/* Subtle radial glow behind icon */}
          <div
            className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{
              background: `radial-gradient(circle at 50% 70%, ${colors.from}20 0%, transparent 70%)`,
            }}
          />
          <div
            className="tool-card-icon relative flex items-center justify-center rounded-2xl"
            style={{
              width: 58,
              height: 58,
              background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
              boxShadow: `0 8px 32px ${colors.glow}, 0 0 0 1px ${colors.from}30`,
            }}
          >
            <Icon className="size-7 text-white drop-shadow-sm" />
          </div>
        </div>

        {/* Content */}
        <div className="tool-card-copy flex flex-1 flex-col px-4 pb-4 pt-3">
          <h3 className="mb-1.5 text-[13px] font-semibold leading-snug text-white/95">
            {name}
          </h3>
          <p className="line-clamp-2 flex-1 text-xs leading-relaxed text-slate-400/80">
            {description}
          </p>
          <div className="mt-3 flex items-center justify-end gap-1 opacity-0 transition-all duration-300 group-hover:opacity-100">
            <span
              className="text-[10px] font-medium"
              style={{ color: colors.from }}
            >
              {lang === "ru" ? "Открыть" : "Open"}
            </span>
            <ArrowRight
              className="size-3 transition-transform duration-300 group-hover:translate-x-0.5"
              style={{ color: colors.from }}
            />
          </div>
        </div>

        {/* Animated color accent bottom border */}
        <div
          className="h-[2px] w-0 transition-[width] duration-500 ease-out group-hover:w-full"
          style={{
            background: `linear-gradient(90deg, ${colors.from}, ${colors.to})`,
          }}
        />
      </div>
    </Link>
  );
});
