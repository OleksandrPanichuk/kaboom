import type { Context, TSchema } from "elysia";

import type { AppLogger } from "@/infrastructure";

import type { AuthUser } from "./auth";

type Static<S> = S extends TSchema ? S["static"] : never;

type RawContext = Pick<
  Context,
  "request" | "headers" | "cookie" | "set" | "server"
> & {
  body: unknown;
  params: unknown;
  query: unknown;
};

type ActionContext = RawContext & { log: AppLogger };

type RouteContext<
  Body extends TSchema | undefined,
  Params extends TSchema | undefined,
  Query extends TSchema | undefined,
  Auth extends boolean = false,
> = {
  body: Static<Body>;
  params: Static<Params>;
  query: Static<Query>;
  request: Context["request"];
  headers: Context["headers"];
  cookie: Context["cookie"];
  set: Context["set"];
  server: Context["server"];
  log: AppLogger;
} & (Auth extends true ? { user: AuthUser } : object);

type PostActionContext<
  Body extends TSchema | undefined,
  Params extends TSchema | undefined,
  Query extends TSchema | undefined,
  Auth extends boolean,
  Out,
> = RouteContext<Body, Params, Query, Auth> & { output: Out };

export interface RouteCacheOptions<
  Body extends TSchema | undefined = undefined,
  Params extends TSchema | undefined = undefined,
  Query extends TSchema | undefined = undefined,
  Auth extends boolean = false,
> {
  ttlMs: number;
  key?: (context: RouteContext<Body, Params, Query, Auth>) => string;
}

export interface RouteCacheHook {
  ttlMs: number;
  key?: (context: RouteContext<TSchema, TSchema, TSchema>) => string;
  response: TSchema;
}

export interface RouteRateLimitOptions<
  Body extends TSchema | undefined = undefined,
  Params extends TSchema | undefined = undefined,
  Query extends TSchema | undefined = undefined,
  Auth extends boolean = false,
> {
  limit: number;
  windowMs: number;
  scope?: string;
  key?: (context: RouteContext<Body, Params, Query, Auth>) => string;
}

export interface RouteRateLimitHook {
  limit: number;
  windowMs: number;
  scope?: string;
  key?: (context: RouteContext<TSchema, TSchema, TSchema>) => string;
}

export type RouteGuard<
  Body extends TSchema | undefined = undefined,
  Params extends TSchema | undefined = undefined,
  Query extends TSchema | undefined = undefined,
  Auth extends boolean = false,
> = (context: RouteContext<Body, Params, Query, Auth>) => void | Promise<void>;

interface RouteBaseFields<
  Body extends TSchema | undefined,
  Params extends TSchema | undefined,
  Query extends TSchema | undefined,
  Response extends TSchema,
  Auth extends boolean,
> {
  response: Response;
  body?: Body;
  params?: Params;
  query?: Query;
  auth?: Auth;
  parse?: "text";
  verifiedEmail?: boolean;
  rateLimit?:
    | RouteRateLimitOptions<Body, Params, Query, Auth>
    | Array<RouteRateLimitOptions<Body, Params, Query, Auth>>;
  summary?: string;
  description?: string;
}

type RouteCacheOrGuards<
  Body extends TSchema | undefined,
  Params extends TSchema | undefined,
  Query extends TSchema | undefined,
  Auth extends boolean,
> =
  | {
      cache?: RouteCacheOptions<Body, Params, Query, Auth>;
      guards?: undefined;
    }
  | {
      cache?: undefined;
      guards?: Array<RouteGuard<Body, Params, Query, Auth>>;
    };

type RouteBase<
  Body extends TSchema | undefined,
  Params extends TSchema | undefined,
  Query extends TSchema | undefined,
  Response extends TSchema,
  Auth extends boolean,
> = RouteBaseFields<Body, Params, Query, Response, Auth> &
  RouteCacheOrGuards<Body, Params, Query, Auth>;

export interface RouteDetail {
  summary?: string;
  description?: string;
  security?: Array<{ sessionAuth: string[] }>;
}

