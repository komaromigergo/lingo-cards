"use client";

import { useState } from "react";
import { Loader2, Sparkles, Trash2, BookOpen, Highlighter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUploader, type UploadedImage } from "@/components/upload/ImageUploader";
import type { GeneratedCard, ImportMode } from "@/types";

export interface ImportDialogProps {
  deckId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function ImportDialog({ deckId, open, onOpenChange, onImported }: ImportDialogProps) {
  const [mode, setMode] = useState<ImportMode>("NOTEBOOK");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [preview, setPreview] = useState<GeneratedCard[] | null>(null);

  const reset = () => {
    setImages([]);
    setPreview(null);
    setError(null);
    setWarnings([]);
  };

  const handleGenerate = async () => {
    if (images.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          images: images.map((img) => ({ base64: img.base64, mimeType: img.mimeType })),
          targetLanguage: "hu",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setPreview(data.cards);
      setWarnings(data.warnings ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const updateCard = (index: number, field: keyof GeneratedCard, value: string) => {
    if (!preview) return;
    const next = [...preview];
    next[index] = { ...next[index], [field]: value };
    setPreview(next);
  };

  const removeCard = (index: number) => {
    if (!preview) return;
    setPreview(preview.filter((_, i) => i !== index));
  };

  const handleCommit = async () => {
    if (!preview || preview.length === 0) return;
    setCommitting(true);
    setError(null);
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId, cards: preview, importSource: mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save cards");
      onImported();
      onOpenChange(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCommitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Smart import with Gemini</DialogTitle>
          <DialogDescription>
            Upload photos and let AI turn them into ready-to-study flashcards.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <>
            <Tabs value={mode} onValueChange={(v) => setMode(v as ImportMode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="NOTEBOOK">
                  <BookOpen className="mr-1.5 h-4 w-4" />
                  Vocabulary notebook
                </TabsTrigger>
                <TabsTrigger value="TEXTBOOK">
                  <Highlighter className="mr-1.5 h-4 w-4" />
                  Textbook (green underline)
                </TabsTrigger>
              </TabsList>
              <TabsContent value="NOTEBOOK">
                <ImageUploader
                  images={images}
                  onChange={setImages}
                  label="Upload notebook pages"
                  helperText="Two-column pages: foreign word on the left, translation on the right. Missing translations are auto-generated."
                />
              </TabsContent>
              <TabsContent value="TEXTBOOK">
                <ImageUploader
                  images={images}
                  onChange={setImages}
                  label="Upload textbook pages"
                  helperText="Only words underlined or highlighted in GREEN will be extracted and translated."
                />
              </TabsContent>
            </Tabs>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button onClick={handleGenerate} disabled={images.length === 0 || loading} size="lg">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing with Gemini…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate flashcards
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {warnings.length > 0 && (
              <div className="rounded-xl bg-secondary p-3 text-sm text-muted-foreground">
                {warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            )}

            {preview.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cards were generated. Try again with clearer photos.</p>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">
                  Review {preview.length} generated card{preview.length !== 1 && "s"} before saving:
                </p>
                <div className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
                  {preview.map((card, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-xl border border-border p-2">
                      <Input
                        value={card.front}
                        onChange={(e) => updateCard(i, "front", e.target.value)}
                        className="h-9"
                        placeholder="Front"
                      />
                      <Input
                        value={card.back}
                        onChange={(e) => updateCard(i, "back", e.target.value)}
                        className="h-9"
                        placeholder="Back"
                      />
                      <Input
                        value={card.language}
                        onChange={(e) => updateCard(i, "language", e.target.value)}
                        className="h-9 w-16 shrink-0"
                        placeholder="lang"
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeCard(i)} aria-label="Remove card">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button variant="outline" onClick={reset}>
                Start over
              </Button>
              <Button onClick={handleCommit} disabled={preview.length === 0 || committing}>
                {committing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  `Add ${preview.length} card${preview.length !== 1 ? "s" : ""} to deck`
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
