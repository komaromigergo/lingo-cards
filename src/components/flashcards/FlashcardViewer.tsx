"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FlashcardViewerProps {
  front: string;
  back: string;
  frontLanguage?: string;
  backLanguage?: string;
  /** Controlled flip state; if omitted, component manages its own state */
  flipped?: boolean;
  onFlip?: (flipped: boolean) => void;
  className?: string;
}

/**
 * A single flashcard that flips on click/tap, revealing the translation.
 * Uses a real 3D rotateY transform (not a fade) for the "physical card" feel.
 */
export function FlashcardViewer({
  front,
  back,
  frontLanguage = "de",
  backLanguage = "hu",
  flipped: flippedProp,
  onFlip,
  className,
}: FlashcardViewerProps) {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const isControlled = flippedProp !== undefined;
  const flipped = isControlled ? flippedProp : internalFlipped;

  // Reset to front whenever the card content changes
  useEffect(() => {
    if (!isControlled) setInternalFlipped(false);
  }, [front, back, isControlled]);

  const toggle = () => {
    const next = !flipped;
    if (!isControlled) setInternalFlipped(next);
    onFlip?.(next);
  };

  const speak = (text: string, lang: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className={cn("perspective-1000 w-full", className)}>
      <motion.div
        className="relative h-64 w-full cursor-pointer select-none sm:h-80"
        onClick={toggle}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 260, damping: 24 }}
        style={{ transformStyle: "preserve-3d" }}
        role="button"
        tabIndex={0}
        aria-label="Flip flashcard"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
      >
        {/* FRONT */}
        <div
          className="card-face absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-border bg-card p-8 text-center shadow-lg"
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="absolute left-5 top-5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {frontLanguage}
          </span>
          <button
            onClick={(e) => speak(front, frontLanguage, e)}
            className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Pronounce"
          >
            <Volume2 className="h-5 w-5" />
          </button>
          <p className="text-3xl font-bold leading-snug text-foreground sm:text-4xl">{front}</p>
          <span className="mt-6 text-xs text-muted-foreground">Tap to flip</span>
        </div>

        {/* BACK */}
        <div
          className="card-face absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-border bg-primary p-8 text-center shadow-lg"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <span className="absolute left-5 top-5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
            {backLanguage}
          </span>
          <button
            onClick={(e) => speak(back, backLanguage, e)}
            className="absolute right-5 top-5 rounded-full p-2 text-primary-foreground/80 transition-colors hover:bg-white/20 hover:text-primary-foreground"
            aria-label="Pronounce"
          >
            <Volume2 className="h-5 w-5" />
          </button>
          <p className="text-3xl font-bold leading-snug text-primary-foreground sm:text-4xl">{back}</p>
          <span className="mt-6 text-xs text-primary-foreground/70">Tap to flip back</span>
        </div>
      </motion.div>
    </div>
  );
}
