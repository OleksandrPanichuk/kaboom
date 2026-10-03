# CLAUDE.md

Turborepo monorepo. The API lives in `apps/api` (Bun + Elysia + Drizzle/Postgres).
The web app lives in `apps/web`, and its conventions are in
[`apps/web/CLAUDE.md`](apps/web/CLAUDE.md).

## Use cases

Every use case declares its own input type **in its own file**. Do not reuse an
HTTP DTO or a persistence type as a use case's input — a use case may need
inputs that no single repository method accepts, and those three contracts drift
apart over time.

The convention, in this order:

```ts
export interface CreateUserUseCaseOptions {
  name: string;
}

type Options = CreateUserUseCaseOptions;
type Result = UserEntity;

export class CreateUserUseCase extends UseCase<Options, Result> {
  public async execute({ name }: Options): Promise<Result> { ... }
}
```

- The exported name is `<UseCaseName>Options` (e.g. `CreateUserUseCaseOptions`),
  so it stays unambiguous when imported elsewhere.
- Local `Options` / `Result` aliases keep the class signature and `execute`
  readable, and give one place to change either side.
- When a use case takes no input, use `type Options = void` and skip the
  exported interface until real options exist.
- Export the options type from `use-cases/index.ts` alongside the class.

## Type vocabulary

Each layer owns its own shape; the route maps between them:

```
CreateUserInput  ->  <UseCase>Options  ->  CreateUserData  ->  UserEntity  ->  UserModel
   (HTTP in)          (use case)          (persistence)       (domain)       (HTTP out)
```

Keep them distinct even when identical — an HTTP-only field (a captcha token,
say) must not be able to reach the database layer.

## Layering: modules, platform, adapters, infrastructure

Where a file lives is decided by what it imports and by whether it has a domain.

```
modules/<name>/          product features: entities, use cases, routes, DB repositories, their ports
platform/<capability>/   app capabilities with no domain: a port, a lifecycle, optionally an Elysia macro
adapters/<capability>/   implementations of module or platform ports over an external technology
infrastructure/<tech>/   technology clients: connect, reconnect, ping, close
```

- **`platform/`** holds what the app offers to modules rather than to users:
  `cache`, `jobs`, `rate-limit`, `health`, `captcha`, `error-reporting`, `metrics`,
  `realtime`, `llm`. The test is "does it have a domain?" —
  an entity, a repository, a use case or a route about the product belongs in
  `modules/`; a port plus a `defineModule` lifecycle that any module may consume
  belongs in `platform/`. Both go through `defineModule`, so a platform folder
  still opens, verifies and closes its own connections. `platform/` imports from
  `core`, `shared`, `configs`, and — only inside its module definition file — from
  `adapters/` and `infrastructure/`. It never imports from `modules/`.

- **`infrastructure/`** knows nothing about the domain. A file here imports only
  `configs` and `shared`, and could be copied into an unrelated project
  unchanged. Redis client, S3 client, Kafka connection, logger.

  A Redis connection is taken one of two ways, and the name says who closes it.
  `getSharedRedisConnection` pools by url, so two modules pointed at one server
  use one socket; nothing that receives one may close it, and
  `closeInfrastructure` releases them all after every module has stopped.
  `createOwnedRedisConnection` hands back a connection the caller closes itself.
  Jobs takes that second path deliberately: BullMQ needs blocking connections
  with `maxRetriesPerRequest: null`, which is incompatible with the options a
  plain command client wants, so its connection cannot be shared.
- **`adapters/`** implement a port a module declares, using an infrastructure
  client. This is the only layer that imports from both `modules/` and
  `infrastructure/`. `RedisSessionStore` extends `SessionStore` and uses a
  `RedisConnection`.
- **`modules/`** declare ports named for the capability, not the vendor:
  `FileStorage`, `JobQueue`, `EventPublisher`, never `S3Storage`. Several
  adapters may satisfy one port. Modules import from `core`, `shared`,
  `configs`, and other modules' barrels. Never from `adapters/` or
  `infrastructure/`, except inside the module definition file, which is the
  composition root: it binds the port to an adapter and opens and closes the
  module's connections.

Adapters are grouped by **capability, not by technology** — the folder is named
after the port's owning module, and the file after the technology:

