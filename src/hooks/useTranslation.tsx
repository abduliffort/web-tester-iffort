"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Hook for translating text in components
 * Usage: const t = useTranslation();
 * Then: <h1>{t('Hello World')}</h1>
 */
export function useTranslation() {
  const { currentLanguage, translate, translationCache } = useLanguage();
  const translationsRef = useRef<Map<string, string>>(new Map());
  const [, forceUpdate] = useState({});

  // Track last language to clear cache synchronously during render
  const lastLanguageCode = useRef(currentLanguage.code);
  if (lastLanguageCode.current !== currentLanguage.code) {
    translationsRef.current = new Map();
    lastLanguageCode.current = currentLanguage.code;
  }

  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    // Trigger update on mount to catch any translations that resolved before mount
    forceUpdate({});
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const t = useCallback(
    (text: string): string => {
      // If English, return as is
      if (currentLanguage.code === "en") {
        return text;
      }

      // Check local component cache first
      const cached = translationsRef.current.get(text);
      if (cached) {
        return cached;
      }

      // Check global cache
      const cacheKey = `${currentLanguage.code}:${text}`;
      const globalCached = translationCache.get(cacheKey);
      if (globalCached) {
        // Update ref but don't force re-render for global hits
        translationsRef.current.set(text, globalCached);
        return globalCached;
      }

      // Trigger translation in background
      translate(text).then((translated) => {
        // Only update and re-render if this is a new translation
        if (translationsRef.current.get(text) !== translated) {
          translationsRef.current.set(text, translated);

          // Safely trigger re-render only if component is still mounted
          if (isMountedRef.current) {
            forceUpdate({});
          }
        }
      });

      // Return original text while translating
      return text;
    },
    [currentLanguage.code, translationCache, translate]
  );

  // No need for useEffect to clear cache anymore as it's done during render

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
