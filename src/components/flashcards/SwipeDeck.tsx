"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from "framer-motion";
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
  displayDirection?: "front" | "back";
  onResolve?: (cardId: string, direction: SwipeDirection) => void;
  onSessionComplete?: (stats: { mastered: number; missed: number }) => void;
}

const SWIPE_THRESHOLD = 120;

function SwipeCard({
  cardId,
  front,
  back,
  frontLanguage,
  backLanguage,
  flipped,
  onFlip,
  onSwipe,
}: {
  cardId: string;
  front: string;
  back: string;
  frontLanguage: string;
  backLanguage: string;
  flipped: boolean;
  onFlip: (flipped: boolean) => void;
  onSwipe: (direction: SwipeDirection) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const masteredOpacity = useTransform(x, [20, 120], [0, 1]);
  const learningOpacity = useTransform(x, [-120, -20], [1, 0]);

  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      onSwipe("MASTERED");
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      onSwipe("LEARNING");
    }
  };

  return (
    <motion.div
      key={cardId}
      className="absolute inset-0"
      style={{ x, rotate, touchAction: "none" }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.85}
      dragTransition={{ bounceStiffness: 420, bounceDamping: 38 }}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.94, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      whileDrag={{ cursor: "grabbing" }}
    >
      {/* Overlay stamps that fade in as you drag */}
      <motion.div
        style={{ opacity: masteredOpacity }}
        className="pointer-events-none absolute left-4 top-6 z-10 -rotate-12 rounded-lg border-4 border-success px-3 py-1 text-lg font-black uppercase tracking-wider text-success"
      >
        Mastered
      </motion.div>
      <motion.div
        style={{ opacity: learningOpacity }}
        className="pointer-events-none absolute right-4 top-6 z-10 rotate-12 rounded-lg border-4 border-destructive px-3 py-1 text-lg font-black uppercase tracking-wider text-destructive"
      >
        Learning
      </motion.div>

      <FlashcardViewer
        front={front}
        back={back}
        frontLanguage={frontLanguage}
        backLanguage={backLanguage}
        flipped={flipped}
        onFlip={onFlip}
        className="h-full"
      />
    </motion.div>
  );
}

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

  useEffect(() => {
    setFlipped(false);
  }, [current?.id]);

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
    setFlipped(false);
    resolveCurrent(direction);
  };

  if (sessionComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="mx-auto flex w-full max-w-md flex-col items-center gap-5 rounded-3xl border border-border bg-card p-6 text-center shadow-lg sm:p-10"
      >
        <PartyPopper className="h-10 w-10 text-primary sm:h-12 sm:w-12" />
        <div>
          <h3 className="text-xl font-bold sm:text-2xl">Session complete!</h3>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {masteredCount} mastered · {missedCount} still learning
          </p>
        </div>
        <div className="flex w-full flex-col gap-2">
          {hasMissed && (
            <Button className="w-full" size="lg" onClick={repeatMissedOnly}>
              <Repeat className="mr-2 h-4 w-4" />
              Repeat missed ({missedCount})
            </Button>
          )}
          <Button
            className="w-full text-muted-foreground"
            size="sm"
            variant="ghost"
            onClick={restartFullDeck}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Restart deck
          </Button>
        </div>
        {!hasMissed && (
          <p className="text-sm text-success">🎉 All cards mastered this round!</p>
        )}
      </motion.div>
    );
  }

  if (!current) return null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 overscroll-none">
      <div className="flex items-center gap-3">
        <Progress value={progressPct} className="flex-1" />
        <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">
          {remaining} left {round > 1 && `· round ${round}`}
        </span>
      </div>

      <div className="relative h-64 overflow-visible sm:h-80">
        <AnimatePresence mode="popLayout" initial={false}>
          <SwipeCard
            key={current.id}
            cardId={current.id}
            front={swap ? current.back : current.front}
            back={swap ? current.front : current.back}
            frontLanguage={displayFront}
            backLanguage={displayBack}
            flipped={flipped}
            onFlip={setFlipped}
            onSwipe={handleSwipe}
          />
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
