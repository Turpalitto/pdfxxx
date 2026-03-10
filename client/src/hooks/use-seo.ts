import { useEffect } from "react";
import { LANGUAGES } from "@/lib/i18n";

const BASE_URL = "https://pdfx.tools";
const LANG_CODES = LANGUAGES.map((l) => l.code);

export interface SeoMeta {
  title: string;
  description: string;
  path?: string;
  schemaOrg?: Record<string, unknown>;
}

export function useSeo({ title, description, path = "/", schemaOrg }: SeoMeta) {
  useEffect(() => {
    document.title = title;

    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", `${BASE_URL}${path}`);
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);

    setLink("canonical", `${BASE_URL}${path}`);

    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
    LANG_CODES.forEach((lang) => {
      addLink("alternate", { hreflang: lang, href: `${BASE_URL}${path}?lang=${lang}` });
    });
    addLink("alternate", { hreflang: "x-default", href: `${BASE_URL}${path}` });

    if (schemaOrg) {
      let el = document.querySelector<HTMLScriptElement>('script[data-pdfx-schema="page"]');
      if (!el) {
        el = document.createElement("script");
        el.type = "application/ld+json";
        el.setAttribute("data-pdfx-schema", "page");
        document.head.appendChild(el);
      }
      el.textContent = JSON.stringify(schemaOrg);
    }
  }, [title, description, path]);
}

function setMeta(attr: string, key: string, value: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function setLink(rel: string, href: string) {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function addLink(rel: string, attrs: Record<string, string>) {
  const el = document.createElement("link");
  el.setAttribute("rel", rel);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  document.head.appendChild(el);
}
