import { GoogleGenAI, Type } from "@google/genai";
import type { GeneratedCard, ImportMode } from "@/types";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  // Don't throw at import time in case this module is bundled client-side by mistake;
  // callers will get a clear error the moment they try to use it.
  console.warn("[gemini] GEMINI_API_KEY is not set — imports will fail until it is configured.");
}

const ai = new GoogleGenAI({ apiKey: apiKey ?? "" });

const MODEL = "gemini-1.5-flash";

/**
 * Strict response schema: an array of { front, back, language } objects.
 * Passed as `responseSchema` alongside responseMimeType "application/json"
 * so Gemini is constrained to emit only valid, parseable JSON.
 */
const FLASHCARD_ARRAY_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      front: {
        type: Type.STRING,
        description: "The foreign-language word or phrase exactly as written in the source image.",
      },
      back: {
        type: Type.STRING,
        description: "The translation of `front`, in the target language.",
      },
      language: {
        type: Type.STRING,
        description: "ISO 639-1 (or close) language code of `front`, e.g. 'de', 'en', 'fr', 'es'.",
      },
    },
    required: ["front", "back", "language"],
    propertyOrdering: ["front", "back", "language"],
  },
};

/**
 * Option A — Vocabulary Notebook Import.
 * Photos of a hand/typed two-column notebook: left column = foreign word,
 * right column = translation. Missing translations must be auto-generated.
 */
function buildNotebookPrompt(targetLanguage: string): string {
  return `You are an expert OCR and translation assistant for a language-learning app.

You will be shown one or more photos of a student's vocabulary notebook. Each page is laid out as a TWO-COLUMN table or list:
- The LEFT column contains a foreign-language word or short phrase.
- The RIGHT column contains its translation (when present).

Your task:
1. Carefully read every row on every page, in top-to-bottom, left-to-right order across all images.
2. For each row, extract the foreign word/phrase as "front" and its translation as "back".
3. Detect the language of the "front" word/phrase and output its ISO 639-1 code (e.g. "de" for German, "en" for English, "fr" for French) as "language".
4. IMPORTANT RULE: If a row's LEFT column word has NO translation written in the photo (empty right column, illegible, or missing), you MUST generate the correct ${targetLanguageName(
    targetLanguage
  )} translation yourself and use it as "back". Never leave "back" empty.
5. Ignore page numbers, dates, doodles, unrelated margin notes, and duplicate headers.
6. If the same word appears more than once across pages, include it only once (skip duplicates).
7. Preserve original spelling/diacritics of the foreign word exactly as written (umlauts, accents, etc.).
8. Output ONLY a JSON array matching the provided schema — no prose, no markdown fences, no explanations.`;
}

/**
 * Option B — Textbook Underline Import.
 * Photos of textbook pages; only words/phrases underlined or highlighted
 * in GREEN should be extracted, then translated.
 */
function buildTextbookPrompt(targetLanguage: string): string {
  return `You are an expert OCR and translation assistant for a language-learning app.

You will be shown one or more photos of textbook or reading pages. Some words or phrases on these pages have been marked by the student using a GREEN pen, GREEN highlighter, or GREEN underline.

Your task:
1. Scan every image carefully and identify ONLY the words or short phrases that are underlined, circled, or highlighted in GREEN color. Ignore markings in any other color (yellow, pink, blue, orange, red, etc.) and ignore all non-marked text.
2. For each green-marked word or phrase, extract the exact text as "front", preserving original spelling, capitalization, and diacritics.
3. Detect the language of the marked text and output its ISO 639-1 code (e.g. "de", "en", "fr") as "language".
4. Generate an accurate ${targetLanguageName(
    targetLanguage
  )} translation for each marked word/phrase in context (use the surrounding sentence to disambiguate meaning when relevant) and use it as "back".
5. If a green mark spans a multi-word phrase or idiom, keep it together as one single "front" entry rather than splitting it into separate words.
6. Skip any word that is marked in green but is illegible or ambiguous — do not guess wildly; only include entries you are reasonably confident about.
7. If the same word/phrase is marked more than once across pages, include it only once (skip duplicates).
8. Output ONLY a JSON array matching the provided schema — no prose, no markdown fences, no explanations.`;
}

function targetLanguageName(code: string): string {
  const map: Record<string, string> = {
    hu: "Hungarian",
    en: "English",
    de: "German",
    fr: "French",
    es: "Spanish",
  };
  return map[code] ?? code;
}

export interface GeminiImportInput {
  mode: ImportMode;
  images: { base64: string; mimeType: string }[];
  targetLanguage?: string; // defaults to "hu" per spec (Hungarian translations)
}

/**
 * Sends the uploaded photo(s) + the appropriate prompt to Gemini and returns
 * a parsed, validated array of GeneratedCard objects.
 */
export async function generateFlashcardsFromImages(
  input: GeminiImportInput
): Promise<GeneratedCard[]> {
  const { mode, images, targetLanguage = "hu" } = input;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }
  if (!images.length) {
    throw new Error("At least one image is required for import.");
  }

  const prompt =
    mode === "NOTEBOOK" ? buildNotebookPrompt(targetLanguage) : buildTextbookPrompt(targetLanguage);

  const imageParts = images.map((img) => ({
    inlineData: {
      data: img.base64,
      mimeType: img.mimeType,
    },
  }));

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }, ...imageParts],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: FLASHCARD_ARRAY_SCHEMA,
      temperature: 0.2, // low temperature: favor accurate OCR/translation over creativity
    },
  });

  const rawText = response.text;
  if (!rawText) {
    throw new Error("Gemini returned an empty response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("Gemini returned malformed JSON.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response was not a JSON array as expected.");
  }

  const cards: GeneratedCard[] = parsed
    .filter(
      (item): item is GeneratedCard =>
        !!item &&
        typeof item === "object" &&
        typeof (item as GeneratedCard).front === "string" &&
        typeof (item as GeneratedCard).back === "string" &&
        typeof (item as GeneratedCard).language === "string" &&
        (item as GeneratedCard).front.trim().length > 0 &&
        (item as GeneratedCard).back.trim().length > 0
    )
    .map((c) => ({
      front: c.front.trim(),
      back: c.back.trim(),
      language: c.language.trim().toLowerCase(),
    }));

  // De-duplicate by front+language, keeping first occurrence
  const seen = new Set<string>();
  return cards.filter((c) => {
    const key = `${c.front.toLowerCase()}::${c.language}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
