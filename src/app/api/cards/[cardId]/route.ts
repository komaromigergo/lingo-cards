export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: { cardId: string };
}

async function getOwnedCard(cardId: string, userId: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { deck: { include: { folder: true } } },
  });
  if (!card || card.deck.folder.ownerId !== userId) return null;
  return card;
}

/**
 * PATCH /api/cards/:cardId
 * Handles both content edits (front/back/notes) and study-swipe status updates
 * (status: "MASTERED" | "LEARNING", incrementing timesCorrect/timesWrong).
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await getOwnedCard(params.cardId, session.user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { front, back, notes, status } = body as {
    front?: string;
    back?: string;
    notes?: string;
    status?: "MASTERED" | "LEARNING" | "NEW";
  };

  const data: Record<string, unknown> = {};
  if (front) data.front = front;
  if (back) data.back = back;
  if (notes !== undefined) data.notes = notes;
  if (status) {
    data.status = status;
    data.lastReviewed = new Date();
    if (status === "MASTERED") data.timesCorrect = { increment: 1 };
    if (status === "LEARNING") data.timesWrong = { increment: 1 };
  }

  const card = await prisma.card.update({ where: { id: params.cardId }, data });
  return NextResponse.json({ card });
}

/** DELETE /api/cards/:cardId */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await getOwnedCard(params.cardId, session.user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.card.delete({ where: { id: params.cardId } });
  return NextResponse.json({ success: true });
}
