import { Link, useLocation } from "wouter";
import { Sun, Moon, Menu, X, FileText, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { useState } from "react";
import { categories } from "@/lib/tools";

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <FileText className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            PDF<span className="text-primary">X</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <div className="relative group">
            <button
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="nav-tools"
            >
              Tools
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            <div className="absolute top-full left-0 mt-2 w-56 rounded-md border border-border bg-popover shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
              <div className="p-1">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/?category=${cat.id}`}
                    className="block px-3 py-2 text-sm rounded-sm text-popover-foreground hover:bg-accent transition-colors"
                  >
                    {cat.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <Link
            href="/pricing"
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              location === "/pricing"
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="nav-pricing"
          >
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="default"
            size="sm"
            className="hidden sm:flex shadow-lg shadow-primary/20"
            data-testid="button-get-started"
            asChild
          >
            <Link href="/pricing">Get Pro</Link>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            data-testid="button-mobile-menu"
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl px-4 py-3">
          <nav className="flex flex-col gap-1">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/?category=${cat.id}`}
                className="px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {cat.label}
              </Link>
            ))}
            <Link
              href="/pricing"
              className="px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Pricing
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
