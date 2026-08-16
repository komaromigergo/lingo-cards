import { Role } from "@prisma/client";

/** A single flashcard item as returned by Gemini's structured JSON output. */
export interface GeneratedCard {
  front: string;
  back: string;
  language: string; // ISO-ish language code of `front`, e.g. "de", "en"
}

export type ImportMode = "NOTEBOOK" | "TEXTBOOK";

export interface ImportRequestBody {
  mode: ImportMode;
  /** Base64-encoded image data (without the data: prefix) */
  images: { base64: string; mimeType: string }[];
  /** Target translation language for auto-generated translations */
  targetLanguage?: string; // default "hu"
}

export interface ImportResponseBody {
  cards: GeneratedCard[];
  warnings?: string[];
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
    };
  }

  interface User {
    id: string;
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
