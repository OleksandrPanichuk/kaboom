import type z from "zod";

import { getLogger } from "@/infrastructure";
import {
  Realtime,
  type RealtimeListener,
  type Unsubscribe,
} from "@/platform/realtime/ports/realtime";

type RawListener = (raw: string) => void;

export class MemoryRealtime extends Realtime {
  private readonly channels = new Map<string, Set<RawListener>>();

  public listenerCount(channel?: string): number {
    if (channel !== undefined) return this.channels.get(channel)?.size ?? 0;

    return [...this.channels.values()].reduce((sum, set) => sum + set.size, 0);
  }

  public clear(): void {
    this.channels.clear();
  }

  public publish(channel: string, message: unknown): Promise<void> {
    const raw = JSON.stringify(message);

    for (const listener of this.channels.get(channel) ?? []) {
      queueMicrotask(() => listener(raw));
    }

    return Promise.resolve();
  }

  public subscribe<T>(
    channel: string,
    schema: z.ZodType<T>,
    listener: RealtimeListener<T>,
  ): Promise<Unsubscribe> {
    const raw: RawListener = (payload) => {
      const result = schema.safeParse(JSON.parse(payload));

      if (result.success) {
        listener(result.data);

        return;
      }

      getLogger().warn(
        { component: "MemoryRealtime", channel, issues: result.error.issues },
        "dropping malformed realtime message",
      );
    };

    const listeners = this.channels.get(channel) ?? new Set<RawListener>();

    listeners.add(raw);
    this.channels.set(channel, listeners);

    return Promise.resolve(() => {
      listeners.delete(raw);

      if (listeners.size === 0) this.channels.delete(channel);

      return Promise.resolve();
    });
  }
}