```
adapters/mail/       smtp.mailer.ts        log.mailer.ts
adapters/sessions/   redis.session-store.ts
adapters/jobs/       bullmq.job-queue.ts   memory.job-queue.ts
adapters/cache/      redis.cache.ts        memory.cache.ts
adapters/storage/    s3.storage.ts         memory.storage.ts
```

An adapter that outgrows one file gets a folder named after the technology,
with the class alone in `<tech>.<port>.ts` and its pieces beside it:
`<tech>.typedefs.ts`, `<tech>.helpers.ts`, `<tech>.constants.ts`, and an
`index.ts` the module definition imports. Constants that only the adapter
needs, such as a vendor's request limits, live there and not in the platform
folder:

```
adapters/metrics/    cloudwatch/    memory.metrics.ts    noop.metrics.ts
```

Siblings in one folder are the alternatives you pick between in `register()`,
which is the question you actually ask when reading them. Grouping by
technology breaks down immediately: `memory.*` and `log.*` adapters use no
external technology at all, and one adapter may use two.

**Database repositories are the one exception.** A Drizzle repository stays
inside its module under `repositories/`, because it is bound to that module's
schema and Postgres is the system of record, not a swappable backend.
Everything else that implements a port over an external system is an adapter.

Every port is an abstract class that extends `Port` from `@/core/port`;
`Repository` does too, so every repository port is one. `make()` refuses a
port that has no binding and throws naming it, rather than building an empty
object whose methods fail later. Bind each port in its module's `register()`,
and register the modules before anything resolves a port: `createApp` and
`createOpenApiApp` both do. Plain classes such as services and use cases need
no binding and are built on first use.

Ports live in `modules/<name>/ports/` once a module has more than one.
An adapter imports the port file directly (`@/modules/x/ports/y`), never the
module barrel: the barrel exports the module definition, which imports the
adapter, and going through it forms an import cycle that fails at runtime.

An adapter may depend on other ports instead of an external SDK. A router that
picks between transports is still an adapter, because it implements a port the
module declares.

Inbound message handlers follow the HTTP split: the transport loop
(subscribe, ack, retry) is the adapter; the handler that calls a use case
lives in the module, next to its routes, started and stopped through the
module's `start` and `shutdown` hooks.

## Module lifecycle

`defineModule` gives every module four lifecycle hooks plus two mount points,
`plugins` and `routes`. `register` is **synchronous** and returns the module's
state; the other three lifecycle hooks receive it as `{ state }`.

```ts
export const cacheModule = defineModule({
  name: "cache",

  register: ({ env }) => {
    if (env.NODE_ENV === NodeEnv.Test) {
      const cache = new MemoryCache();
      bind(Cache, () => cache);

      return { cache, connection: undefined };
    }

    const connection = new RedisConnection({
      name: "cache",
      url: env.CACHE_REDIS_URL,
      options: { connectTimeout: 2 * SECOND, enableOfflineQueue: false },
    });
    const cache = new RedisCache(connection);

    bind(Cache, () => cache);

    return { cache, connection };
  },

  plugins: () => cachePlugin,

  start: ({ state }) => state.cache.verify(),
  ready: ({ state }) => state.connection?.ping() ?? true,
  shutdown: ({ state }) => state.cache.close(),
});
```

- **`plugins`** — the module's Elysia macros (`auth`, `cache`, `rateLimit`,
  `verifiedEmail`), mounted by `createApp` before any route. A macro's hooks run
  in the order of the keys `defineRoute` puts on the route, not in module order,
  so module order is free to follow start-up dependencies alone.
- **`guards`** on `defineRoute` run inside the handler, after every macro and
  before `action`, so a request the rate limiter refuses never reaches them,
  and on an `auth` route they see `user`. Reach for a guard for a per-route
  check such as `requireCaptcha("sign_up")`; a guard throws to refuse, and its
  return value is ignored. A route cannot have both `guards` and `cache`: a
  cache hit answers from a macro, before the handler, and would skip the
  guards. The types refuse the combination and `defineRoute` throws on it.
- **`register`** — declare intent, never do I/O. Construct adapters and
  connections, `bind` ports, `registerJob`, and return state. It must be
  synchronous (the type system enforces this), so anything that awaits belongs
  in `start`. It runs for every module before any `start`, so cross-module
  bindings are guaranteed to exist by then.
