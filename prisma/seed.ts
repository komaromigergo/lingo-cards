import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@lingocards.app";
  const adminPassword = "ChangeMe123!";

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingAdmin) {
    console.log(`Admin user already exists: ${adminEmail}`);
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const admin = await prisma.user.create({
      data: {
        name: "Admin",
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
      },
    });
    console.log(`Created admin user: ${admin.email} / password: ${adminPassword}`);

    const folder = await prisma.folder.create({
      data: { name: "German A2", color: "#6366f1", ownerId: admin.id },
    });

    const deck = await prisma.deck.create({
      data: {
        title: "Chapter 1 — Everyday Words",
        description: "Basic vocabulary to get started",
        folderId: folder.id,
        frontLanguage: "de",
        backLanguage: "hu",
      },
    });

    await prisma.card.createMany({
      data: [
        { front: "das Buch", back: "a könyv", language: "de", deckId: deck.id, importSource: "MANUAL" },
        { front: "die Katze", back: "a macska", language: "de", deckId: deck.id, importSource: "MANUAL" },
        { front: "laufen", back: "futni", language: "de", deckId: deck.id, importSource: "MANUAL" },
        { front: "schön", back: "szép", language: "de", deckId: deck.id, importSource: "MANUAL" },
        { front: "das Fenster", back: "az ablak", language: "de", deckId: deck.id, importSource: "MANUAL" },
      ],
    });

    console.log("Seeded demo folder, deck, and 5 sample cards.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
