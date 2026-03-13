import { Link } from "wouter";
import { type Tool, categoryColors, isToolLaunchReady } from "@/lib/tools";
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
  const isReady = isToolLaunchReady(tool);

  return (
    <Link href={`/tools/${tool.slug}`}>
      <div
        className="group relative overflow-hidden rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:border-white/20 h-full"
        style={{
          background: "linear-gradient(135deg, rgba(15,23,42,0.7) 0%, rgba(30,41,59,0.4) 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(8px)",
        }}
        data-testid={`card-tool-${tool.slug}`}
      >
        {/* Hover glow overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(124,58,237,0.08))" }}
        />

        <div className="relative">
          {/* Icon box */}
          <div className="relative inline-block mb-4">
            <div
              className="flex items-center justify-center size-14 rounded-xl shadow-lg transition-transform duration-200 group-hover:scale-110"
              style={{
                background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
                boxShadow: `0 4px 16px ${colors.glow}`,
              }}
            >
              <Icon className="size-7 text-white" />
            </div>
            {tool.pro && (
              <div
                className="absolute -top-1.5 -right-1.5 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-md tracking-wider"
                style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
              >
                PRO
              </div>
            )}
            {!isReady && (
              <div
                className="absolute -bottom-1.5 -right-1.5 text-[9px] font-bold text-slate-950 px-1.5 py-0.5 rounded-md tracking-wider"
                style={{ background: "linear-gradient(135deg, #fbbf24, #f97316)" }}
              >
                SOON
              </div>
            )}
          </div>

          {/* Text */}
          <h3 className="text-white font-semibold text-base mb-2 leading-snug">
            {name}
          </h3>
          <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}