- **`start`** — open connections, verify them, begin consuming.
- **`ready`** — the readiness probe behind `/health`. Registered and removed
  automatically with the module.
- **`shutdown`** — close what `start` opened. Modules shut down in **reverse**
  order, so a module may rely on modules listed before it still being alive.

Every port that talks to an external system gets a `Memory*` / `Log*` adapter
bound under `NODE_ENV=test`, so the whole app boots in-process with no Redis,
SMTP or network. Choose the adapter in `register` — never branch on the
environment inside the adapter itself.

**Order in `app.modules.ts` is load-bearing.** A module must come after the
modules it depends on at `start`, and `jobsModule` stays **last**: it begins
consuming after every producer's dependencies are up, and reverse-order
shutdown stops it consuming before anything it calls is torn down.

## Background jobs

A job is a singleton class — definition and handler in one unit, resolved
through `make()` like a use case. The payload is an argument, never a
constructor parameter: only JSON crosses Redis, so the instance cannot travel.

```ts
export class SendEmailJob extends Job<SendEmailPayload> {
  public readonly name = NotificationQueueJobs.SendEmail;
  public readonly queue = NOTIFICATIONS_QUEUE;
  public readonly schema = SendEmailPayloadSchema;

  private readonly mailer = make(Mailer);

  public async handle(payload: SendEmailPayload): Promise<void> { ... }
}
```

The owning module calls `registerJob(SendEmailJob)` in its `register`;
`jobsModule.start` resolves and starts every registered job after verifying the
connection. A producer module never creates or closes a worker.

Dispatch through the job, not the queue: `make(SendEmailJob).dispatch(payload)`.
The zod `schema` is validated when the job is **consumed**, not when it is
dispatched — a malformed payload fails the job without burning retries.

A job that runs on a clock declares its own `schedule` rather than being
enqueued by anyone:

```ts
export class PurgeSpentTokensJob extends Job<PurgeSpentTokensPayload> {
  public readonly schedule: JobSchedule<PurgeSpentTokensPayload> = {
    pattern: PURGE_SPENT_TOKENS_PATTERN,
    payload: {},
  };
}
```

`JobSchedule` is generic over the job's payload, so the declared payload is
checked against the same `schema` the handler receives. `jobsModule.start`
upserts the schedule next to registering the handler, keyed by the job name, so
booting twice leaves one schedule rather than two. Schedules do not fire under
`NODE_ENV=test` — `MemoryJobQueue` accepts them and does nothing, so a test run
never waits on a clock.

## Reporting errors

Anything that extends `Injectable` (services, use cases, jobs) reports an
unexpected error with `this.captureException(error, { tags, extra })`. The source
defaults to the class name and the request id is taken from the request
context, so a call site carries only what is specific to it. Code that is not
a class, such as a route or a plugin, calls `captureException(error, { source })`
from `@/core/error-reporting`.
Report what the app did not expect, not what it answers on purpose: an
`AppError` is a response, not an incident.

A job's final failure goes through `Job.failed(error, meta)`, which the queue
adapter calls once the last attempt has failed; retries are logged, not
reported. A job overrides `failed` to handle its own failure differently.

The `ErrorReporter` port lives in `core`, not in `platform/error-reporting`,
because `Injectable` is in `core` and `core` never imports `platform`. The
platform folder still owns the lifecycle and picks the adapter.

## Generating code

`cli-tools/generator` (`bun run gen`) scaffolds modules, resources, services,
use cases, jobs and plugins from templates in
`cli-tools/generator/src/templates`. Those templates are this document in code:
when a convention here changes, change the template in the same pull request,
or every generated module starts out of date. `commands.test.ts` pins the plan
each command produces; generate a resource in a throwaway worktree and run
lint, types and its tests to check a template change end to end.

## Tests

`bun test` sets `NODE_ENV=test`, so every port resolves to its memory adapter
and only Postgres is real. `tests/helpers/preload.ts` runs once per invocation:
it creates and migrates the test database, boots the app, truncates every table
after each test, and clears the mailer, the rate-limit counters and the
realtime listeners with it. A test therefore starts from empty tables and an
empty inbox without arranging anything.

