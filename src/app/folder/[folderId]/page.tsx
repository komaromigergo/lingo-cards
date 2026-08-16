"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Layers, Loader2, Plus, Trash2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Deck {
  id: string;
  title: string;
  description: string | null;
  frontLanguage: string;
  backLanguage: string;
  _count: { cards: number };
}

const LANGUAGES = [
  { code: "de", label: "German" },
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "hu", label: "Hungarian" },
];

export default function FolderPage() {
  const params = useParams<{ folderId: string }>();
  const router = useRouter();
  const [folderName, setFolderName] = useState("");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [frontLanguage, setFrontLanguage] = useState("de");
  const [backLanguage, setBackLanguage] = useState("hu");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/folders/${params.folderId}`);
    if (res.status === 404) {
      router.push("/dashboard");
      return;
    }
    const data = await res.json();
    setFolderName(data.folder.name);
    setDecks(data.folder.decks ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.folderId]);

  const createDeck = async () => {
    if (!title.trim()) return;
    setCreating(true);
    await fetch("/api/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
        folderId: params.folderId,
        frontLanguage,
        backLanguage,
      }),
    });
    setCreating(false);
    setDialogOpen(false);
    setTitle("");
    setDescription("");
    await load();
  };

  const deleteDeck = async (id: string) => {
    if (!confirm("Delete this deck and all its cards?")) return;
    await fetch(`/api/decks/${id}`, { method: "DELETE" });
    setDecks((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container py-8">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to folders
        </Link>

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{loading ? "Loading…" : folderName}</h1>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New deck
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : decks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-20 text-center">
            <Layers className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No decks yet</p>
            <p className="text-sm text-muted-foreground">Create a deck, then import vocabulary with Gemini.</p>
            <Button className="mt-2" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              New deck
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <Card key={deck.id} className="group relative overflow-hidden transition-shadow hover:shadow-md">
                <Link href={`/deck/${deck.id}`}>
                  <CardHeader>
                    <CardTitle className="text-base">{deck.title}</CardTitle>
                    <CardDescription>
                      {deck.frontLanguage.toUpperCase()} → {deck.backLanguage.toUpperCase()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {deck._count.cards} card{deck._count.cards !== 1 && "s"}
                    </p>
                  </CardContent>
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    void deleteDeck(deck.id);
                  }}
                  className="absolute right-3 top-3 rounded-full bg-background/80 p-2 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  aria-label="Delete deck"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new deck</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deck-title">Title</Label>
              <Input id="deck-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 3 Vocabulary" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deck-desc">Description (optional)</Label>
              <Textarea id="deck-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Front language</Label>
                <Select value={frontLanguage} onValueChange={setFrontLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Back language</Label>
                <Select value={backLanguage} onValueChange={setBackLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createDeck} disabled={!title.trim() || creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create deck"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
