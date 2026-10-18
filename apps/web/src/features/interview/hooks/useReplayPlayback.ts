import { useEffect, useState } from "react";

import { nextStop } from "@/features/interview/utils";

const STEP_MS = 900;

export const REPLAY_SPEEDS = [1, 2, 4] as const;

export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number];

export const useReplayPlayback = (stops: readonly number[]) => {
  const [offset, setOffset] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);

  useEffect(() => {
    if (!playing) return;

    const timer = window.setInterval(() => {
      setOffset((current) => {
        const next = nextStop(stops, current);

        if (next === null) {
          setPlaying(false);

          return current;
        }

        return next;
      });
    }, STEP_MS / speed);

    return () => window.clearInterval(timer);
  }, [playing, speed, stops]);

  return { offset, setOffset, playing, setPlaying, speed, setSpeed };
};