Unit tests live next to what they cover; anything that goes through HTTP lives
in `tests/`, because it crosses modules and belongs to none of them. Factories
are named after the codebase's own verbs — `createUser`, `createOAuthUser` —
and return a client carrying that user's session, so a test reads as the
requests it makes rather than as setup.

`docker-compose.test.yml` holds the services the suite needs, apart from the
development stack and without volumes. `make test` starts only Postgres, since
every other port is a memory adapter. `make test-integration` adds Redis and a
mail server and unskips `tests/integration`, which drives the real adapters
directly rather than through HTTP — key layout, TTLs, BullMQ's scheduler and
the behaviour when a server disappears are invisible to a memory double. Those
suites skip when the services are absent, so the default run stays fast.

Reach for a real request over a direct call to a use case: the route, its
guards, the rate limiter and the session cookie are part of what is being
tested, and a test that skips them passes while the endpoint is broken.

## Caching

Two layers, with different invalidation stories. Pick deliberately.

- **Service cache** — `Cache` port used inside a service method. Use it for
  per-entity reads whose write sites you control. The read and the invalidation
  live in the same class, a few lines apart:
  `findById` caches, `markEmailVerified` writes then `del`s the key.
- **Route cache** — `cache: { ttlMs }` on `defineRoute`. TTL-only, with no
  event-driven invalidation, so it suits expensive or composed `GET`s that no
  single service method can cache. Do **not** put it on a route whose data is
  invalidated elsewhere: a service-level `del` does not clear route entries.

A cache is an optimization, never a dependency: `RedisCache` treats an
unavailable connection and a malformed entry as a miss and never throws.
Cached values are validated by a schema on read, because JSON round-trips turn
`Date` into `string`.

## Pagination

Lists are paginated by cursor, never by offset: a cursor is the position of the
last row a client saw, so a page stays correct while rows are inserted or
deleted before it. The pieces, one per layer:

```ts
query: PageQuery,
response: PageModel(ProblemModel),
action: ({ user, query }) =>
  listProblems.execute({ ownerId: user.id, page: toPageRequest(query) }),
postAction: ({ output }) => mapPage(output, ProblemEntity.normalize),
```

A route that filters as well spreads the page fields into its own query:
`t.Object({ ...PageQueryFields, track: t.Optional(TrackSchema) })`.
`PageModel(item)` answers `{ items, nextCursor: string | null }`.
An optional enum in a query is `t.Optional(t.Union(values.map(t.Literal)))`,
never `t.Optional(t.UnionEnum(values))`: Elysia fills a missing `UnionEnum`
query parameter with its first member, so an unfiltered list silently comes
back filtered.

```ts
const BY_CREATION = new Keyset<ProblemEntity>({
  sort: problemsSchema.createdAt,
  id: problemsSchema.id,
  key: (problem) => [problem.createdAt, problem.id],
});

const rows = await this.db
  .select()
  .from(problemsSchema)
  .where(and(eq(problemsSchema.ownerId, ownerId), BY_CREATION.after(request.cursor)))
  .orderBy(...BY_CREATION.orderBy())
  .limit(BY_CREATION.limit(request));

return BY_CREATION.page(rows, request);
```

- `PageQuery`, `PageModel`, `PageRequest`, `Page<T>`, `toPageRequest` and
  `mapPage` live in `@/core/pagination`; `Keyset` in `@/db/pagination`.
- A use case takes a `PageRequest` inside its own options; the route converts
  the query with `toPageRequest`, which applies the default limit (20, max 100).
- `Keyset` orders by one not-null column and a unique tie-breaker, and fetches
  one row more than the page to know whether another follows. Timestamps are
  compared at millisecond precision: Postgres stores microseconds and a `Date`
  keeps milliseconds, so the raw column would skip or repeat rows inside one
  millisecond.
- The cursor is opaque base64url. A malformed one answers
  `400 INVALID_CURSOR`, never a 500.

## Live updates

A route that pushes events to the browser is a server-sent event stream,
declared with `defineStreamRoute` from `@/core/stream-route`. It takes the same
`params`, `query`, `auth`, `rateLimit` and `guards` as `defineRoute`, and a
`stream` that yields `{ id?, event?, data }`:

