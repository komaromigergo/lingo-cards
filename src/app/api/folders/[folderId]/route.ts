import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: { folderId: string };
}

async function assertOwnership(folderId: string, userId: string) {
  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder || folder.ownerId !== userId) return null;
  return folder;
}

/** GET /api/folders/:folderId — folder with its decks + card counts */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const folder = await prisma.folder.findUnique({
    where: { id: params.folderId },
    include: {
      decks: {
        include: { _count: { select: { cards: true } } },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!folder || folder.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ folder });
}

/** PATCH /api/folders/:folderId — rename / recolor */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await assertOwnership(params.folderId, session.user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, color } = await req.json();
  const folder = await prisma.folder.update({
    where: { id: params.folderId },
    data: { ...(name && { name }), ...(color && { color }) },
  });

  return NextResponse.json({ folder });
}

/** DELETE /api/folders/:folderId — cascades to decks + cards */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await assertOwnership(params.folderId, session.user.id);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.folder.delete({ where: { id: params.folderId } });
  return NextResponse.json({ success: true });
}
