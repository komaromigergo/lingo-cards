# Lingo Cards

AI-powered, Quizlet-style vocabulary flashcard app with Gemini-powered OCR import from photos of vocabulary notebooks or underlined textbook pages.

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Styling:** Tailwind CSS + shadcn-style components + Framer Motion (card flip / swipe)
- **Database:** SQLite via Prisma ORM (swap to PostgreSQL by changing the `provider` in `prisma/schema.prisma`)
- **Auth:** NextAuth (credentials provider, JWT sessions, `ADMIN`/`USER` roles)
- **AI:** `@google/genai` SDK, `gemini-1.5-flash`, structured JSON output

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in:

| Variable | Description |
|---|---|
| `DATABASE_URL` | `file:./dev.db` for SQLite (default), or a Postgres connection string |
| `NEXTAUTH_SECRET` | Any long random string — generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` for local dev |
| `GEMINI_API_KEY` | Your Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) |

### 3. Set up the database

```bash
npm run prisma:migrate   # creates the SQLite DB + tables
npm run seed              # creates a default admin user + demo deck
```

The seed script creates:
- **Admin login:** `admin@lingocards.app` / `ChangeMe123!` — **change this password immediately in the Admin Panel.**
- A demo folder ("German A2") with one deck and 5 sample cards, so you can try Study Mode right away.

### 4. Run the dev server

```bash
npm run dev
```

Visit `http://localhost:3000` — you'll land on the login page.

## Project Structure

See the inline comments in each file; the high-level layout is:

- `prisma/schema.prisma` — data model (User, Folder, Deck, Card, StudyLog)
- `src/lib/gemini.ts` — Gemini integration, prompts, and JSON schema for both import modes
- `src/app/api/*` — REST-style API routes (auth, users, folders, decks, cards, import)
- `src/components/flashcards/*` — `FlashcardViewer` (flip) and `SwipeDeck` (swipe/study session)
- `src/components/upload/*` — `ImageUploader` (multi-photo picker) and `ImportDialog` (full import flow)
- `src/app/{login,dashboard,folder,deck,study,admin}` — page views

## How Smart Import Works

1. On a deck page, click **Smart import**.
2. Choose a mode:
   - **Vocabulary notebook** — upload photos of a two-column notebook (foreign word | translation). Gemini reads both columns; if a translation is missing in the photo, Gemini generates the correct Hungarian translation automatically.
   - **Textbook (green underline)** — upload photos of textbook pages. Gemini detects only words/phrases underlined or highlighted in **green** and generates their Hungarian translations.
3. Gemini returns a structured JSON array (`{ front, back, language }`) which you can review and edit inline.
4. Confirm to commit the reviewed cards to the deck.

## Study Mode

- Pick which language shows first (front language ↔ back language).
- Tap a card to flip it.
- Swipe right (or tap ✓) = **Mastered**; swipe left (or tap ✕) = **Learning**.
- At the end of a session, optionally **Repeat only missed cards** until every card is mastered.

## Roles

- **ADMIN** — full access to the Admin Panel (`/admin`) to create, edit, and delete users.
- **USER** — manages their own folders, decks, and cards only (all API routes are scoped to the authenticated user's ownership).

## Production Notes

- Switch `datasource db { provider = "sqlite" }` to `"postgresql"` in `prisma/schema.prisma` and update `DATABASE_URL` for production deployments.
- Consider rate-limiting `/api/import` since each call consumes Gemini API quota.
- Rotate the seeded admin password immediately after first login.
