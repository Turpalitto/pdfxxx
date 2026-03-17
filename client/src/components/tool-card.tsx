import { Link } from "wouter";
import { motion } from "framer-motion";
import { type Tool, categoryColors, isToolLaunchReady } from "@/lib/tools";
import { getToolTranslation } from "@/lib/tool-translations";
import { useLang } from "@/lib/lang-context";
import { preloadToolRoute } from "@/lib/route-preload";

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
    <Link
      href={`/tools/${tool.slug}`}
      onMouseEnter={() => preloadToolRoute(tool.slug)}
      onFocus={() => preloadToolRoute(tool.slug)}
    >
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        className="group h-full cursor-pointer rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-sky-200 hover:shadow-lg"
        data-testid={`card-tool-${tool.slug}`}
      >
        <div className="relative inline-block mb-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
              boxShadow: `0 4px 16px ${colors.glow}`,
            }}
          >
            <Icon className="w-7 h-7 text-white" />
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

        <h3 className="mb-2 text-lg font-semibold leading-snug text-slate-900 transition-colors group-hover:text-sky-700">
          {name}
        </h3>
        <p className="line-clamp-2 text-sm leading-6 text-slate-500">{description}</p>
      </motion.div>
    </Link>
  );
}
