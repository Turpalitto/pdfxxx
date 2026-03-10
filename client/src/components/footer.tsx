import { Link } from "wouter";
import { FileText, Github, Twitter } from "lucide-react";
import { categories } from "@/lib/tools";
import { useLang } from "@/lib/lang-context";

export function Footer() {
  const { t } = useLang();

  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4 group">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shadow-md shadow-primary/40">
                <FileText className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-bold text-base tracking-tight">
                PDF<span className="text-primary">X</span>
              </span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mb-4">
              {t.footer.desc}
            </p>
            <div className="flex gap-1.5">
              <a
                href="#"
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-3.5 h-3.5" />
              </a>
              <a
                href="#"
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">{t.footer.pdfTools}</h3>
            <ul className="space-y-2">
              {categories.slice(0, 3).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/?category=${cat.id}`}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">{t.footer.moreTools}</h3>
            <ul className="space-y-2">
              {categories.slice(3).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/?category=${cat.id}`}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">{t.footer.company}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {t.footer.pricing}
                </Link>
              </li>
              <li>
                <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {t.footer.privacy}
                </a>
              </li>
              <li>
                <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {t.footer.terms}
                </a>
              </li>
              <li>
                <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {t.footer.contact}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} PDFX. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            {t.footer.badge}
          </div>
        </div>
      </div>
    </footer>
  );
}
