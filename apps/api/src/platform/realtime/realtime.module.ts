import { MemoryRealtime } from "@/adapters/realtime/memory.realtime";
import { RedisRealtime } from "@/adapters/realtime/redis.realtime";
import { NodeEnv } from "@/configs";
import { SECOND } from "@/constants";
import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";
import {
  createOwnedRedisConnection,
  getSharedRedisConnection,
} from "@/infrastructure/redis";

import { Realtime } from "./ports";

export const realtimeModule = defineModule({
  name: "realtime",

  register: ({ env }) => {
    if (env.NODE_ENV === NodeEnv.Test) {
      const realtime = new MemoryRealtime();

      bind(Realtime, () => realtime);

      return { realtime, redis: undefined };
    }

    const url = env.REALTIME_REDIS_URL ?? env.CACHE_REDIS_URL;

    const publisher = getSharedRedisConnection({
      name: "realtime",
      url,
      options: {
        connectTimeout: 2 * SECOND,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
      },
    });
    const subscriber = createOwnedRedisConnection({
      name: "realtime-subscriber",
      url,
      options: { connectTimeout: 2 * SECOND },
    });
    const realtime = new RedisRealtime(
      publisher,
      subscriber,
      `${env.APP_SLUG}:realtime:`,
    );

    bind(Realtime, () => realtime);

    return { realtime, redis: realtime };
  },

  start: ({ state }) => state.realtime.verify(),

  ready: ({ state }) => state.redis?.ping() ?? true,

  shutdown: ({ state }) => state.realtime.close(),
});
