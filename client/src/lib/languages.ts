export const LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", flag: "EN" },
  { code: "ru", name: "Russian", nativeName: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439", flag: "RU" },
  { code: "es", name: "Spanish", nativeName: "Espa\u00f1ol", flag: "ES" },
  { code: "fr", name: "French", nativeName: "Fran\u00e7ais", flag: "FR" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "DE" },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "IT" },
  { code: "pt", name: "Portuguese", nativeName: "Portugu\u00eas", flag: "PT" },
  { code: "zh", name: "Chinese", nativeName: "\u4e2d\u6587", flag: "ZH" },
  { code: "ja", name: "Japanese", nativeName: "\u65e5\u672c\u8a9e", flag: "JA" },
  { code: "ko", name: "Korean", nativeName: "\ud55c\uad6d\uc5b4", flag: "KO" },
  { code: "ar", name: "Arabic", nativeName: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", flag: "AR" },
  { code: "tr", name: "Turkish", nativeName: "T\u00fcrk\u00e7e", flag: "TR" },
  { code: "hi", name: "Hindi", nativeName: "\u0939\u093f\u0928\u094d\u0926\u0940", flag: "HI" },
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "PL" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", flag: "NL" },
  { code: "uk", name: "Ukrainian", nativeName: "\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430", flag: "UK" },
  { code: "vi", name: "Vietnamese", nativeName: "Ti\u1ebfng Vi\u1ec7t", flag: "VI" },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", flag: "ID" },
  { code: "th", name: "Thai", nativeName: "\u0e44\u0e17\u0e22", flag: "TH" },
  { code: "cs", name: "Czech", nativeName: "\u010ce\u0161tina", flag: "CS" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];
