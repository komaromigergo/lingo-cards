import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: { deckId: string };
}

async function getOwnedDeck(deckId: string, userId: string) {
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: { folder: true },
  });
  if (!deck || deck.folder.ownerId !== userId) return null;
  return deck;
}

/** GET /api/decks/:deckId — deck with all its cards */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deck = await getOwnedDeck(params.deckId, session.user.id);
  if (!deck) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cards = await prisma.card.findMany({
    where: { deckId: params.deckId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ deck, cards });
}

/** PATCH /api/decks/:deckId — update title/description/languages */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await getOwnedDeck(params.deckId, session.user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const deck = await prisma.deck.update({
    where: { id: params.deckId },
    data: {
      ...(body.title && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.frontLanguage && { frontLanguage: body.frontLanguage }),
      ...(body.backLanguage && { backLanguage: body.backLanguage }),
    },
  });

  return NextResponse.json({ deck });
}

/** DELETE /api/decks/:deckId — cascades to cards */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await getOwnedDeck(params.deckId, session.user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.deck.delete({ where: { id: params.deckId } });
  return NextResponse.json({ success: true });
}
