import { type ApiResult, createApiClient } from "@repo/api-client";

export const api = createApiClient({ url: "" });

export class ApiRequestError extends Error {
  public override readonly name = "ApiRequestError";

  constructor(
    public readonly status: number,
    public readonly code: string | null,
    message: string,
  ) {
    super(message);
  }
}

const codeOf = (body: unknown): string | null => {
  const code = (body as { code?: unknown } | null)?.code;

  return typeof code === "string" ? code : null;
};

export const unwrap = <Data>(result: ApiResult<Data>): Data => {
  if (result.error) {
    throw new ApiRequestError(
      result.error.status,
      codeOf(result.error.body),
      result.error.message,
    );
  }

  return result.data;
};
