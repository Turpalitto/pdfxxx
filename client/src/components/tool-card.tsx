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
        className="tool-card group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[1.25rem]"
        data-testid={`card-tool-${tool.slug}`}
      >
        {/* Noise texture layer */}
        <div className="tool-card-noise pointer-events-none absolute inset-0 rounded-[1.25rem]" />

        {/* Color glow on hover (seeps in from top) */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${colors.from}22 0%, transparent 100%)`,
          }}
        />

        {/* PRO badge */}
        {tool.pro && (
          <div
            className="absolute right-3 top-3 z-20 rounded-md px-2 py-0.5 text-[9px] font-bold tracking-wider text-white"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #db2777)",
              boxShadow: "0 2px 10px rgba(124,58,237,0.45)",
            }}
          >
            PRO
          </div>
        )}

        {/* Icon area */}
        <div
          className="relative flex flex-col items-center justify-center pb-5 pt-8"
          style={{
            background: `linear-gradient(180deg, ${colors.from}12 0%, transparent 100%)`,
          }}
        >
          {/* Icon */}
          <div
            className="tool-card-icon relative z-10 flex items-center justify-center"
            style={{
              width: 62,
              height: 62,
              borderRadius: "1rem",
              background: `linear-gradient(145deg, ${colors.from} 0%, ${colors.to} 100%)`,
              boxShadow: `0 8px 30px ${colors.glow}, 0 0 0 1px ${colors.from}25`,
            }}
          >
            <Icon className="size-[1.625rem] text-white drop-shadow-sm" />
          </div>

          {/* Thin bottom accent line below icon */}
          <div
            className="absolute bottom-0 h-px w-full opacity-30"
            style={{
              background: `linear-gradient(90deg, transparent, ${colors.from}50, transparent)`,
            }}
          />
        </div>

        {/* Text content */}
        <div className="tool-card-copy relative z-10 flex flex-1 flex-col px-4 pb-4 pt-3.5">
          <h3 className="mb-1.5 text-[13.5px] font-semibold leading-snug tracking-tight text-white/95">
            {name}
          </h3>
          <p className="line-clamp-2 flex-1 text-[11.5px] leading-[1.55] text-slate-500">
            {description}
          </p>

          {/* CTA row */}
          <div className="mt-3.5 flex items-center justify-between">
            <div
              className="h-px flex-1 scale-x-0 origin-left transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100"
              style={{
                background: `linear-gradient(90deg, ${colors.from}60, transparent)`,
              }}
            />
            <div className="flex items-center gap-1 pl-2 opacity-0 transition-all duration-300 group-hover:opacity-100">
              <span
                className="text-[10px] font-semibold"
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
        </div>

        {/* Bottom color bar */}
        <div
          className="h-[2px] w-0 transition-[width] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-full"
          style={{
            background: `linear-gradient(90deg, ${colors.from}, ${colors.to})`,
          }}
        />
      </div>
    </Link>
  );
});
