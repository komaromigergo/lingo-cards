import { GoogleGenAI, Type } from "@google/genai";
import type { GeneratedCard, ImportMode } from "@/types";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("[gemini] GEMINI_API_KEY is not set — imports will fail until it is configured.");
}

const ai = new GoogleGenAI({ apiKey: apiKey ?? "" });

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

/**
 * Strict response schema: an array of { front, back, language } objects.
 */
const FLASHCARD_ARRAY_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      front: {
        type: Type.STRING,
        description: "The foreign-language word or phrase, corrected for OCR misreadings using dictionary knowledge where needed.",
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

/** Shared rule block: German-specific article + plural formatting, common to both import modes. */
const GERMAN_ARTICLE_RULES = `
GERMAN NOUN FORMATTING (applies whenever a "front" entry is a German noun):
- German nouns should always be output WITH their definite article ("der", "die", or "das") prepended, exactly as German dictionaries do.
- If the source already writes an article before the noun (e.g. "das Auto"), keep it exactly as written.
- If the source writes ONLY the bare noun with no article (e.g. just "Auto"), you must determine the grammatically correct article yourself from your own knowledge of German and prepend it (e.g. "Auto" → "das Auto"). Never leave a German noun without its article in "front".
- If the source also includes a plural-formation marker after the noun, written with a leading hyphen (e.g. "das Auto -s", "der Tisch -e", "die Lampe -n"), preserve it exactly as written, in the same "article noun -suffix" structure. Do not drop it, merge it into the noun, or misinterpret it as a separate word.`;

/** Shared rule block: cross-check OCR output against known-correct vocabulary and self-correct obvious misreadings. */
function sanityCheckRule(bidirectional: boolean): string {
  if (bidirectional) {
    return `
SANITY-CHECK / SELF-CORRECTION (very important):
Do not treat OCR as infallible. After reading a "front"/"back" pair, use your own knowledge of both languages to check whether "back" is a real, correctly-spelled, plausible translation of "front" (and vice versa).
- If your OCR reading of a handwritten word looks garbled, misspelled, or nonsensical (e.g. "pullohver"), but closely resembles — in sound or shape — the real, correctly-spelled known translation (e.g. "pulóver"), correct the spelling to the real word rather than reproducing the garbled OCR text literally.
- Apply this check in BOTH directions: if "back" is garbled but "front" is clear, fix "back" using your knowledge of what "front" actually translates to; if "front" is garbled but "back" is clear, fix "front" the same way.
- Only correct clear OCR noise/spelling artifacts where the corrected form is an obvious, close match — never replace a word with an unrelated word just because it seems more common.
- Still prioritize what is actually written on the page; this is a targeted correction for OCR misreadings, not a license to freely rewrite content.`;
  }
  return `
SANITY-CHECK / SELF-CORRECTION (important):
Do not treat OCR as infallible. Use your own knowledge of the detected language to check whether the extracted "front" text is a real, correctly-spelled, plausible word or phrase.
- If your OCR/reading of the marked text looks garbled or nonsensical, but closely resembles — in shape — a real, correctly-spelled word that fits the context of the surrounding sentence, correct the spelling to that real word rather than reproducing garbled text literally.
- Only correct clear OCR noise where the corrected form is an obvious, close match — never guess wildly or substitute an unrelated word.`;
}

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
7. Preserve original spelling/diacritics of the foreign word exactly as written (umlauts, accents, etc.) — except where corrected per the sanity-check rule below.
${sanityCheckRule(true)}
${GERMAN_ARTICLE_RULES}
8. Output ONLY a JSON array matching the provided schema — no prose, no markdown fences, no explanations.`;
}

function buildTextbookPrompt(targetLanguage: string): string {
  return `You are an expert OCR and translation assistant for a language-learning app.

You will be shown one or more photos of textbook or reading pages. Some words or phrases on these pages have been marked by the student using a GREEN pen, GREEN highlighter, or GREEN underline.

Your task:
1. Scan every image carefully and identify ONLY the words or short phrases that are underlined, circled, OR highlighted (marker/highlighter-style shading) in GREEN color. Both green underlining and green highlighter marking count equally — ignore markings in any other color (yellow, pink, blue, orange, red, etc.) and ignore all non-marked text.
2. For each green-marked word or phrase, extract the exact text as "front", preserving original spelling, capitalization, and diacritics — except where corrected per the sanity-check rule below.
3. Detect the language of the marked text and output its ISO 639-1 code (e.g. "de", "en", "fr") as "language".
4. Generate an accurate ${targetLanguageName(
    targetLanguage
  )} translation for each marked word/phrase in context (use the surrounding sentence to disambiguate meaning when relevant) and use it as "back".
5. If a green mark spans a multi-word phrase or idiom, keep it together as one single "front" entry rather than splitting it into separate words.
6. Skip any word that is marked in green but is illegible or ambiguous — do not guess wildly; only include entries you are reasonably confident about.
7. If the same word/phrase is marked more than once across pages, include it only once (skip duplicates).
${sanityCheckRule(false)}
${GERMAN_ARTICLE_RULES}
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
  targetLanguage?: string;
}

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
      temperature: 0.2,
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

  const seen = new Set<string>();
  return cards.filter((c) => {
    const key = `${c.front.toLowerCase()}::${c.language}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
