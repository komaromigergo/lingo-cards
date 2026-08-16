"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, GraduationCap, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ImportDialog } from "@/components/upload/ImportDialog";

interface CardItem {
  id: string;
  front: string;
  back: string;
  language: string;
  status: "NEW" | "LEARNING" | "MASTERED";
  importSource: "NOTEBOOK" | "TEXTBOOK" | "MANUAL";
}

interface DeckInfo {
  id: string;
  title: string;
  description: string | null;
  frontLanguage: string;
  backLanguage: string;
}

const statusVariant = {
  NEW: "secondary",
  LEARNING: "default",
  MASTERED: "success",
} as const;

export default function DeckPage() {
  const params = useParams<{ deckId: string }>();
  const router = useRouter();
  const [deck, setDeck] = useState<DeckInfo | null>(null);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/decks/${params.deckId}`);
    if (res.status === 404) {
      router.push("/dashboard");
      return;
    }
    const data = await res.json();
    setDeck(data.deck);
    setCards(data.cards ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.deckId]);

  const addCard = async () => {
    if (!front.trim() || !back.trim() || !deck) return;
    setSaving(true);
    await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deckId: deck.id,
        cards: [{ front: front.trim(), back: back.trim(), language: deck.frontLanguage }],
        importSource: "MANUAL",
      }),
    });
    setSaving(false);
    setAddOpen(false);
    setFront("");
    setBack("");
    await load();
  };

  const deleteCard = async (id: string) => {
    await fetch(`/api/cards/${id}`, { method: "DELETE" });
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-8">
        <Link href={`/folder`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        {loading || !deck ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold">{deck.title}</h1>
                {deck.description && <p className="text-sm text-muted-foreground">{deck.description}</p>}
                <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                  {deck.frontLanguage} → {deck.backLanguage} · {cards.length} cards
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setAddOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add card
                </Button>
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Smart import
                </Button>
                <Button asChild disabled={cards.length === 0}>
                  <Link href={`/study/${deck.id}`}>
                    <GraduationCap className="mr-1.5 h-4 w-4" />
                    Study
                  </Link>
                </Button>
              </div>
            </div>

            {cards.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-20 text-center">
                <Sparkles className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium">No cards yet</p>
                <p className="text-sm text-muted-foreground">Add cards manually or import from photos with Gemini.</p>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" onClick={() => setAddOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add card
                  </Button>
                  <Button onClick={() => setImportOpen(true)}>
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    Smart import
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Front</th>
                      <th className="px-4 py-3">Back</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {cards.map((card) => (
                      <tr key={card.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">{card.front}</td>
                        <td className="px-4 py-3">{card.back}</td>
                        <td className="px-4 py-3">
                          <Badge variant={statusVariant[card.status]}>{card.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{card.importSource}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => void deleteCard(card.id)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Delete card"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <ImportDialog deckId={deck.id} open={importOpen} onOpenChange={setImportOpen} onImported={load} />

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add a card</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="front">Front ({deck.frontLanguage})</Label>
                    <Input id="front" value={front} onChange={(e) => setFront(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="back">Back ({deck.backLanguage})</Label>
                    <Input id="back" value={back} onChange={(e) => setBack(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={addCard} disabled={!front.trim() || !back.trim() || saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add card"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </main>
    </div>
  );
}
