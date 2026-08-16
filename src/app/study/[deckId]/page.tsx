"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Languages, Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SwipeDeck } from "@/components/flashcards/SwipeDeck";
import type { StudyCard, SwipeDirection } from "@/hooks/useStudySession";
import Link from "next/link";

interface DeckInfo {
  id: string;
  title: string;
  frontLanguage: string;
  backLanguage: string;
}

export default function StudyPage() {
  const params = useParams<{ deckId: string }>();
  const router = useRouter();
  const [deck, setDeck] = useState<DeckInfo | null>(null);
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState<"front" | "back" | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/decks/${params.deckId}`);
      if (res.status === 404) {
        router.push("/dashboard");
        return;
      }
      const data = await res.json();
      setDeck(data.deck);
      setCards(
        (data.cards ?? []).map((c: { id: string; front: string; back: string; language: string }) => ({
          id: c.id,
          front: c.front,
          back: c.back,
          language: c.language,
        }))
      );
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.deckId]);

  const persistResult = async (cardId: string, dir: SwipeDirection) => {
    await fetch(`/api/cards/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: dir }),
    });
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container flex flex-col items-center py-8">
        <Link
          href={deck ? `/deck/${deck.id}` : "/dashboard"}
          className="mb-6 inline-flex w-full max-w-md items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to deck
        </Link>

        {loading || !deck ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : cards.length === 0 ? (
          <p className="text-muted-foreground">This deck has no cards to study yet.</p>
        ) : direction === null ? (
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Languages className="h-5 w-5" />
              </div>
              <CardTitle>{deck.title}</CardTitle>
              <CardDescription>Which language should show first on each card?</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button size="lg" onClick={() => setDirection("front")}>
                {deck.frontLanguage.toUpperCase()} → {deck.backLanguage.toUpperCase()}
              </Button>
              <Button size="lg" variant="outline" onClick={() => setDirection("back")}>
                {deck.backLanguage.toUpperCase()} → {deck.frontLanguage.toUpperCase()}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <SwipeDeck
            cards={cards}
            frontLanguage={deck.frontLanguage}
            backLanguage={deck.backLanguage}
            displayDirection={direction}
            onResolve={persistResult}
          />
        )}
      </main>
    </div>
  );
}
