import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateFlashcardsFromImages } from "@/lib/gemini";
import type { ImportRequestBody } from "@/types";

const MAX_IMAGES = 15;
const MAX_TOTAL_BASE64_CHARS = 20 * 1024 * 1024; // ~15MB of raw bytes, base64-inflated

/**
 * POST /api/import
 * Body: { mode: "NOTEBOOK" | "TEXTBOOK", images: {base64, mimeType}[], targetLanguage? }
 * Calls Gemini with the appropriate OCR prompt and returns a *preview* list of
 * generated cards. Cards are only persisted once the user confirms via
 * POST /api/cards, so they can review/edit before committing.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as ImportRequestBody;
  const { mode, images, targetLanguage } = body;

  if (mode !== "NOTEBOOK" && mode !== "TEXTBOOK") {
    return NextResponse.json({ error: "mode must be NOTEBOOK or TEXTBOOK" }, { status: 400 });
  }
  if (!Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: "At least one image is required" }, { status: 400 });
  }
  if (images.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Maximum ${MAX_IMAGES} images per import` }, { status: 400 });
  }
  const totalSize = images.reduce((sum, img) => sum + (img.base64?.length ?? 0), 0);
  if (totalSize > MAX_TOTAL_BASE64_CHARS) {
    return NextResponse.json({ error: "Total image size too large" }, { status: 400 });
  }

  try {
    const cards = await generateFlashcardsFromImages({
      mode,
      images,
      targetLanguage: targetLanguage ?? "hu",
    });

    if (cards.length === 0) {
      return NextResponse.json({
        cards: [],
        warnings: ["Gemini could not detect any usable vocabulary in these images. Try clearer, well-lit photos."],
      });
    }

    return NextResponse.json({ cards });
  } catch (err) {
    console.error("[api/import] Gemini generation failed:", err);
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
