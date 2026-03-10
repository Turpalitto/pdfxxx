import { Link } from "wouter";
import { type Tool, categoryColors } from "@/lib/tools";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolCardProps {
  tool: Tool;
}

export function ToolCard({ tool }: ToolCardProps) {
  const colors = categoryColors[tool.color] || categoryColors.blue;
  const Icon = tool.icon;

  return (
    <Link href={`/tools/${tool.slug}`}>
      <div
        className="group relative flex flex-col gap-3 p-4 rounded-md border border-card-border bg-card cursor-pointer transition-all duration-200 hover-elevate h-full select-none"
        data-testid={`card-tool-${tool.slug}`}
      >
        <div className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 30% 30%, rgba(59,130,246,0.04) 0%, transparent 70%)" }}
        />

        <div className="flex items-start justify-between gap-2">
          <div
            className={cn(
              "w-9 h-9 rounded-md flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105",
              colors.bg
            )}
          >
            <Icon className={cn("w-4.5 h-4.5", colors.text)} style={{ width: "1.1rem", height: "1.1rem" }} />
          </div>
          {tool.pro && (
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 shrink-0">
              <Lock className="w-2 h-2 mr-0.5" />
              Pro
            </Badge>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-[13px] leading-snug mb-1 group-hover:text-primary transition-colors duration-150">
            {tool.name}
          </h3>
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            {tool.description}
          </p>
        </div>
      </div>
    </Link>
  );
}
