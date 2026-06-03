import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type LangCode, type Translations, getTranslations, LANGUAGES } from "./i18n";

const RTL_LANGS = new Set<LangCode>([]);

interface LangContextType {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: Translations;
  isRtl: boolean;
}

const LangContext = createContext<LangContextType>({
  lang: "en",
  setLang: () => {},
  t: getTranslations("en"),
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

  const isRtl = RTL_LANGS.has(lang);

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

  const t = getTranslations(lang);

  return (
    <LangContext.Provider value={{ lang, setLang, t, isRtl }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
