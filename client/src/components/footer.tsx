import { Link } from "wouter";
import { FileText, Mail, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { categories, getCategoryLabel } from "@/lib/tools";
import { useLang } from "@/lib/lang-context";
import { loadContactPage, loadHomePage, loadPricingPage, loadPrivacyPage, loadTermsPage } from "@/lib/route-preload";

export function Footer() {
  const { t, lang } = useLang();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4 group">
              <div
                className="flex size-10 items-center justify-center rounded-xl shadow-lg"
                style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%)", boxShadow: "0 4px 12px rgba(20,184,166,0.28)" }}
              >
                <FileText className="size-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                PDF<span className="text-cyan-300">X</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-4 max-w-xs">
              {lang === "ru"
                ? "Надежный сервис для работы с PDF документами онлайн."
                : "Reliable online service for working with PDF documents."}
            </p>
            <a
              href="mailto:hello@pdfx.tools"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <Mail className="size-4" />
              hello@pdfx.tools
            </a>
          </div>

          {/* Tools */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t.footer.pdfTools}</h3>
            <ul className="space-y-2 text-sm">
              {categories.slice(0, 4).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/?category=${cat.id}`}
                    onMouseEnter={() => void loadHomePage()}
                    onFocus={() => void loadHomePage()}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {getCategoryLabel(cat.id, lang)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* More tools */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t.footer.moreTools}</h3>
            <ul className="space-y-2 text-sm">
              {categories.slice(4).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/?category=${cat.id}`}
                    onMouseEnter={() => void loadHomePage()}
                    onFocus={() => void loadHomePage()}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {getCategoryLabel(cat.id, lang)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t.footer.company}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/pricing" onMouseEnter={() => void loadPricingPage()} onFocus={() => void loadPricingPage()} className="text-gray-400 hover:text-white transition-colors">{t.footer.pricing}</Link></li>
              <li><Link href="/privacy" onMouseEnter={() => void loadPrivacyPage()} onFocus={() => void loadPrivacyPage()} className="text-gray-400 hover:text-white transition-colors">{t.footer.privacy}</Link></li>
              <li><Link href="/terms" onMouseEnter={() => void loadTermsPage()} onFocus={() => void loadTermsPage()} className="text-gray-400 hover:text-white transition-colors">{t.footer.terms}</Link></li>
              <li><Link href="/contact" onMouseEnter={() => void loadContactPage()} onFocus={() => void loadContactPage()} className="text-gray-400 hover:text-white transition-colors">{t.footer.contact}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} PDFX. {lang === "ru" ? "Все права защищены." : "All rights reserved."}
          </p>
          <div className="flex gap-3">
            <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
              <Facebook className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
              <Linkedin className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
