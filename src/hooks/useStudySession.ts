"use client";

import { useCallback, useMemo, useState } from "react";
import { shuffle } from "@/lib/utils";

export interface StudyCard {
  id: string;
  front: string;
  back: string;
  language: string;
}

export type SwipeDirection = "MASTERED" | "LEARNING";

interface UseStudySessionOptions {
  cards: StudyCard[];
  /** Called every time a card is resolved (swiped), for persisting progress to the API */
  onResolve?: (cardId: string, direction: SwipeDirection) => void;
  shuffleOnStart?: boolean;
}

export function useStudySession({ cards, onResolve, shuffleOnStart = true }: UseStudySessionOptions) {
  const [queue, setQueue] = useState<StudyCard[]>(() => (shuffleOnStart ? shuffle(cards) : cards));
  const [missed, setMissed] = useState<StudyCard[]>([]);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [round, setRound] = useState(1); // 1 = full deck, 2+ = "missed only" rounds
  const [totalInRound, setTotalInRound] = useState(cards.length);
  const [sessionComplete, setSessionComplete] = useState(cards.length === 0);

  const current = queue[0] ?? null;
  const remaining = queue.length;

  const progressPct = useMemo(() => {
    if (totalInRound === 0) return 0;
    return ((totalInRound - remaining) / totalInRound) * 100;
  }, [totalInRound, remaining]);

  const resolveCurrent = useCallback(
    (direction: SwipeDirection) => {
      if (!current) return;
      onResolve?.(current.id, direction);

      if (direction === "MASTERED") {
        setMasteredIds((prev) => new Set(prev).add(current.id));
      } else {
        setMissed((prev) => [...prev, current]);
      }

      setQueue((prev) => {
        const next = prev.slice(1);
        if (next.length === 0) {
          setSessionComplete(true);
        }
        return next;
      });
    },
    [current, onResolve]
  );

  /** Start a new round containing only the cards that were marked "Learning" last round. */
  const repeatMissedOnly = useCallback(() => {
    if (missed.length === 0) return;
    const nextQueue = shuffle(missed);
    setQueue(nextQueue);
    setTotalInRound(nextQueue.length);
    setMissed([]);
    setRound((r) => r + 1);
    setSessionComplete(false);
  }, [missed]);

  const restartFullDeck = useCallback(() => {
    const nextQueue = shuffle(cards);
    setQueue(nextQueue);
    setTotalInRound(nextQueue.length);
    setMissed([]);
    setMasteredIds(new Set());
    setRound(1);
    setSessionComplete(cards.length === 0);
  }, [cards]);

  return {
    current,
    remaining,
    progressPct,
    round,
    missedCount: missed.length,
    masteredCount: masteredIds.size,
    sessionComplete,
    resolveCurrent,
    repeatMissedOnly,
    restartFullDeck,
    hasMissed: missed.length > 0,
  };
}
