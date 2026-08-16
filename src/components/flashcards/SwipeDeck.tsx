"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Check, X, RotateCcw, PartyPopper, Repeat } from "lucide-react";
import { FlashcardViewer } from "./FlashcardViewer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useStudySession, type StudyCard, type SwipeDirection } from "@/hooks/useStudySession";
import { cn } from "@/lib/utils";

export interface SwipeDeckProps {
  cards: StudyCard[];
  frontLanguage: string;
  backLanguage: string;
  /** Which language shows on the front face: "front" = deck's frontLanguage, "back" = swap */
  displayDirection?: "front" | "back";
  onResolve?: (cardId: string, direction: SwipeDirection) => void;
  onSessionComplete?: (stats: { mastered: number; missed: number }) => void;
}

const SWIPE_THRESHOLD = 120;

export function SwipeDeck({
  cards,
  frontLanguage,
  backLanguage,
  displayDirection = "front",
  onResolve,
  onSessionComplete,
}: SwipeDeckProps) {
  const {
    current,
    remaining,
    progressPct,
    round,
    missedCount,
    masteredCount,
    sessionComplete,
    resolveCurrent,
    repeatMissedOnly,
    restartFullDeck,
    hasMissed,
  } = useStudySession({ cards, onResolve });

  const [flipped, setFlipped] = useState(false);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);

  useEffect(() => {
    if (sessionComplete) {
      onSessionComplete?.({ mastered: masteredCount, missed: missedCount });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionComplete]);

  const swap = displayDirection === "back";
  const displayFront = swap ? backLanguage : frontLanguage;
  const displayBack = swap ? frontLanguage : backLanguage;

  const handleSwipe = (direction: SwipeDirection) => {
    setExitDirection(direction === "MASTERED" ? "right" : "left");
    setFlipped(false);
    setTimeout(() => {
      resolveCurrent(direction);
      setExitDirection(null);
    }, 200);
  };

  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      handleSwipe("MASTERED");
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      handleSwipe("LEARNING");
    }
  };

  if (sessionComplete) {
    const finished = round > 1 || !hasMissed;
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 rounded-3xl border border-border bg-card p-10 text-center shadow-lg">
        <PartyPopper className="h-12 w-12 text-primary" />
        <div>
          <h3 className="text-2xl font-bold">Session complete!</h3>
          <p className="mt-2 text-muted-foreground">
            {masteredCount} mastered · {missedCount} still learning
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          {hasMissed && (
            <Button className="flex-1" size="lg" onClick={repeatMissedOnly}>
              <Repeat className="mr-2 h-4 w-4" />
              Repeat missed ({missedCount})
            </Button>
          )}
          <Button className="flex-1" size="lg" variant="outline" onClick={restartFullDeck}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart deck
          </Button>
        </div>
        {finished && !hasMissed && (
          <p className="text-sm text-success">🎉 All cards mastered this round!</p>
        )}
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex items-center gap-3">
        <Progress value={progressPct} className="flex-1" />
        <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">
          {remaining} left {round > 1 && `· round ${round}`}
        </span>
      </div>

      <div className="relative h-64 sm:h-80">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={current.id}
            className="absolute inset-0"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, x: 0, rotate: 0 }}
            exit={{
              x: exitDirection === "right" ? 400 : exitDirection === "left" ? -400 : 0,
              rotate: exitDirection === "right" ? 20 : exitDirection === "left" ? -20 : 0,
              opacity: 0,
              transition: { duration: 0.25 },
            }}
            whileDrag={{ cursor: "grabbing" }}
          >
            <FlashcardViewer
              front={swap ? current.back : current.front}
              back={swap ? current.front : current.back}
              frontLanguage={displayFront}
              backLanguage={displayBack}
              flipped={flipped}
              onFlip={setFlipped}
              className="h-full"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button
          size="lg"
          variant="outline"
          className={cn("h-16 w-16 rounded-full border-2 border-destructive/40 p-0 text-destructive hover:bg-destructive/10")}
          onClick={() => handleSwipe("LEARNING")}
          aria-label="Still learning"
        >
          <X className="h-7 w-7" />
        </Button>
        <Button
          size="lg"
          variant="ghost"
          className="text-sm text-muted-foreground"
          onClick={() => setFlipped((f) => !f)}
        >
          Flip
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-16 w-16 rounded-full border-2 border-success/40 p-0 text-success hover:bg-success/10"
          onClick={() => handleSwipe("MASTERED")}
          aria-label="Mastered"
        >
          <Check className="h-7 w-7" />
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Swipe right = Mastered · Swipe left = Learning · Tap card to flip
      </p>
    </div>
  );
}
