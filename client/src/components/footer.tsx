import { Link } from "wouter";
import { FileText, Mail } from "lucide-react";
import { categories, getCategoryLabel } from "@/lib/tools";
import { useLang } from "@/lib/lang-context";

export function Footer() {
  const { t, lang } = useLang();

  return (
    <footer
      className="border-t backdrop-blur-xl"
      style={{ background: "rgba(2,6,23,0.85)", borderColor: "rgba(255,255,255,0.1)" }}
    >
      <div className="container mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4 group">
              <div
                className="flex size-9 items-center justify-center rounded-xl shadow-lg"
                style={{ background: "linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)", boxShadow: "0 4px 12px rgba(99,102,241,0.4)" }}
              >
                <FileText className="size-5 text-white" />
              </div>
              <span
                className="text-lg font-bold"
                style={{
                  background: "linear-gradient(90deg, #ffffff, #bfdbfe)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                PDF<span style={{ color: "#60a5fa", WebkitTextFillColor: "#60a5fa" }}>X</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed mb-4 max-w-xs">
              {lang === "ru"
                ? "Онлайн-набор PDF-инструментов для конвертации, организации, защиты и OCR прямо в браузере."
                : "An online PDF toolkit for conversion, organization, protection, and OCR directly in the browser."}
            </p>
            <a
              href="mailto:hello@pdfx.tools"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <Mail className="size-4" />
              hello@pdfx.tools
            </a>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm">{t.footer.pdfTools}</h3>
            <ul className="space-y-2.5">
              {categories.slice(0, 4).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/?category=${cat.id}`}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {getCategoryLabel(cat.id, lang)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm">{t.footer.moreTools}</h3>
            <ul className="space-y-2.5">
              {categories.slice(4).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/?category=${cat.id}`}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {getCategoryLabel(cat.id, lang)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm">{t.footer.company}</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors">
                  {t.footer.pricing}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-slate-400 hover:text-white transition-colors">
                  {t.footer.privacy}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-slate-400 hover:text-white transition-colors">
                  {t.footer.terms}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-slate-400 hover:text-white transition-colors">
                  {t.footer.contact}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} PDFX. {lang === "ru" ? "Все права защищены." : "All rights reserved."}
          </p>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            {t.footer.badge}
          </div>
        </div>
      </div>
    </footer>
  );
}
