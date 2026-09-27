export const mergeStreams = <T>(
  sources: Array<AsyncIterable<T>>,
  signal: AbortSignal,
): AsyncIterable<T> => ({
  [Symbol.asyncIterator]() {
    const buffered: T[] = [];
    let waiting: (() => void) | null = null;
    let failure: Error | null = null;
    let open = sources.length;

    const wake = () => {
      waiting?.();
      waiting = null;
    };

    for (const source of sources) {
      void (async () => {
        try {
          for await (const item of source) {
            buffered.push(item);
            wake();
          }
        } catch (error) {
          failure ??= error instanceof Error ? error : new Error(String(error));
        } finally {
          open -= 1;
          wake();
        }
      })();
    }

    signal.addEventListener("abort", wake, { once: true });

    return {
      async next(): Promise<IteratorResult<T>> {
        for (;;) {
          if (failure !== null) throw failure;
          if (buffered.length > 0)
            return { value: buffered.shift()!, done: false };
          if (open === 0 || signal.aborted)
            return { value: undefined, done: true };

          await new Promise<void>((resolve) => {
            waiting = resolve;
          });
        }
      },
    };
  },
});

export const subscription = <T>(
  subscribe: (listener: (item: T) => void) => Promise<() => Promise<void>>,
  signal: AbortSignal,
): AsyncIterable<T> => ({
  async *[Symbol.asyncIterator]() {
    const buffered: T[] = [];
    let waiting: (() => void) | null = null;
    const wake = () => {
      waiting?.();
      waiting = null;
    };
    const unsubscribe = await subscribe((item) => {
      buffered.push(item);
      wake();
    });

    signal.addEventListener("abort", wake, { once: true });

    try {
      while (!signal.aborted) {
        if (buffered.length > 0) {
          yield buffered.shift()!;
          continue;
        }

        await new Promise<void>((resolve) => {
          waiting = resolve;
        });
      }
    } finally {
      await unsubscribe();
    }
  },
});
