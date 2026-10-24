import type { MemoryOAuthProvider } from "@/adapters/oauth/memory.oauth-provider";
import { makeService } from "@/core/registry";
import { getDatabase, purchasesSchema } from "@/db";
import type { OAuthProviderName } from "@/modules/oauth";
import { getOAuthProvider } from "@/modules/oauth";
import { UsersService } from "@/modules/users";

import {
  type ClientOptions,
  createClient,
  type TestClient,
} from "./create-client";
import { inbox } from "./inbox";

export interface UserInput {
  email?: string;
  password?: string;
  name?: string;
}

export interface TestUser extends TestClient {
  id: string;
  email: string;
  password: string;
}

let counter = 0;

const nextEmail = (): string => `user${++counter}@example.test`;

export const DEFAULT_PASSWORD = "test-password-123";

export const createGuest = (options?: ClientOptions): TestClient =>
  createClient(options);

export const createUser = async (input: UserInput = {}): Promise<TestUser> => {
  const email = input.email ?? nextEmail();
  const password = input.password ?? DEFAULT_PASSWORD;
  const client = createClient();

  const response = await client.post<{ userId: string }>("/api/auth/sign-up", {
    email,
    password,
    name: input.name ?? "Test User",
  });

  if (response.status !== 200) {
    throw new Error(
      `createUser failed: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  return Object.assign(client, {
    id: response.body.userId,
    email: email.trim().toLowerCase(),
    password,
  });
};

export const createVerifiedUser = async (
  input: UserInput = {},
): Promise<TestUser> => {
  const user = await createUser(input);

  await user.post("/api/auth/verify-email", {
    token: inbox.tokenFor(user.email),
  });

  await makeService(UsersService).invalidate(user.id);

  return user;
};

export const grantPro = async (user: TestUser): Promise<void> => {
  await getDatabase()
    .insert(purchasesSchema)
    .values({
      userId: user.id,
      provider: "stripe",
      providerCustomerId: `cus_${user.id}`,
      providerPriceId: "price_lifetime",
      providerInvoiceId: `in_${user.id}`,
      status: "paid",
      amount: 14_900,
      currency: "usd",
      paidAt: new Date(),
    });
};

export const createProUser = async (
  input: UserInput = {},
): Promise<TestUser> => {
  const user = await createVerifiedUser(input);

  await grantPro(user);

  return user;
};

export interface OAuthIdentityInput {
  sub?: string;
  email?: string;
  emailIsAuthoritative?: boolean;
  name?: string;
}

export const useOAuthIdentity = (
  provider: OAuthProviderName,
  identity: OAuthIdentityInput = {},
): { sub: string; email: string } => {
  const sub = identity.sub ?? `${provider}-sub-${++counter}`;
  const email = identity.email ?? `${provider}${counter}@example.test`;

  (getOAuthProvider(provider) as MemoryOAuthProvider).setIdentity({
    providerAccountId: sub,
    email,
    emailIsAuthoritative: identity.emailIsAuthoritative ?? true,
    name: identity.name ?? "Test User",
    avatarUrl: null,
  });

  return { sub, email };
};

export const completeOAuth = async (
  client: TestClient,
  provider: OAuthProviderName,
  start?: { path: string; method: "GET" | "POST" },
): Promise<{ status: number; location: string | null }> => {
  const started =
    start?.method === "POST"
      ? await client.post(start.path)
      : await client.get(start?.path ?? `/api/auth/oauth/${provider}`);
  const location = started.headers.get("location");

  if (!location) {
    throw new Error(`OAuth start did not redirect: ${started.status}`);
  }

  const state = new URL(location).searchParams.get("state") ?? "";
  const callback = await client.get(
    `/api/auth/oauth/${provider}/callback?code=test-code&state=${encodeURIComponent(state)}`,
  );

  return {
    status: callback.status,
    location: callback.headers.get("location"),
  };
};

export const createOAuthUser = async (
  provider: OAuthProviderName,
  identity: OAuthIdentityInput = {},
): Promise<TestUser> => {
  const { email } = useOAuthIdentity(provider, identity);
  const client = createClient();

  await completeOAuth(client, provider);

  const me = await client.get<{ id: string }>("/api/users/me");

  if (me.status !== 200) {
    throw new Error(`createOAuthUser failed: ${me.status}`);
  }

  return Object.assign(client, {
    id: me.body.id,
    email: email.trim().toLowerCase(),
    password: "",
  });
};
