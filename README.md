# api

A [Turborepo](https://turborepo.dev/) monorepo containing an
[Elysia](https://elysiajs.com/) API running on [Bun](https://bun.sh/), backed by
PostgreSQL via [Drizzle ORM](https://orm.drizzle.team/), with a typed client
generated from the API's own routes.

## What's inside

### Apps

+ `apps/api` — the Elysia HTTP API

### Packages

+ `@repo/api-client` — typed HTTP client, generated from the API
+ `@repo/eslint-config` — shared ESLint config (type-aware, Prettier-integrated)
+ `@repo/typescript-config` — shared `tsconfig.json` bases

### CLI tools

+ `@repo/api-codegen` — generates `@repo/api-client` from the API's routes and
  its `.model.ts` / `.dto.ts` exports

Everything is written in [TypeScript](https://www.typescriptlang.org/).

## Getting started

### Naming the app

The repository carries no product name. Two environment variables supply it:

| Variable | Default | Used for |
| --- | --- | --- |
| `APP_NAME` | `App` | email subjects, the wordmark and footer, the default `MAIL_FROM_NAME` |
| `APP_SLUG` | `app` | cookie names (`<slug>-session`, `<slug>-oauth-tx`) and every Redis key prefix (`<slug>:sessions:`, `<slug>:cache:`, `<slug>:jobs`, `<slug>:rate-limit`) |

`APP_SLUG` must be lowercase letters, digits and single hyphens. Set both in
`apps/api/.env` for the API. `docker compose` does not read that file: it takes
them from the shell or from a `.env` at the repository root, and uses the slug
as the project name of both compose files and as the storage bucket name.

Two names cannot be interpolated and are written out by hand: the test database
in `DATABASE_URL` of `apps/api/.env.test` (`kaboom_test`), and `TEST_S3_BUCKET` in
the `Makefile`. Neither is visible outside the test stack.

Install dependencies:

```sh
bun install
```

Start the whole stack in Docker, with hot reload:

```sh
make up
```

| Service | URL | Notes |
| --- | --- | --- |
| API | <http://localhost:8080> | routes are served under `/api` |
| OpenAPI | <http://localhost:8080/api/openapi> | generated from the route definitions |
| Mailpit | <http://localhost:8025> | catches every outbound email in development |
| Storage | <http://localhost:9001/rustfs/console/> | RustFS, S3-compatible; `storageadmin` / `storageadmin` |
| Postgres | `localhost:5432` | `postgres` / `postgres` |

Redis runs three times, one instance per concern: sessions (6380), jobs (6379)
and cache (6381). They are separate so a flushed cache cannot sign everyone out.
All three start with `make up`, because outside `NODE_ENV=test` the API requires
every one of them and exits at startup if any is missing.

### Optional services

Two services are behind [compose
profiles](https://docs.docker.com/compose/how-tos/profiles/) and stay off by
default. Nothing depends on them, so they are pure opt-in:

| Service | URL | Notes |
| --- | --- | --- |
| `bull_board` | <http://localhost:3001> | background job queues |
| `drizzle_studio` | <https://local.drizzle.studio?host=localhost&port=4983> | browse the database |

```sh
make add s=bull_board       # start one alongside whatever is already running
make drop s=drizzle_studio  # stop and remove one
make services               # list what is running
make run-all                # everything, optional services included
```

`make add` is additive: it reads the running containers and preserves them, so
adding a second optional service does not stop the first.

Drizzle Studio serves a gateway rather than a web page, so port 4983 returns
`404` in a browser — open the `local.drizzle.studio` link above, which connects
back to it. `make db-studio` runs the same thing on the host instead.

## Running locally without Docker

The API needs Postgres, Redis and SMTP. Start the backing services in Docker and
run the API itself on the host:

```sh
docker compose up -d --wait db sessions queue_redis cache mailpit
bun run dev
```

## The generated API client

`packages/api-client/src/generated` is **not committed**. It is produced by
`bun run generate` from the API's route definitions and its `.model.ts` /
`.dto.ts` exports, takes about a second, and needs no database — the codegen
boots the app under `NODE_ENV=test`, where every port resolves to an in-memory
adapter.

You should never need to run it by hand. `generate` is a `dependsOn` of `build`,
`check-types`, `dev`, `lint` and `test` in `turbo.json`, so the client is always
regenerated before anything reads it. A stale client cannot exist, and no pull
request carries a generated diff.

Consume it from another workspace package:

```ts
import { createApiClient } from "@repo/api-client";

const api = createApiClient({ url: "http://localhost:8080" });

const { data, error } = await api.api.auth.signIn.post({
  email: "user@example.com",
  password: "hunter2",
});

if (error) throw new Error(error.message);

console.log(data.userId, data.expiresAt);
```

Route segments are camelCased from the URL (`/api/auth/sign-in` becomes
`api.auth.signIn`), so `url` is the server's origin without the `/api` prefix.
Path parameters are call arguments: `api.api.auth.oauth("google").get()`.
Query parameters go in the options, typed from the route's `query` schema, and
are required there when the route requires one:

```ts
const page = await api.api.problems.get({ query: { limit: 20 } });
const next = await api.api.problems.get({
  query: { limit: 20, cursor: page.data!.nextCursor! },
});
```

`@repo/api-client/server` exposes `createServerApiClient`, which forwards a
cookie header instead of relying on the browser's cookie jar.

## Generating code

`bun run gen` scaffolds code that follows the conventions in `CLAUDE.md`, then
runs `eslint --fix` on everything it touched.

```sh
bun run gen module billing                  # empty module, registered in app.modules.ts
bun run gen resource invoices               # full CRUD module, see below
bun run gen service billing pricing         # services, use cases and jobs go
bun run gen use-case billing charge-card    # into an existing module and are
bun run gen job billing send-receipt        # exported from its barrel
bun run gen plugin audit-trail              # src/plugins, exported from the index
bun run gen resource invoices --dry-run     # print the plan, write nothing
```

`make gen` takes the same words. Flags go in `ARGS`, because `make` reads
anything starting with `--` as its own option:

```sh
make gen resource invoices
make gen resource invoices ARGS="--db mongo --dry-run"
```

A **resource** is a module with an entity, a model, create and update DTOs, a
repository port and its adapter, a service, four use cases (create, get,
update, delete), their routes, and the module definition, registered before
`jobsModule`. Every route needs a session and every query is scoped to the
signed-in user through an `ownerId` column, so one user never sees another's
records. There is no list endpoint yet: it waits for a shared pagination
primitive, so that every resource lists the same way. Pass the plural; the singular is guessed, and `--singular` overrides
it (`gen resource people --singular person`).

The repository adapter follows `DATABASE_ADAPTER` in the root `.env` (see
`.env.example`), `--db` overrides it, and it defaults to `postgres`. For
postgres the resource also gets a Drizzle schema exported from
`src/db/schema`, a migration generated with drizzle-kit (`--no-migration`
skips it) and an HTTP test in `apps/api/tests`. For any other value the
repository is a stub whose methods reject until implemented, and no schema,
migration or test is generated.

Pieces that need wiring by hand are printed as notes: registering a generated
job with `registerJob`, and mounting a generated plugin.

## Database

Migrations live in `apps/api/drizzle` and are managed by Drizzle Kit.

```sh
make db-generate   # generate a migration after changing src/db/schema
make db-migrate    # apply pending migrations
make db-studio     # browse the data
```

Open a psql shell against the running container:

```sh
make db-development
```

## Common tasks

```sh
bun run dev           # run the API in watch mode
bun run build         # build all packages
bun run lint          # eslint, zero warnings allowed
bun run check-types   # tsc --noEmit
bun run test          # bun test
bun run generate      # regenerate the API client
bun run format        # prettier --write
```

`make check` runs lint, types and tests the way CI does. `make services` lists
the running containers; see [optional services](#optional-services) for
`make add` and `make run-all`.

## Tests

```bash
make test              # the suite, against its own Postgres
make test-integration  # also exercises the real Redis, BullMQ and SMTP adapters
make test-down         # remove the containers
```

`make test` starts `docker-compose.test.yml`, which is separate from the
development stack: different containers, different ports, no volumes. A run
cannot reach development data, and nothing it writes survives. `bun test` sets `NODE_ENV=test`,
which makes Bun load `apps/api/.env.test` and every port resolve to its
in-memory adapter, so Redis, SMTP and the OAuth providers are all doubles. The
first run creates the `kaboom_test` database and migrates it, and each test starts
against empty tables.

`make test-integration` additionally starts Redis and a mail server and runs
the suites in `apps/api/tests/integration`, which drive `RedisSessionStore`,
`RedisCache`, `NazliRateLimitStore`, `BullMqJobQueue` and `SmtpMailer` against
the real thing. They cover what a memory adapter cannot: key layout, TTLs,
BullMQ's scheduler, and what each adapter does when its server disappears.
Without those services they skip rather than fail, so `make test` stays fast.

Unit tests sit next to what they cover, as `*.test.ts`. Tests that go through
HTTP live in `apps/api/tests/`, grouped by area, and use the helpers in
`apps/api/tests/helpers`:

```ts
import { createUser, inbox } from "@tests/helpers";

const user = await createUser({ email: "kate@example.test" });

await user.post("/api/auth/verify-email", {
  token: inbox.tokenFor("kate@example.test"),
});
```

`createUser`, `createVerifiedUser` and `createOAuthUser` return a client that
already carries that user's session, so requests made through it are
authenticated. `createGuest` is the same client with no session. `inbox` reads
what the mailer captured, which is how a test gets at a token that only exists
inside an email. `useOAuthIdentity` decides what the provider double will return
before a flow runs.

## Configuration

Environment variables are validated by a zod schema at startup
(`apps/api/src/configs/env.config.ts`); the process exits with a readable report
if any are missing or malformed. `docker compose` already sets everything needed
for local development.

`DATABASE_URL` is always required. `SESSIONS_REDIS_URL`, `JOBS_REDIS_URL`,
`CACHE_REDIS_URL` and `SMTP_URL` are required unless `NODE_ENV=test`, where
each port falls back to an in-memory adapter so the whole app boots in-process
with no external services.

`RATE_LIMIT_REDIS_URL` and `REALTIME_REDIS_URL` are optional and only move a
concern to another server: rate-limit counters default to the sessions Redis,
which neither evicts nor loses them on a cache flush, and realtime pub/sub
defaults to the cache Redis, since it stores nothing.

Behind a proxy, set `TRUSTED_PROXY_HEADER` to the header that proxy sets and
`TRUSTED_PROXY_DEPTH` to how many proxies stand between the client and the API.
Until you do, the client address comes from the socket and forwarded headers are
ignored, because anyone can send them: rate limits keyed by address would
otherwise be defeated by varying the header, and session device information
would record whatever the caller claimed.

Request and job metrics go to CloudWatch when `CLOUDWATCH_METRICS_NAMESPACE`
is set. The API aggregates them in memory and sends one `PutMetricData` call
per flush, every `CLOUDWATCH_METRICS_FLUSH_SECONDS` (default 60), and once
more on shutdown. Requests record `RequestCount` and `RequestDuration` by
method, route template and status class; jobs record `JobCount` and
`JobDuration` by job, queue and outcome (`done`, `retried`, `failed`). Every
metric also carries `Environment`. Routes are recorded as templates such as
`/api/sessions/:id`, so ids never become separate metrics, and every unknown
path is grouped as `unmatched`.

On ECS the SDK takes its credentials and region from the task role and the
task's `AWS_REGION`; the task role needs `cloudwatch:PutMetricData`. A send
that fails is logged with the number of datapoints dropped and never fails a
request. Without a namespace, nothing is recorded.

Unexpected errors are reported to Sentry when `SENTRY_DSN` is set: a 500 from
any route, a background job whose last attempt failed, and a failed OAuth
callback. Each report carries the request id, the signed-in user's id when
there is one, and the route or job name. No request data, headers, cookies or
bodies are sent. Without a DSN errors are only logged. `SENTRY_ENVIRONMENT`
defaults to `NODE_ENV`; set `SENTRY_RELEASE` to the deployed version to tie
errors to a release.

Sign-up, sign-in and the two token emails are protected by reCAPTCHA: v3
(invisible, scored) first, falling back to the v2 checkbox when the score is
low. Set `RECAPTCHA_V3_SECRET` and `RECAPTCHA_V2_SECRET` from two separate
registrations in the reCAPTCHA admin console; `CAPTCHA_SCORE_THRESHOLD`
defaults to 0.5. Both secrets are required in production. Without them in
development every captcha passes and the API logs one warning at start, so a
local frontend needs no keys.

The frontend sends the token in `x-captcha-token` and says which kind it is in
`x-captcha-kind` (`score` for v3, `challenge` for v2). A refused request
answers 403 with one of `CAPTCHA_REQUIRED`, `CAPTCHA_CHALLENGE_REQUIRED` (show
the v2 checkbox and resubmit) or `CAPTCHA_FAILED` (fetch a fresh token), or 503
`CAPTCHA_UNAVAILABLE`. Tokens are single-use, so fetch a new one after every
error. Sign-in only asks for a captcha once the address has used five
attempts in its rate-limit window, successful ones included. Every request
counts against the rate limits, captcha refusals too, so a person sent from
v3 to the v2 checkbox spends two attempts. If the rate-limit store cannot be
read, sign-in asks for a captcha from the first attempt rather than risk
none.

OAuth is optional: set `OAUTH_STATE_SECRET` (32+ characters),
`OAUTH_REDIRECT_BASE`, and the client ID and secret for each provider you want
(`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID` /
`GITHUB_CLIENT_SECRET`).

## Code style

Formatting is enforced by Prettier *through* ESLint (`prettier/prettier`), so
`eslint --fix` and format-on-save both repair it. Line width is 80 characters.

The shared config enables type-aware linting and requires explicit
`public` / `private` / `protected` modifiers on all class members. VS Code
settings in `.vscode/` wire format-on-save to the ESLint extension.

## Architecture

`CLAUDE.md` documents the conventions this codebase is built on: the use case
contract, the `modules` / `adapters` / `infrastructure` layering rule, the module
lifecycle hooks, background jobs, and the two caching layers. Read it before
adding a module.
