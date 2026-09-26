import type z from "zod";

import { Port } from "@/core/port";

export type RealtimeListener<T> = (message: T) => void;

export type Unsubscribe = () => Promise<void>;

export abstract class Realtime extends Port {
  public abstract publish(channel: string, message: unknown): Promise<void>;

  public abstract subscribe<T>(
    channel: string,
    schema: z.ZodType<T>,
    listener: RealtimeListener<T>,
  ): Promise<Unsubscribe>;

  public verify(): Promise<void> {
    return Promise.resolve();
  }

  public close(): Promise<void> {
    return Promise.resolve();
  }
}
