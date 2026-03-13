import { Link } from "wouter";
import { FileText, Github, Twitter, Linkedin } from "lucide-react";
import { categories } from "@/lib/tools";
import { getCategoryLabel } from "@/lib/tools";
import { useLang } from "@/lib/lang-context";

export function Footer() {
  const { t, lang } = useLang();

  return (
    <footer
      className="border-t backdrop-blur-xl"
      style={{ background: "rgba(2,6,23,0.85)", borderColor: "#1a1a2e" }}
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
            <p className="text-sm leading-relaxed mb-4 max-w-xs" style={{ color: "#55556a" }}>
              {lang === "ru"
                ? "PDF инструменты. Бесплатно, безопасно, без водяных знаков."
                : "PDF tools. Free, secure, no watermarks."}
            </p>
            <div className="flex gap-2">
              {[
                { icon: Github, label: "GitHub" },
                { icon: Twitter, label: "Twitter" },
                { icon: Linkedin, label: "LinkedIn" },
              ].map(({ icon: SocialIcon, label }) => (
                <a
                  key={label}
                  href="#"
                  className="flex size-8 items-center justify-center rounded-lg footer-link hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                  aria-label={label}
                >
                  <SocialIcon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm">
              {lang === "ru" ? "Инструменты" : "Tools"}
            </h3>
            <ul className="space-y-2.5">
              {categories.slice(0, 4).map((cat) => (
                <li key={cat.id}>
                  <Link href={`/?category=${cat.id}`} className="text-sm footer-link transition-colors">
                    {getCategoryLabel(cat.id, lang)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm">
              {lang === "ru" ? "Ещё" : "More"}
            </h3>
            <ul className="space-y-2.5">
              {categories.slice(4).map((cat) => (
                <li key={cat.id}>
                  <Link href={`/?category=${cat.id}`} className="text-sm footer-link transition-colors">
                    {getCategoryLabel(cat.id, lang)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm">
              {lang === "ru" ? "Компания" : "Company"}
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/pricing" className="text-sm footer-link transition-colors">
                  {lang === "ru" ? "Цены" : "Pricing"}
                </Link>
              </li>
              <li>
                <a href="#" className="text-sm footer-link transition-colors">
                  {t.footer.privacy}
                </a>
              </li>
              <li>
                <a href="#" className="text-sm footer-link transition-colors">
                  {t.footer.terms}
                </a>
              </li>
              <li>
                <a href="#" className="text-sm footer-link transition-colors">
                  {t.footer.contact}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderTop: "1px solid #1a1a2e" }}>
          <p className="text-sm" style={{ color: "#55556a" }}>
            &copy; {new Date().getFullYear()} PDFX
          </p>
          <div className="flex items-center gap-2 text-sm" style={{ color: "#55556a" }}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            {t.footer.badge}
          </div>
        </div>
      </div>
    </footer>
  );
}
