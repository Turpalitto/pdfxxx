import { Link } from "wouter";
import { type Tool, categoryColors } from "@/lib/tools";
import { getToolTranslation } from "@/lib/tool-translations";
import { useLang } from "@/lib/lang-context";
import { cn } from "@/lib/utils";

interface ToolCardProps {
  tool: Tool;
}

export function ToolCard({ tool }: ToolCardProps) {
  const { lang } = useLang();
  const colors = categoryColors[tool.color] || categoryColors.blue;
  const { name, description } = getToolTranslation(tool.slug, lang);

  return (
    <Link href={`/tools/${tool.slug}`}>
      <div
        className="group relative flex flex-col items-center text-center gap-3 p-5 rounded-2xl border border-border cursor-pointer transition-all duration-300 hover:-translate-y-1 h-full select-none overflow-hidden"
        style={{ background: "rgba(255,255,255,0.02)" }}
        data-testid={`card-tool-${tool.slug}`}
      >
        {/* hover glow overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${colors.glow} 0%, transparent 65%)`,
          }}
        />
        {/* hover border glow */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
          style={{
            boxShadow: `0 0 0 1px ${colors.glow}, 0 8px 24px ${colors.glow}`,
          }}
        />

        {/* Icon */}
        <div className="relative">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform duration-200 group-hover:scale-110"
            style={{
              background: `linear-gradient(135deg, ${colors.gradient}, ${colors.gradient.replace("0.18", "0.06")})`,
              border: `1px solid ${colors.gradient.replace("0.18", "0.25")}`,
            }}
          >
            {tool.emoji}
          </div>
          {tool.pro && (
            <div
              className="absolute -top-1.5 -right-1.5 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-md tracking-wider"
              style={{ background: "linear-gradient(135deg, #6c5ce7, #ec4899)" }}
            >
              PRO
            </div>
          )}
        </div>

        {/* Text */}
        <div className="relative flex flex-col gap-1">
          <h3
            className="font-semibold leading-snug transition-colors duration-150"
            style={{ fontSize: 13, color: "var(--foreground)" }}
          >
            {name}
          </h3>
          <p
            className="text-muted-foreground leading-snug line-clamp-2"
            style={{ fontSize: 11 }}
          >
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}
