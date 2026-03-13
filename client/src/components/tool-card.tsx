import { Link } from "wouter";
import { type Tool, categoryColors } from "@/lib/tools";
import { getToolTranslation } from "@/lib/tool-translations";
import { useLang } from "@/lib/lang-context";

interface ToolCardProps {
  tool: Tool;
}

export function ToolCard({ tool }: ToolCardProps) {
  const { lang } = useLang();
  const colors = categoryColors[tool.color] || categoryColors.blue;
  const { name, description } = getToolTranslation(tool.slug, lang);
  const Icon = tool.icon;

  return (
    <Link href={`/tools/${tool.slug}`}>
      <div
        className="tool-card group relative overflow-hidden rounded-2xl p-6 cursor-pointer h-full hover:-translate-y-[3px]"
        style={{
          background: "linear-gradient(135deg, rgba(15,23,42,0.7) 0%, rgba(30,41,59,0.4) 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(8px)",
          transition: "transform 0.25s cubic-bezier(.4,0,.2,1), box-shadow 0.25s cubic-bezier(.4,0,.2,1), border-color 0.25s ease",
        }}
        data-testid={`card-tool-${tool.slug}`}
      >
        {/* Hover glow overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(59,130,246,0.06), rgba(124,58,237,0.06))",
            transition: "opacity 0.3s ease",
          }}
        />

        <div className="relative">
          {/* Icon box */}
          <div className="relative inline-block mb-4">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{
                width: 48,
                height: 48,
                background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
                boxShadow: `0 4px 16px ${colors.glow}`,
                transition: "transform 0.2s cubic-bezier(.4,0,.2,1)",
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
}
