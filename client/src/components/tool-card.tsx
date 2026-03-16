import { memo } from "react";
import { Link } from "wouter";
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
        className="tool-card motion-surface group relative h-full cursor-pointer overflow-hidden rounded-2xl p-6"
        style={{
          background: "linear-gradient(135deg, rgba(15,23,42,0.7) 0%, rgba(30,41,59,0.4) 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
        data-testid={`card-tool-${tool.slug}`}
      >
        {/* Hover glow overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(124,58,237,0.08))",
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-[-10%] top-0 h-24 translate-y-[-120%] rotate-[-8deg] bg-white/10 opacity-0 blur-3xl transition-all duration-700 ease-out group-hover:translate-y-[-25%] group-hover:opacity-100"
        />

        <div className="tool-card-copy relative">
          {/* Icon box */}
          <div className="relative inline-block mb-4">
            <div
              className="tool-card-icon flex items-center justify-center rounded-xl"
              style={{
                width: 48,
                height: 48,
                background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
                boxShadow: `0 4px 16px ${colors.glow}`,
              }}
            >
              <Icon className="size-6 text-white" />
            </div>
            {tool.pro && (
              <div
                className="absolute -top-1.5 -right-1.5 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-md tracking-wider"
                style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
              >
                PRO
              </div>
            )}
          </div>

          {/* Text */}
          <h3 className="text-white font-semibold text-base mb-2 leading-snug">
            {name}
          </h3>
          <p className="text-sm leading-relaxed line-clamp-2" style={{ color: "#8888a0" }}>
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
});
