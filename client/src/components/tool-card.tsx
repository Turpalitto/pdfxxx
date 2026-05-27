import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { type Tool, categoryColors, getCategoryLabel, isToolLaunchReady } from "@/lib/tools";
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
        whileHover={{ scale: 1.01, y: -3 }}
        whileTap={{ scale: 0.98 }}
        className="paper-tool-card group grid min-h-[232px] cursor-pointer content-start gap-4 rounded-[22px] p-5 transition-all duration-300"
        data-testid={`card-tool-${tool.slug}`}
      >
        <div className="relative z-[1] flex items-center justify-between gap-3">
          <div className="relative inline-block">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-[14px] transition-transform duration-300 group-hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
                boxShadow: `0 10px 24px ${colors.glow}`,
              }}
            >
              <Icon className="h-6 w-6 text-white" />
            </div>
            {tool.pro && (
              <div
                className="absolute -right-1.5 -top-1.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white"
                style={{ background: "linear-gradient(135deg, #8d78ad, #bd7897)" }}
              >
                PRO
              </div>
            )}
            {!isReady && (
              <div
                className="absolute -bottom-1.5 -right-1.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-[#23312d]"
                style={{ background: "linear-gradient(135deg, #c58d5a, #bca65f)" }}
              >
                SOON
              </div>
            )}
          </div>
          <span className="grid size-9 place-items-center rounded-full border border-border bg-white/45 text-muted-foreground transition-colors group-hover:text-primary">
            <ArrowUpRight className="size-4" />
          </span>
        </div>

        <div className="relative z-[1]">
          <h3 className="mb-2 text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
            {name}
          </h3>
          <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>

        <div className="relative z-[1] mt-auto flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="line-clamp-1">{getCategoryLabel(tool.category, lang)}</span>
          <span className="rounded-full border border-border bg-white/45 px-2.5 py-1">
            {tool.pro ? "Pro" : isReady ? "Ready" : "Soon"}
          </span>
        </div>
      </motion.div>
    </Link>
  );
}