type RouteHook<
  Body extends TSchema | undefined,
  Params extends TSchema | undefined,
  Query extends TSchema | undefined,
  Response extends TSchema,
  Auth extends boolean,
> = {
  response: Response;
  detail: RouteDetail;
  parse?: "text";
  cache?: RouteCacheHook;
  rateLimit?: RouteRateLimitHook[];
  verifiedEmail?: true;
} & (Auth extends true ? { auth: true } : object) &
  (Body extends TSchema ? { body: Body } : object) &
  (Params extends TSchema ? { params: Params } : object) &
  (Query extends TSchema ? { query: Query } : object);

type RouteTuple<
  Body extends TSchema | undefined,
  Params extends TSchema | undefined,
  Query extends TSchema | undefined,
  Response extends TSchema,
  Auth extends boolean,
> = readonly [
  (context: RawContext) => Promise<Static<Response>>,
  RouteHook<Body, Params, Query, Response, Auth>,
];

export function defineRoute<
  const Body extends TSchema | undefined = undefined,
  const Params extends TSchema | undefined = undefined,
  const Query extends TSchema | undefined = undefined,
  const Response extends TSchema = TSchema,
  const Auth extends boolean = false,
  Out = unknown,
>(
  definition: RouteBase<Body, Params, Query, Response, Auth> & {
    action: (
      context: RouteContext<Body, Params, Query, Auth>,
    ) => Out | Promise<Out>;
    postAction: (
      context: PostActionContext<Body, Params, Query, Auth, Awaited<Out>>,
    ) => Static<Response> | Promise<Static<Response>>;
  },
): RouteTuple<Body, Params, Query, Response, Auth>;

export function defineRoute<
  const Body extends TSchema | undefined = undefined,
  const Params extends TSchema | undefined = undefined,
  const Query extends TSchema | undefined = undefined,
  const Response extends TSchema = TSchema,
  const Auth extends boolean = false,
>(
  definition: RouteBase<Body, Params, Query, Response, Auth> & {
    action: (
      context: RouteContext<Body, Params, Query, Auth>,
    ) => Static<Response> | Promise<Static<Response>>;
    postAction?: undefined;
  },
): RouteTuple<Body, Params, Query, Response, Auth>;

export function defineRoute(
  definition: RouteBase<TSchema, TSchema, TSchema, TSchema, boolean> & {
    action: (context: RouteContext<TSchema, TSchema, TSchema>) => unknown;
    postAction?: (
      context: RouteContext<TSchema, TSchema, TSchema> & { output: never },
    ) => unknown;
  },
): RouteTuple<TSchema, TSchema, TSchema, TSchema, boolean> {
  const {
    response,
    action,
    postAction,
    body,
    params,
    query,
    auth,
    parse,
    verifiedEmail,
    cache,
    rateLimit,
    guards,
    summary,
    description,
  } = definition;

  if (cache && guards) {
    throw new TypeError(
      "A route cannot combine cache with guards: a cache hit answers before the guards run",
    );
  }

  const handler = async (context: RawContext): Promise<Static<TSchema>> => {
    for (const guard of guards ?? []) {
      await guard(context as ActionContext);
    }

    const output = await action(context as ActionContext);

    return postAction
      ? await postAction({
          ...(context as ActionContext),
          output: output as never,
        })
      : output;
  };

  const hook = {
    ...(body ? { body } : {}),
    ...(params ? { params } : {}),
    ...(query ? { query } : {}),
    ...(auth ? { auth: true as const } : {}),
    ...(parse ? { parse } : {}),
    ...(verifiedEmail ? { verifiedEmail: true as const } : {}),
    ...(cache
      ? {
          cache: {
            ttlMs: cache.ttlMs,
            key: cache.key,
            response,
          },
        }
      : {}),
    ...(rateLimit ? { rateLimit: [rateLimit].flat() } : {}),
    response,
    detail: {
      ...(summary ? { summary } : {}),
      ...(description ? { description } : {}),
      ...(auth ? { security: [{ sessionAuth: [] }] } : {}),
    },
  };

  return [handler, hook] as RouteTuple<
    TSchema,
    TSchema,
    TSchema,
    TSchema,
    boolean
  >;
}
