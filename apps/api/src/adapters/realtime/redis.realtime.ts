import type { Redis } from "ioredis";
import type z from "zod";

import { getLogger } from "@/infrastructure";
import type { RedisConnection } from "@/infrastructure/redis";
import {
  Realtime,
  type RealtimeListener,
  type Unsubscribe,
} from "@/platform/realtime/ports/realtime";
import { RealtimeUnavailableError } from "@/platform/realtime/realtime.errors";

type RawListener = (raw: string) => void;

export class RedisRealtime extends Realtime {
  private readonly listeners = new Map<string, Set<RawListener>>();
  private readonly queues = new Map<string, Promise<void>>();
  private attached: Redis | undefined;

  constructor(
    private readonly publisher: RedisConnection,
    private readonly subscriber: RedisConnection,
    private readonly channelPrefix: string,
  ) {
    super();
  }

  public async publish(channel: string, message: unknown): Promise<void> {
    const client = this.publisher.instance;

    if (client.status !== "ready") {
      getLogger().warn(
        { component: "RedisRealtime", channel },
        "realtime unavailable; message not published",
      );

      return;
    }

    try {
      await client.publish(this.channel(channel), JSON.stringify(message));
    } catch (error) {
      getLogger().error(
        { component: "RedisRealtime", channel, err: error },
        "realtime publish failed",
      );
    }
  }

  public async subscribe<T>(
    channel: string,
    schema: z.ZodType<T>,
    listener: RealtimeListener<T>,
  ): Promise<Unsubscribe> {
    const raw: RawListener = (payload) => {
      const result = schema.safeParse(this.parse(payload));

      if (result.success) {
        listener(result.data);

        return;
      }

      getLogger().warn(
        { component: "RedisRealtime", channel, issues: result.error.issues },
        "dropping malformed realtime message",
      );
    };

    await this.serially(channel, async () => {
      const listeners = this.listeners.get(channel) ?? new Set<RawListener>();

      if (listeners.size === 0) {
        await this.subscribeChannel(channel);
      }

      listeners.add(raw);
      this.listeners.set(channel, listeners);
    });

    let active = true;

    return () => {
      if (!active) return Promise.resolve();

      active = false;

      return this.serially(channel, async () => {
        const listeners = this.listeners.get(channel);

        if (!listeners) return;

        listeners.delete(raw);

        if (listeners.size > 0) return;

        this.listeners.delete(channel);
        await this.unsubscribeChannel(channel);
      });
    };
  }

  public async verify(): Promise<void> {
    await this.publisher.connect();
    await this.client();

    if (!(await this.publisher.ping())) {
      throw new Error("Realtime redis ping failed");
    }
  }

  public async ping(): Promise<boolean> {
    return (
      this.subscriber.instance.status === "ready" &&
      (await this.publisher.ping())
    );
  }

  public async close(): Promise<void> {
    this.listeners.clear();
    this.attached = undefined;

    await this.subscriber.close();
  }

  private async subscribeChannel(channel: string): Promise<void> {
    try {
      const client = await this.client();

      await client.subscribe(this.channel(channel));
    } catch (error) {
      getLogger().error(
        { component: "RedisRealtime", channel, err: error },
        "realtime subscribe failed",
      );

      throw new RealtimeUnavailableError();
    }
  }

  private async unsubscribeChannel(channel: string): Promise<void> {
    try {
      await this.attached?.unsubscribe(this.channel(channel));
    } catch (error) {
      getLogger().warn(
        { component: "RedisRealtime", channel, err: error },
        "realtime unsubscribe failed",
      );
    }
  }

  private async client(): Promise<Redis> {
    const client = await this.subscriber.connect();

    if (this.attached !== client) {
      client.on("message", (channel: string, payload: string) => {
        this.dispatch(channel, payload);
      });

      this.attached = client;
    }

    return client;
  }

  private dispatch(fullChannel: string, payload: string): void {
    if (!fullChannel.startsWith(this.channelPrefix)) return;

    const channel = fullChannel.slice(this.channelPrefix.length);

    for (const listener of this.listeners.get(channel) ?? []) {
      listener(payload);
    }
  }

  private parse(payload: string): unknown {
    try {
      return JSON.parse(payload);
    } catch {
      return undefined;
    }
  }

  private serially(channel: string, task: () => Promise<void>): Promise<void> {
    const previous = this.queues.get(channel) ?? Promise.resolve();
    const next = previous.then(task, task);
    const settled = next.catch(() => undefined);

    this.queues.set(channel, settled);

    void settled.then(() => {
      if (this.queues.get(channel) === settled) this.queues.delete(channel);
    });

    return next;
  }

  private channel(channel: string): string {
    return `${this.channelPrefix}${channel}`;
  }
}
