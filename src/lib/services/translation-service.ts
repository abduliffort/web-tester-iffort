/**
 * Translation Service using Bhashini API
 * API Documentation: https://bhashini.gov.in/
 */

const BHASHINI_API_URL =
  process.env.NEXT_PUBLIC_BHASHINI_API_URL ||
  "https://dhruva-api.bhashini.gov.in/services/inference/pipeline";

const BHASHINI_API_KEY = process.env.NEXT_PUBLIC_BHASHINI_API_KEY || "";

interface TranslationRequest {
  inputData: {
    input: Array<{
      source: string;
    }>;
  };
  pipelineTasks: Array<{
    taskType: "translation";
    config: {
      language: {
        sourceLanguage: string;
        targetLanguage: string;
      };
      serviceId: string;
    };
  }>;
}

interface TranslationResponse {
  pipelineResponse: Array<{
    output: Array<{
      target: string;
    }>;
  }>;
}

/**
 * Translate a single text string
 */
export async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  if (!text || text.trim() === "") {
    return text;
  }

  if (sourceLanguage === targetLanguage) {
    return text;
  }

  try {
    const requestBody: TranslationRequest = {
      inputData: {
        input: [{ source: text }],
      },
      pipelineTasks: [
        {
          taskType: "translation",
          config: {
            language: {
              sourceLanguage,
              targetLanguage,
            },
            serviceId: "ai4bharat/indictrans-v2-all-gpu--t4",
          },
        },
      ],
    };

    const response = await fetch(BHASHINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: BHASHINI_API_KEY,
        "User-Agent": "TRAI Web Tester",
        Accept: "*/*",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(
        `Translation API error: ${response.status} ${response.statusText}`
      );
    }

    const data: TranslationResponse = await response.json();

    if (
      data.pipelineResponse &&
      data.pipelineResponse[0]?.output?.[0]?.target
    ) {
      return data.pipelineResponse[0].output[0].target;
    }

    throw new Error("Invalid response format from translation API");
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
}

/**
 * Translate multiple text strings in a batch
 */
export async function translateBatch(
  texts: string[],
  sourceLanguage: string,
  targetLanguage: string
): Promise<string[]> {
  if (!texts || texts.length === 0) {
    return texts;
  }

  if (sourceLanguage === targetLanguage) {
    return texts;
  }

  try {
    const requestBody = {
      inputData: {
        input: texts.map((text) => ({ source: text })),
      },
      pipelineTasks: [
        {
          taskType: "translation",
          config: {
            language: {
              sourceLanguage,
              targetLanguage,
            },
            serviceId: "ai4bharat/indictrans-v2-all-gpu--t4",
          },
        },
      ],
    };

    const response = await fetch(BHASHINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: BHASHINI_API_KEY,
        "User-Agent": "TRAI Web Tester",
        Accept: "*/*",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(
        `Translation API error: ${response.status} ${response.statusText}`
      );
    }

    const data: TranslationResponse = await response.json();

    if (data.pipelineResponse && data.pipelineResponse[0]?.output) {
      return data.pipelineResponse[0].output.map((item) => item.target);
    }

    throw new Error("Invalid response format from translation API");
  } catch (error) {
    // console.error("Batch translation error:", error);
    throw error;
  }
}

/**
 * Cache for storing translations to reduce API calls
 */
class TranslationCache {
  private cache: Map<string, Map<string, string>> = new Map();

  private getCacheKey(sourceLanguage: string, targetLanguage: string): string {
    return `${sourceLanguage}-${targetLanguage}`;
  }

  get(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): string | undefined {
    const key = this.getCacheKey(sourceLanguage, targetLanguage);
    return this.cache.get(key)?.get(text);
  }

  set(
    text: string,
    translation: string,
    sourceLanguage: string,
    targetLanguage: string
  ): void {
    const key = this.getCacheKey(sourceLanguage, targetLanguage);
    if (!this.cache.has(key)) {
      this.cache.set(key, new Map());
    }
    this.cache.get(key)!.set(text, translation);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const translationCache = new TranslationCache();
