"use client";

import { copy, type Locale } from "@/lib/copy";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  text: (typeof copy)[Locale];
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    document.documentElement.lang = nextLocale;
  };

  const value = useMemo(
    () => ({ locale, setLocale, text: copy[locale] }),
    [locale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}
