import { type Context, sse, type TSchema } from "elysia";

import { type AppLogger, getLogger } from "@/infrastructure";

import type { AuthUser } from "./auth";
import { captureException } from "./error-reporting";
import { AppError } from "./errors";
import type {
  RouteDetail,
  RouteRateLimitHook,
  RouteRateLimitOptions,
} from "./route";

type Static<S> = S extends TSchema ? S["static"] : never;

const DEFAULT_HEARTBEAT_MS = 15_000;

const HEARTBEAT = Symbol("heartbeat");

export interface StreamEvent {
  id?: string | number;
  event?: string;
  data: unknown;
}

export type StreamContext<
  Params extends TSchema | undefined,
  Query extends TSchema | undefined,
  Auth extends boolean,
> = {
  params: Static<Params>;
  query: Static<Query>;
  request: Context["request"];
  headers: Context["headers"];
  cookie: Context["cookie"];
  set: Context["set"];
  log: AppLogger;
  lastEventId: string | null;
  signal: AbortSignal;
} & (Auth extends true ? { user: AuthUser } : object);

export type StreamGuard<
  Params extends TSchema | undefined,
  Query extends TSchema | undefined,
  Auth extends boolean,
> = (context: StreamContext<Params, Query, Auth>) => void | Promise<void>;

export interface StreamRouteDefinition<
  Params extends TSchema | undefined,
  Query extends TSchema | undefined,
  Auth extends boolean,
> {
  params?: Params;
  query?: Query;
  auth?: Auth;
  rateLimit?:
    | RouteRateLimitOptions<undefined, Params, Query, Auth>
    | Array<RouteRateLimitOptions<undefined, Params, Query, Auth>>;
  guards?: Array<StreamGuard<Params, Query, Auth>>;
  heartbeatMs?: number;
  summary?: string;
  description?: string;
  stream: (
    context: StreamContext<Params, Query, Auth>,
  ) => AsyncIterable<StreamEvent>;
}

type RawStreamContext = Pick<
  Context,
  "request" | "headers" | "cookie" | "set" | "server"
> & {
  params: unknown;
  query: unknown;
};

type StreamHook<
  Params extends TSchema | undefined,
  Query extends TSchema | undefined,
  Auth extends boolean,
> = {
  detail: RouteDetail & {
    responses: {
      200: {
        description: string;
        content: { "text/event-stream": { schema: { type: "string" } } };
      };
    };
  };
  rateLimit?: RouteRateLimitHook[];
} & (Auth extends true ? { auth: true } : object) &
  (Params extends TSchema ? { params: Params } : object) &
  (Query extends TSchema ? { query: Query } : object);

type StreamTuple<
  Params extends TSchema | undefined,
  Query extends TSchema | undefined,
  Auth extends boolean,
> = readonly [
  (context: RawStreamContext) => AsyncGenerator,
  StreamHook<Params, Query, Auth>,
];

async function* withHeartbeat<T>(
  source: AsyncIterable<T>,
  intervalMs: number,
): AsyncGenerator<T | typeof HEARTBEAT> {
  const iterator = source[Symbol.asyncIterator]();
  let pending = iterator.next();
  let finished = false;

  try {
    while (true) {
      let timer: ReturnType<typeof setTimeout> | undefined;

      const tick = new Promise<typeof HEARTBEAT>((resolve) => {
        timer = setTimeout(() => resolve(HEARTBEAT), intervalMs);
      });

      const result = await Promise.race([pending, tick]);

      clearTimeout(timer);

      if (result === HEARTBEAT) {
        yield HEARTBEAT;
        continue;
      }

      if (result.done) {
        finished = true;

        return;
      }

      yield result.value;
      pending = iterator.next();
    }
  } finally {
    if (!finished) void iterator.return?.();
  }
}

const serialize = ({ id, event, data }: StreamEvent) =>
  sse({
    ...(id !== undefined ? { id: String(id) } : {}),
    ...(event !== undefined ? { event } : {}),
    data: JSON.stringify(data),
  });

export function defineStreamRoute<
  const Params extends TSchema | undefined = undefined,
  const Query extends TSchema | undefined = undefined,
  const Auth extends boolean = false,
>(
  definition: StreamRouteDefinition<Params, Query, Auth>,
): StreamTuple<Params, Query, Auth> {
  const {
    params,
    query,
    auth,
    rateLimit,
    guards,
    heartbeatMs = DEFAULT_HEARTBEAT_MS,
    summary,
    description,
    stream,
  } = definition;

  const handler = async function* (raw: RawStreamContext) {
    const context = {
      ...raw,
      lastEventId: raw.request.headers.get("last-event-id"),
      signal: raw.request.signal,
    } as unknown as StreamContext<Params, Query, Auth>;

    for (const guard of guards ?? []) {
      await guard(context);
    }

    raw.server?.timeout(raw.request, 0);

    let started = false;

    try {
      for await (const item of withHeartbeat(stream(context), heartbeatMs)) {
        started = true;

        yield item === HEARTBEAT
          ? sse({ event: "heartbeat", data: "" })
          : serialize(item);
      }
    } catch (error) {
      if (!started) throw error;

      if (error instanceof AppError) return;

      getLogger().error({ err: error }, "event stream failed");
      captureException(error, {
        source: "stream",
        tags: { path: new URL(raw.request.url).pathname },
      });
    }
  };

  const hook = {
    ...(params ? { params } : {}),
    ...(query ? { query } : {}),
    ...(auth ? { auth: true as const } : {}),
    ...(rateLimit ? { rateLimit: [rateLimit].flat() } : {}),
    detail: {
      ...(summary ? { summary } : {}),
      ...(description ? { description } : {}),
      ...(auth ? { security: [{ sessionAuth: [] }] } : {}),
      responses: {
        200: {
          description: "A server-sent event stream",
          content: { "text/event-stream": { schema: { type: "string" } } },
        },
      },
    },
  };

  return [handler, hook] as unknown as StreamTuple<Params, Query, Auth>;
}