```ts
defineStreamRoute({
  params: RoomParams,
  auth: true,
  guards: [requireRoomMember],
  stream: async function* ({ params, query, lastEventId, signal }) {
    for await (const event of resumableStream({
      channel: `rooms:${params.id}`,
      schema: RoomEventSchema,
      after: lastEventId !== null ? Number(lastEventId) : (query.since ?? null),
      position: (event) => event.seq,
      replay: (after) => roomEvents.listAfter(params.id, after),
      signal,
    })) {
      yield { id: event.seq, event: event.type, data: event };
    }
  },
});
```

- Commands stay ordinary `defineRoute` routes; the stream only pushes. The
  generated client leaves stream routes out, because it reads whole bodies.
- An error thrown before the first event answers with its own status, like any
  route: a guard's 403, or `503 REALTIME_UNAVAILABLE` when the subscription
  cannot be made. After that, the stream can only end, and an unexpected error
  is reported through `captureException`.
- A heartbeat event goes out after `heartbeatMs` (default 15 s) of silence, so
  proxies do not close an idle connection.
- `stream` must end when `signal` aborts. `resumableStream` does; a hand-written
  one that waits on something else keeps its subscription after the client has
  gone.

`Realtime` (`platform/realtime`) is the pub/sub port: `publish(channel,
message)` and `subscribe(channel, schema, listener)`. Messages cross it as JSON
and are validated on arrival, so `MemoryRealtime` under `NODE_ENV=test` turns a
`Date` into a string exactly as `RedisRealtime` does. `publish` never throws:
live delivery is best effort, and what a client misses it gets back from
`replay`.

`resumableStream` is what makes that safe. It subscribes first and buffers,
then replays everything after the client's position from the system of record,
then drains the buffer, skipping any position it has already sent. An event
published while the replay runs therefore arrives exactly once. It also ends
the stream when a slow client lets more than `maxBuffered` events pile up, and
the client's reconnect replays from where it was. Positions must increase with
every event, which is why they come from the store (a sequence column), never
from the clock.

`RedisRealtime` publishes on the shared connection and subscribes on one owned
connection per process, multiplexing every channel over it. Channels carry the
`<slug>:realtime:` prefix, like every other Redis key.

## Language models

`LanguageModel` (`platform/llm`) streams a turn as events: `text-delta`,
`tool-use`, `usage` and one `stop`, whose reason is `end`, `tool-use`,
`max-tokens` or `aborted`. It honours the request's `signal`, and a request
names its `role` (`interviewer` or `review`) rather than a model, so the model
per role is configuration. Under `NODE_ENV=test` it is `ScriptedLanguageModel`:
a test enqueues what the next turns say, with `wait` steps for timing, and
reads the requests the model received. `preload.ts` resets it after every
test. Outside tests, with no key configured, `UnavailableLanguageModel`
refuses every request with `503 LANGUAGE_MODEL_UNAVAILABLE`, so the rest of
the app still boots.

With `ANTHROPIC_API_KEY` set, the model is `AnthropicLanguageModel`
(`adapters/llm/anthropic/`), which streams the Messages API, reassembles a
tool call's JSON from its fragments, marks cached system blocks with
`cache_control`, and turns an abort into a `stop` with reason `aborted`.
`bun run llm:smoke` in `apps/api` sends one real request and prints what
came back.

`UsageLedger` holds each user's daily token budget. `reserve` answers whether
a turn may start, and `record` adds what it used, in one atomic upsert of
`llm_usage (user_id, day)`. A cache read counts a tenth of a token.

## Interviews

Commands under `/interviews/:id` store what they carry and answer at once;
nothing waits for the interviewer. Every durable change goes through
`InterviewsService.commit(id, work)`, which appends its events to
`interview_events` in the same transaction, numbered by the interview's own
`event_seq`, and publishes them only after the commit. `GET
/interviews/:id/events` replays them after `Last-Event-ID` or `?since` and
merges the live channel, whose `message-delta` and `turn` events carry no
id and are lost on disconnect by design.

`TurnScheduler` owns the turns: one mailbox per interview and one turn at a
time. Triggers (`user-message`, `design-settled`, `phase-timer`) coalesce
while a turn runs, a user message supersedes a pending `design-settled`, an
unprompted interjection happens at most once a minute, and a turn starts
only if `UsageLedger.reserve` allows it. Two failed turns in a row post a
system message and stop. `preload.ts` drains the scheduler before
truncating tables, so a test never sees another test's turn.

