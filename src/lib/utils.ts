import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Fisher-Yates shuffle, used to randomize study session order. */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Detects a leading German definite article ("der"/"die"/"das") at the start
 * of a flashcard's German-language text, and returns the Tailwind border
 * color class used to render a colored accent stripe on that card face.
 * Returns null when no article is detected (e.g. verbs, adjectives, or
 * non-German text) — in that case no accent stripe is shown.
 */
export function getGermanArticleBorderColor(text: string): string | null {
  const match = text.trim().match(/^(der|die|das)\b/i);
  if (!match) return null;
  switch (match[1].toLowerCase()) {
    case "der":
      return "border-l-blue-500";
    case "die":
      return "border-l-rose-500";
    case "das":
      return "border-l-emerald-500";
    default:
      return null;
  }
}
