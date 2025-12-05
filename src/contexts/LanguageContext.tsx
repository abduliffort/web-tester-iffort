"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
} from "react";
import { translateText } from "@/lib/services/translation-service";

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "hi", name: "Hindi", nativeName: "हिंदी" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ" },
  { code: "as", name: "Assamese", nativeName: "অসমীয়া" },
];

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (language: Language) => void;
  translate: (text: string) => Promise<string>;
  isTranslating: boolean;
  translationCache: Map<string, string>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(
    SUPPORTED_LANGUAGES[0]
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationCache, setTranslationCache] = useState<Map<string, string>>(
    new Map()
  );

  // Load saved language from localStorage on mount
  useEffect(() => {
    const savedLanguageCode = localStorage.getItem("preferredLanguage");
    if (savedLanguageCode) {
      const savedLanguage = SUPPORTED_LANGUAGES.find(
        (lang) => lang.code === savedLanguageCode
      );
      if (savedLanguage) {
        setCurrentLanguage(savedLanguage);
      }
    }
  }, []);

  const setLanguage = useCallback((language: Language) => {
    setCurrentLanguage(language);
    localStorage.setItem("preferredLanguage", language.code);
    // Clear cache when language changes
    setTranslationCache(new Map());
  }, []);

  const translate = useCallback(
    async (text: string): Promise<string> => {
      // If English, return as is
      if (currentLanguage.code === "en") {
        return text;
      }

      // Check cache first
      const cacheKey = `${currentLanguage.code}:${text}`;
      if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey)!;
      }

      try {
        await Promise.resolve();

        setIsTranslating(true);
        const translated = await translateText(
          text,
          "en",
          currentLanguage.code
        );

        // Update cache
        setTranslationCache((prev) => {
          const newCache = new Map(prev);
          newCache.set(cacheKey, translated);
          return newCache;
        });

        return translated;
      } catch (error) {
        // console.error('Translation error:', error);
        return text; // Fallback to original text
      } finally {
        setIsTranslating(false);
      }
    },
    [currentLanguage, translationCache]
  );

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        translate,
        isTranslating,
        translationCache,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
