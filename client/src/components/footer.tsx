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
                ? "Все PDF инструменты в одном месте. Бесплатно, безопасно, без водяных знаков."
                : "All PDF tools in one place. Free, secure, no watermarks."}
            </p>
            <div className="flex gap-2">
              <a
                href="#"
                className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.06)" }}
                aria-label="GitHub"
              >
                <Github className="size-4" />
              </a>
              <a
                href="#"
                className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.06)" }}
                aria-label="Twitter"
              >
                <Twitter className="size-4" />
              </a>
              <a
                href="#"
                className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.06)" }}
                aria-label="LinkedIn"
              >
                <Linkedin className="size-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm">
              {lang === "ru" ? "Инструменты" : "Tools"}
            </h3>
            <ul className="space-y-2.5">
              {categories.slice(0, 4).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/?category=${cat.id}`}
                    className="text-sm transition-colors footer-link"
                    style={{ color: "#55556a" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#8888a0")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#55556a")}
                  >
                    {getCategoryLabel(cat.id, lang)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm">
              {lang === "ru" ? "Ещё инструменты" : "More tools"}
            </h3>
            <ul className="space-y-2.5">
              {categories.slice(4).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/?category=${cat.id}`}
                    className="text-sm transition-colors"
                    style={{ color: "#55556a" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#8888a0")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#55556a")}
                  >
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
                <Link
                  href="/pricing"
                  className="text-sm transition-colors"
                  style={{ color: "#55556a" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#8888a0")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#55556a")}
                >
                  {lang === "ru" ? "Цены" : "Pricing"}
                </Link>
              </li>
              <li>
                <a
                  href="#"
                  className="text-sm transition-colors"
                  style={{ color: "#55556a" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#8888a0")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#55556a")}
                >
                  {t.footer.privacy}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-sm transition-colors"
                  style={{ color: "#55556a" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#8888a0")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#55556a")}
                >
                  {t.footer.terms}
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-sm transition-colors"
                  style={{ color: "#55556a" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#8888a0")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#55556a")}
                >
                  {t.footer.contact}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-sm" style={{ color: "#55556a" }}>
            &copy; {new Date().getFullYear()} PDFX. {lang === "ru" ? "Все права защищены." : "All rights reserved."}
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
