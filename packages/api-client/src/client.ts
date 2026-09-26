import type { Routes } from "./generated/routes";
import { routePaths } from "./generated/routes";

export interface ApiError {
  status: number;
  message: string;
  body: unknown;
}

export type ApiResult<Response> =
  { data: Response; error: null } | { data: null; error: ApiError };

export interface RequestOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export interface ApiClientOptions {
  url: string;
  headers?: () => Record<string, string> | undefined;
  fetch?: typeof globalThis.fetch;
}

type QueryValue = string | number | boolean | null | undefined;

export type Query = Record<string, QueryValue | readonly QueryValue[]>;

interface Operation {
  response: unknown;
  body?: unknown;
  query?: unknown;
}

type OptionsArgs<Node extends Operation> = Node extends { query: infer Q }
  ? object extends Q
    ? [options?: RequestOptions & { query?: Q }]
    : [options: RequestOptions & { query: Q }]
  : [options?: RequestOptions];

type OperationFn<Node extends Operation> = Node extends { body: infer Body }
  ? (
      body: Body,
      ...options: OptionsArgs<Node>
    ) => Promise<ApiResult<Node["response"]>>
  : (...options: OptionsArgs<Node>) => Promise<ApiResult<Node["response"]>>;

type ApiBranch<Node> = { [Key in keyof Node]: ApiProxy<Node[Key]> };

export type ApiProxy<Node> = Node extends Operation
  ? OperationFn<Node>
  : Node extends (param: infer Param) => infer Next
    ? ((param: Param) => ApiProxy<Next>) & ApiBranch<Node>
    : ApiBranch<Node>;

export type ApiClient = ApiProxy<Routes>;

const HTTP_METHODS = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
]);

const readBody = async (response: Response): Promise<unknown> => {
  const type = response.headers.get("content-type") ?? "";

  if (type.includes("application/json")) {
    return response.json().catch(() => null);
  }

  return response.text().catch(() => null);
};

const errorMessage = (body: unknown, status: number): string => {
  if (typeof body === "string" && body.length > 0) return body;

  if (body !== null && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const message = record.message ?? record.error;

    if (typeof message === "string") return message;
  }

  return `Request failed with status ${status}`;
};

const resolvePath = (trail: string[], params: string[]): string => {
  const key = trail.join(".");
  const template = (routePaths as Record<string, string | undefined>)[key];

  if (template === undefined) {
    throw new Error(`Unknown API route: ${key}`);
  }

  let index = 0;

  return template.replace(/\{[^}]+\}/g, () => {
    const value = params[index++];

    if (value === undefined) {
      throw new Error(`Missing path parameter for route: ${key}`);
    }

    return encodeURIComponent(value);
  });
};

const serializeQuery = (query: Query | undefined): string => {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    for (const item of [value].flat()) {
      if (item === undefined || item === null) continue;

      search.append(key, String(item));
    }
  }

  const serialized = search.toString();

  return serialized ? `?${serialized}` : "";
};

const send = async (
  options: ApiClientOptions,
  trail: string[],
  params: string[],
  args: unknown[],
): Promise<ApiResult<unknown>> => {
  const method = trail[trail.length - 1]?.toUpperCase() ?? "GET";
  const hasBody = method !== "GET" && method !== "HEAD";
  const [first, second] = args as [unknown, RequestOptions | undefined];
  const request =
    ((hasBody ? second : first) as
      (RequestOptions & { query?: Query }) | undefined) ?? {};
  const fetcher = options.fetch ?? globalThis.fetch;

  const response = await fetcher(
    `${options.url}${resolvePath(trail, params)}${serializeQuery(request.query)}`,
    {
      method,
      credentials: "include",
      signal: request.signal,
      headers: {
        ...(hasBody ? { "content-type": "application/json" } : {}),
        ...options.headers?.(),
        ...request.headers,
      },
      ...(hasBody && first !== undefined
        ? { body: JSON.stringify(first) }
        : {}),
    },
  );

  const body = await readBody(response);

  if (!response.ok) {
    return {
      data: null,
      error: {
        status: response.status,
        message: errorMessage(body, response.status),
        body,
      },
    };
  }

  return { data: body, error: null };
};

const createNode = (
  options: ApiClientOptions,
  trail: string[],
  params: string[],
): unknown =>
  new Proxy(() => undefined, {
    get: (_target, property) => {
      if (typeof property !== "string") return undefined;

      return createNode(options, [...trail, property], params);
    },

    apply: (_target, _thisArg, args: unknown[]) => {
      const last = trail[trail.length - 1];

      if (last !== undefined && HTTP_METHODS.has(last)) {
        return send(options, trail, params, args);
      }

      const [value] = args as [string | number];

      return createNode(
        options,
        [...trail, ":param"],
        [...params, String(value)],
      );
    },
  });

export const createApiClient = (options: ApiClientOptions): ApiClient =>
  createNode(options, [], []) as ApiClient;
