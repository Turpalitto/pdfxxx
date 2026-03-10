import { Link } from "wouter";
import { type Tool, categoryColors } from "@/lib/tools";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolCardProps {
  tool: Tool;
  index?: number;
}

export function ToolCard({ tool }: ToolCardProps) {
  const colors = categoryColors[tool.color] || categoryColors.blue;
  const Icon = tool.icon;

  return (
    <Link href={`/tools/${tool.slug}`}>
      <div
        className="group relative flex flex-col gap-3 p-4 rounded-md border border-card-border bg-card cursor-pointer transition-all duration-200 hover-elevate h-full"
        data-testid={`card-tool-${tool.slug}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div
            className={cn(
              "w-10 h-10 rounded-md flex items-center justify-center shrink-0",
              colors.bg
            )}
          >
            <Icon className={cn("w-5 h-5", colors.text)} />
          </div>
          <div className="flex gap-1 flex-wrap justify-end">
            {tool.pro && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                <Lock className="w-2.5 h-2.5 mr-0.5" />
                Pro
              </Badge>
            )}
            {tool.beta && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                Beta
              </Badge>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-sm leading-snug mb-1 group-hover:text-primary transition-colors">
            {tool.name}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {tool.description}
          </p>
        </div>
      </div>
    </Link>
  );
}
