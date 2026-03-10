import { createContext, useContext, useState, type ReactNode } from "react";
import { type LangCode, type Translations, getTranslations } from "./i18n";

interface LangContextType {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: Translations;
}

const LangContext = createContext<LangContextType>({
  lang: "en",
  setLang: () => {},
  t: getTranslations("en"),
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(() => {
    const stored = localStorage.getItem("pdfx-lang");
    return (stored as LangCode) || "en";
  });

  const setLang = (l: LangCode) => {
    setLangState(l);
    localStorage.setItem("pdfx-lang", l);
    document.documentElement.lang = l;
  };

  const t = getTranslations(lang);

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
