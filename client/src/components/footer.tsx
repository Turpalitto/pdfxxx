import { Link } from "wouter";
import { FileText, Mail, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { categories, getCategoryLabel } from "@/lib/tools";
import { useLang } from "@/lib/lang-context";
import { loadContactPage, loadHomePage, loadPricingPage, loadPrivacyPage, loadTermsPage } from "@/lib/route-preload";

export function Footer() {
  const { t, lang } = useLang();

  return (
    <footer className="border-t border-border bg-transparent text-muted-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4 group">
              <div
                className="flex size-10 items-center justify-center rounded-[14px] shadow-lg"
                style={{ background: "linear-gradient(135deg, #1b96b3 0%, #2f6aa6 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45), 0 10px 20px rgba(29,95,135,0.20)" }}
              >
                <FileText className="size-6 text-white" />
              </div>
              <span className="paper-title text-xl font-bold text-foreground">
                PDF<span className="text-primary">X</span>
              </span>
            </Link>
            <p className="mb-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {lang === "ru"
                ? "Надежный сервис для работы с PDF документами онлайн."
                : "Reliable online service for working with PDF documents."}
            </p>
            <a
              href="mailto:hello@pdfx.tools"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Mail className="size-4" />
              hello@pdfx.tools
            </a>
          </div>

          {/* Tools */}
          <div>
            <h3 className="mb-4 font-semibold text-foreground">{t.footer.pdfTools}</h3>
            <ul className="space-y-2 text-sm">
              {categories.slice(0, 4).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/?category=${cat.id}`}
                    onMouseEnter={() => void loadHomePage()}
                    onFocus={() => void loadHomePage()}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {getCategoryLabel(cat.id, lang)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* More tools */}
          <div>
            <h3 className="mb-4 font-semibold text-foreground">{t.footer.moreTools}</h3>
            <ul className="space-y-2 text-sm">
              {categories.slice(4).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/?category=${cat.id}`}
                    onMouseEnter={() => void loadHomePage()}
                    onFocus={() => void loadHomePage()}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {getCategoryLabel(cat.id, lang)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-4 font-semibold text-foreground">{t.footer.company}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/pricing" onMouseEnter={() => void loadPricingPage()} onFocus={() => void loadPricingPage()} className="text-muted-foreground transition-colors hover:text-foreground">{t.footer.pricing}</Link></li>
              <li><Link href="/privacy" onMouseEnter={() => void loadPrivacyPage()} onFocus={() => void loadPrivacyPage()} className="text-muted-foreground transition-colors hover:text-foreground">{t.footer.privacy}</Link></li>
              <li><Link href="/terms" onMouseEnter={() => void loadTermsPage()} onFocus={() => void loadTermsPage()} className="text-muted-foreground transition-colors hover:text-foreground">{t.footer.terms}</Link></li>
              <li><Link href="/contact" onMouseEnter={() => void loadContactPage()} onFocus={() => void loadContactPage()} className="text-muted-foreground transition-colors hover:text-foreground">{t.footer.contact}</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} PDFX. {lang === "ru" ? "Все права защищены." : "All rights reserved."}
          </p>
          <div className="flex gap-3">
            <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/40 transition-colors hover:bg-white/65 hover:text-foreground">
              <Facebook className="w-5 h-5" />
            </a>
            <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/40 transition-colors hover:bg-white/65 hover:text-foreground">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/40 transition-colors hover:bg-white/65 hover:text-foreground">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/40 transition-colors hover:bg-white/65 hover:text-foreground">
              <Linkedin className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
