import type z from "zod";

import { make } from "@/core/registry";

import { Realtime } from "./ports";

const DEFAULT_MAX_BUFFERED = 1_000;

export interface ResumableStreamOptions<T> {
  channel: string;
  schema: z.ZodType<T>;
  after: number | null;
  position: (message: T) => number;
  replay: (after: number | null) => Promise<readonly T[]>;
  signal: AbortSignal;
  maxBuffered?: number;
}

export async function* resumableStream<T>({
  channel,
  schema,
  after,
  position,
  replay,
  signal,
  maxBuffered = DEFAULT_MAX_BUFFERED,
}: ResumableStreamOptions<T>): AsyncGenerator<T> {
  if (signal.aborted) return;

  const buffered: T[] = [];
  let overflowed = false;
  let wake: (() => void) | undefined;

  const notify = (): void => {
    wake?.();
    wake = undefined;
  };

  const unsubscribe = await make(Realtime).subscribe(
    channel,
    schema,
    (message) => {
      if (buffered.length >= maxBuffered) {
        overflowed = true;
      } else {
        buffered.push(message);
      }

      notify();
    },
  );

  signal.addEventListener("abort", notify, { once: true });

  let last = after ?? Number.NEGATIVE_INFINITY;

  try {
    for (const message of await replay(after)) {
      if (signal.aborted) return;

      const at = position(message);

      if (at <= last) continue;

      last = at;
      yield message;
    }

    while (!signal.aborted && !overflowed) {
      const message = buffered.shift();

      if (message === undefined) {
        await new Promise<void>((resolve) => {
          wake = resolve;
        });

        continue;
      }

      const at = position(message);

      if (at <= last) continue;

      last = at;
      yield message;
    }
  } finally {
    signal.removeEventListener("abort", notify);
    await unsubscribe();
  }
}
