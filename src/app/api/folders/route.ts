export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/folders — list the current user's folders (with deck counts) */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const folders = await prisma.folder.findMany({
    where: { ownerId: session.user.id },
    include: { _count: { select: { decks: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ folders });
}

/** POST /api/folders — create a new folder for the current user */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, color } = await req.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const folder = await prisma.folder.create({
    data: { name, color, ownerId: session.user.id },
  });

  return NextResponse.json({ folder }, { status: 201 });
}