`InterviewerRunner` runs one turn: the persona and the pinned problem as
cached system blocks, the phase, clock and design as a fresh one, then the
model's tool loop. It checks the abort signal before every tool, so an
interrupted turn applies nothing more and keeps what it said, marked as
interrupted. A tool is a file in `interviewer/tools/` defined with
`defineInterviewerTool`: a zod input, which is also the model's JSON schema,
the phases it is offered in, and a handler that goes through the module's
own use cases. An invalid input or an `AppError` comes back to the model as
a tool error rather than failing the turn.

## Reviews

Ending an interview moves it to `reviewing` and schedules a review through
the `ReviewScheduler` port. `interviews` declares the port, and `reviews`
binds it to `JobReviewScheduler`, so the dependency points one way:
`reviews` knows `interviews`, never the reverse. When the interview ends
while a turn runs, the review waits for that turn to finish. This covers the
interviewer's own `end_interview` and a candidate who submits mid-turn,
whose turn is interrupted. Otherwise the goodbye the review should read
would be committed after it. `TurnScheduler` schedules the review once
such a turn has finished.

`GenerateReviewJob` writes the review:

1. It scores the final revision with `scoreSubmission`, so every drill a
   check names runs against the design as it ended, whether or not anyone
   ran it during the interview.
2. It asks the `review` model for a 0–3 score per rubric item. Each score
   cites the record by label: `M` a message, `N` an evidence note, `D` a
   drill, `C` a check.
3. It asks once more about items it cannot accept, those citing a label
   that does not exist or scoring above 0 with no citation. What is still
   wrong after that is stored as unscored with its reason, and the rest
   is kept.
4. In one transaction it inserts the review, whose `interview_id` is
   unique, moves the interview to `reviewed` and emits the `status`
   event, then emails that the review is ready.

A second submit, a repeated job or a job retry finds the review and
returns. The last failed attempt goes through `Job.failed`, which now
receives the payload, and moves the interview to `review_failed`. `POST
/interviews/:id/review/retry` moves it back and schedules the review
again. `MemoryJobQueue` calls `failed` instead of throwing, as BullMQ
would, so a test sees what production sees.

## Skills

A skill is one of the rubric's dimensions: requirements, core design,
scaling, reliability and communication. The review's transaction writes a
`skill_scores` row per skill it touched. Each row is the weighted mean of
that skill's scored items, from 0 to 1, with the weight it rests on, and
`(interview_id, skill)` is unique, so a repeated review adds nothing. `GET
/skills/me` averages the rows by weight, recency-agnostic, and suggests the
next interview. It picks the problem tried least, then the one whose rubric
leans hardest on the weakest skill, then the easiest. `scoring_version` lets
the formula change and be recomputed; decay comes later.

## Evals

`bun run eval` in `apps/api` runs the interviewer against the real model.
It is never part of `bun test`: the files in `evals/` are named `*.eval.ts`,
cost real tokens, and skip without `ANTHROPIC_API_KEY`, which they read from
the environment or `apps/api/.env`. They reuse the test preload, so the app
and its test database boot as for any test, and only `LanguageModel` is
rebound, to `RecordingLanguageModel` over the Anthropic adapter. Each case
seeds an interview straight into a phase, a design and a conversation, then
makes one move and waits for the turn. Invariants that can be read off the
turn are checked directly: silence is no message and no visible tool. The
rest go to a judge on the `review` model, which answers through a `verdict`
tool with a reason that quotes the interviewer. `EVAL_RUNS=3` repeats every
case, since a pass once proves little about a model. When the persona or the
tools change, run it before and after.

## Generated API client

`packages/api-client/src/generated` is not committed. It is produced by
`bun run generate` from the API's route definitions and its `.model.ts` /
`.dto.ts` exports, takes about a second, and needs no database — the codegen
boots the app under `NODE_ENV=test`, where every port resolves to a memory
adapter.

`generate` is a `dependsOn` of `build`, `check-types`, `dev`, `lint` and `test`
in `turbo.json`, so the files are always regenerated before anything reads
them. There is nothing to forget and nothing to check: a stale client cannot
exist, and no pull request carries a generated diff.
