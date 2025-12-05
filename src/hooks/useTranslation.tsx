"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Hook for translating text in components
 * Usage: const t = useTranslation();
 * Then: <h1>{t('Hello World')}</h1>
 */
export function useTranslation() {
  const { currentLanguage, translate, translationCache } = useLanguage();
  const [translations, setTranslations] = useState<Map<string, string>>(
    new Map()
  );

  const t = (text: string): string => {
    // If English, return as is
    if (currentLanguage.code === "en") {
      return text;
    }

    // Check local component cache first
    const cached = translations.get(text);
    if (cached) {
      return cached;
    }

    // Check global cache
    const cacheKey = `${currentLanguage.code}:${text}`;
    const globalCached = translationCache.get(cacheKey);
    if (globalCached) {
      setTranslations((prev) => new Map(prev).set(text, globalCached));
      return globalCached;
    }

    // Trigger translation in background
    translate(text).then((translated) => {
      setTranslations((prev) => new Map(prev).set(text, translated));
    });

    // Return original text while translating
    return text;
  };

  // Clear local cache when language changes
  useEffect(() => {
    setTranslations(new Map());
  }, [currentLanguage]);

  return t;
}

/**
 * Hook for translating multiple texts at once
 * Usage: const { texts, isLoading } = useTranslations(['Text 1', 'Text 2']);
 */
export function useTranslations(originalTexts: string[]) {
  const { currentLanguage, translate } = useLanguage();
  const [texts, setTexts] = useState<string[]>(originalTexts);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentLanguage.code === "en") {
      setTexts(originalTexts);
      return;
    }

    setIsLoading(true);
    Promise.all(originalTexts.map((text) => translate(text)))
      .then((translatedTexts) => {
        setTexts(translatedTexts);
      })
      .catch((error) => {
        // console.error('Translation error:', error);
        setTexts(originalTexts); // Fallback to original
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [currentLanguage, originalTexts, translate]);

  return { texts, isLoading };
}
