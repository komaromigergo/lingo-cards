export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** POST /api/decks — create a deck inside a folder owned by the current user */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, folderId, frontLanguage, backLanguage } = await req.json();

  if (!title || !folderId) {
    return NextResponse.json({ error: "title and folderId are required" }, { status: 400 });
  }

  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder || folder.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const deck = await prisma.deck.create({
    data: {
      title,
      description,
      folderId,
      frontLanguage: frontLanguage ?? "de",
      backLanguage: backLanguage ?? "hu",
    },
  });

  return NextResponse.json({ deck }, { status: 201 });
}
