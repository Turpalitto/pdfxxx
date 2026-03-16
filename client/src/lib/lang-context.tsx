import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { LANGUAGES, type LangCode } from "./languages";
import { type Translations } from "./i18n";

const RTL_LANGS = new Set<LangCode>(["ar"]);

interface LangContextType {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: Translations;
  isRtl: boolean;
}

const LangContext = createContext<LangContextType>({
  lang: "en",
  setLang: () => {},
  t: {} as Translations,
  isRtl: false,
});

function detectBrowserLang(): LangCode {
  const stored = localStorage.getItem("pdfx-lang");
  if (stored) return stored as LangCode;

  const supported = new Set(LANGUAGES.map((l) => l.code));
  const navLangs = navigator.languages?.length ? navigator.languages : [navigator.language];

  for (const navLang of navLangs) {
    const code = navLang.toLowerCase().split("-")[0] as LangCode;
    if (supported.has(code)) return code;
  }
  return "en";
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(detectBrowserLang);
  const [t, setTranslations] = useState<Translations | null>(null);

  const isRtl = RTL_LANGS.has(lang);

  useEffect(() => {
    let active = true;

    const loadTranslations = async () => {
      const { getTranslations } = await import("./i18n");
      if (active) {
        setTranslations(getTranslations(lang));
      }
    };

    void loadTranslations();

    return () => {
      active = false;
    };
  }, [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
  }, [lang, isRtl]);

  const setLang = (l: LangCode) => {
    setLangState(l);
    localStorage.setItem("pdfx-lang", l);
    document.documentElement.lang = l;
    document.documentElement.dir = RTL_LANGS.has(l) ? "rtl" : "ltr";
  };

  if (!t) {
    return (
      <div className="route-fallback">
        <div className="route-fallback__bar" />
        <div className="route-fallback__hero" />
      </div>
    );
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t, isRtl }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
