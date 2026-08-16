export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ImportSource } from "@prisma/client";
import type { GeneratedCard } from "@/types";

async function assertDeckOwnership(deckId: string, userId: string) {
  const deck = await prisma.deck.findUnique({ where: { id: deckId }, include: { folder: true } });
  if (!deck || deck.folder.ownerId !== userId) return null;
  return deck;
}

/**
 * POST /api/cards
 * Body: { deckId, cards: GeneratedCard[], importSource?: "NOTEBOOK"|"TEXTBOOK"|"MANUAL" }
 * Bulk-inserts cards — used both for manual single-card creation (array of 1)
 * and for committing a batch of Gemini-generated cards after user review.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { deckId, cards, importSource } = (await req.json()) as {
    deckId: string;
    cards: GeneratedCard[];
    importSource?: ImportSource;
  };

  if (!deckId || !Array.isArray(cards) || cards.length === 0) {
    return NextResponse.json({ error: "deckId and a non-empty cards[] are required" }, { status: 400 });
  }

  const deck = await assertDeckOwnership(deckId, session.user.id);
  if (!deck) return NextResponse.json({ error: "Deck not found" }, { status: 404 });

  const created = await prisma.card.createMany({
    data: cards.map((c) => ({
      front: c.front,
      back: c.back,
      language: c.language,
      deckId,
      importSource: importSource ?? "MANUAL",
    })),
  });

  return NextResponse.json({ count: created.count }, { status: 201 });
}
