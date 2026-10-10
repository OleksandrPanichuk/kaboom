# apps/web

React 19 + Vite, TanStack Router (file routes) and TanStack Query, shadcn/ui on
Base UI with Tailwind 4, React Flow for the canvas. It talks to the API only
through `@repo/api-client` and reads the design model from `@repo/design`.

## Layout

```
src/
  routes/                 TanStack file routes, grouped by who may see them (below)
  features/<feature>/     everything one product feature owns
    ui/
      views/              one per screen a route renders
      layouts/            shells several views share
      components/         the feature's building blocks
    api/                  query options and mutations over @repo/api-client
    hooks/                hooks the feature's views and components share
    store/                zustand stores for client state the feature owns
    constants/
    utils/
    typedefs/
    index.ts              what other features and routes may import
  components/             app-wide components that belong to no feature
  components/ui/          shadcn components, added with `bun run ui:add`
  components/flow/        React Flow UI components (below)
  lib/                    the API client, the query client, cn
  styles/
```

A feature has only the folders it needs; there are no empty ones.

## Routes are grouped by who may see them

```
routes/
  __root.tsx
  _guest/                 signed-out pages
    route.tsx             beforeLoad: a signed-in visitor goes on to ?redirect or /
    sign-in.tsx, sign-up.tsx, forgot-password.tsx
  _app/                   the signed-in app
    route.tsx             beforeLoad: a guest goes to /sign-in?redirect=…
    _shell/               pages inside the sidebar
      route.tsx           renders AppShell
      index.tsx, designs/index.tsx, problems/index.tsx, settings/…
    (workspace)/          full-screen work surfaces, each view renders WorkspaceLayout
      designs/$designId.tsx, problems/$slug.tsx
  (email-links)/          pages opened from an email, signed in or not
    reset-password.tsx, verify-email.tsx, confirm-email-change.tsx
```

- A folder starting with `_` is a **pathless layout**: its `route.tsx` wraps
  every route inside it with a guard and a layout, and adds nothing to the URL.
  This is what `(group)/layout.tsx` is in Next.js.
- A folder in parentheses is a **group**: it only organises files and changes
  neither the URL nor the component tree. `(email-links)` is one on purpose,
  because a link from an email must open whether or not the reader is signed
  in.
- A guard lives once, in the layout, never repeated in the routes under it.
- A page where the user works on something (a design, a problem, an
  interview) goes under `(workspace)/` and renders `WorkspaceLayout` from
  `@/features/shell`, passing its own tool panel, tabs and top-bar actions.
  Everything else goes under `_shell/`.
- `tsr generate` rewrites the id in `createFileRoute(...)` to match the file's
  place, so moving a route is `git mv` and a regenerate.

## Routes render a view and nothing else

A route file holds the route's configuration (`loader`, `beforeLoad`, search
validation, `pendingComponent`) and one small component that reads the route's
hooks and renders the view:

```tsx
export const Route = createFileRoute("/designs/$designId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(designQuery(params.designId)),
  component: DesignRoute,
});

function DesignRoute() {
  const { designId } = Route.useParams();

  return <DesignView designId={designId} />;
}
```

- The view never imports from `routes/`. It receives everything through
  props, so it can be rendered in a test or a story without a router.
- `Route.useParams`, `Route.useSearch` and `Route.useLoaderData` are called
  in the route component only.
- A view is named after its screen with the `View` suffix: `SignInView`,
  `DesignsView`, `DesignView`.

## Components

A component lives in `ComponentName.tsx`, never in `index.tsx`.

- A component with nothing of its own beside it is a single file:
  `ui/components/NodePalette.tsx`.
- Once it has its own hooks, constants or types, it becomes a folder named
  after it, and `index.ts` only re-exports:

```
DesignCanvas/
  DesignCanvas.tsx
  DesignCanvas.hooks.ts
  DesignCanvas.constants.ts
  DesignCanvas.typedefs.ts
  index.ts              export { DesignCanvas } from "./DesignCanvas";
```

  Importers write `./DesignCanvas` either way, so turning a file into a folder
  changes no import.
- A child that only its parent uses sits inside the parent's folder:
  `DesignCanvas/CanvasNode.tsx`.
- One component per file, exported by name; no default exports, except where
  a tool requires one.

### shadcn components

`components/ui/` follows the same rule: `Button.tsx`, `Field.tsx`,
`hooks/useMobile.ts`. The shadcn CLI cannot be told how to name files, so a
component is never added with `shadcn add` directly:

```sh
bun run ui:add input label field
bun run ui:add button --overwrite
```

`ui:add` runs `shadcn add`, then renames what it wrote to the convention
(`use-*.ts` hooks to `useCamelCase.ts`), rewrites every import whose casing no
longer matches the file on disk (including the ones shadcn components make to
each other, such as `Field` importing `Label`), and runs `eslint --fix` over
`components/` and `hooks/`.

- A tracked file is renamed with `git mv`. macOS is case-insensitive and git
  runs there with `core.ignorecase`, so a plain rename from `button.tsx` to
  `Button.tsx` would leave the index on the old name and break the import on
  Linux.
- To style another element as a shadcn component, such as a link that looks
  like a button, pass the variants through `cn`:
  `className={cn(buttonVariants({ variant: "outline" }))}`. The base classes
  and a variant set the same property (`border-transparent` and
  `border-border`), and only `cn` resolves that; without it the CSS order
  decides, and the variant silently loses.
- A shadcn component is ours once added: it is linted like any other file and
  edited in place when it needs to be. Re-adding with `--overwrite` replaces
  such edits, so review the diff when updating one.

### React Flow UI components

React Flow UI ships as a shadcn registry, so its components are added with
the same script, by URL: `bun run ui:add https://ui.reactflow.dev/base-node`.
The registry writes them to `components/` rather than `components/ui/`;
move each into `components/flow/`, and drop the comments and any
`tabIndex` it sets, since React Flow's own node wrapper already takes focus.

The canvas itself lives in `features/canvas`, and is presentational: it
receives the graph and layout and reports additions and moves. Writes belong
to `features/designs`. `DesignWriter` (`designs/utils`) holds the confirmed
revision and a queue of pending op batches, shows their result at once, sends
one batch at a time on the revision before it, replays the queue on the
latest design after a 409, and drops a batch the server rejects. It also
keeps the undo history as pairs of ops and their inverse from `applyOps`, so
undo and redo are ordinary batches that go to the server like any other;
`useDesignEditor` wraps it for React and saves the layout on a debounce.

The palette groups kinds by track (`PALETTE_GROUPS`). A problem or an
interview passes its `track` to `DesignWorkspace`, which shows only that
track's groups; a sandbox design shows every track under its name.

`features/properties` draws the inspector from the catalogue alone:
`describeProps` gives each prop's metadata and `propControl` (both in
`@repo/design`) the control to draw and its bounds. Add a prop to a kind with
`.meta()` and it appears in the form; never write a form for one kind. A
prop whose metadata names an `editor` (a table's columns and indexes)
answers a `custom` control, which `PropFieldControl` leaves to the editor
of that name: `TableColumnsEditor` and `TableIndexesEditor`. Their edits
are pure functions in `properties/utils/tableEdits.ts` that return ops,
because removing a column also removes the relations that use it and takes
it out of every index, in one batch through `onApply`. A relation's
inspector shows its columns, the cardinality they make and `onDelete`, and
hides the kind, which a relation cannot change. *Copy SQL* in the top bar,
shown once a design has a table, copies `toDDL`. Edge
props carry the same metadata on `EdgePropsSchema`, so the edge inspector is
drawn the same way.
The *Technology* section picks a node's product from `technologiesFor(kind)`
and draws the product's own settings the same way. Props the product
derives (`derivedProps`) are shown read-only, with the product named, so
each value has one place to change it.
A chosen product shows its mark on the canvas, in the inspector and in the
list: the brand icon named by the technology's optional `icon`, a
`simple-icons` slug imported by name in `TECHNOLOGY_ICONS` so the rest of
the package never ships, otherwise its `monogram` in its provider's colour.
`simple-icons` carries no AWS or Microsoft marks, so those products name no
icon. An option in the product list passes its `label`, or typeahead would
read the monogram first.
What a kind is for comes from the catalogue too: every kind declares `docs`
(`summary`, `useWhen`, `pitfalls`), which the palette shows as a tooltip and
the inspector under *About*. A kind cannot be defined without it, so a new
kind needs no UI code to be explained.

`DesignWorkspace` (`features/designs`) is the editor without a screen around
it: canvas, palette, Node and Checks tabs, undo and saving. A page that edits
a design for its own purpose renders it with its own `back` link, `title`,
`leadingTabs` and top-bar `actions`, both called with the live `revision`,
`saving` and `showTab`; `simulation={false}` drops the Run tab. `DesignView`
is that component with nothing added, and `features/problems` renders it for
a started problem with Task, Tests and History tabs, and Run tests and Submit
beside undo. Submit sends the revision on screen, so the server scores the
design the solver saw and answers 409 if it has moved on.

The Tests tab renders a `TestReport`: a summary, the suites, and each test's
assertions with expected and actual values. A failed assertion of a public
load test can be shown on the canvas: `DesignWorkspaceContext.replay`
evaluates its scenario in the browser on the live graph, draws that run's
overlay with a `ReplayBar` to scrub time, and pans to the blamed nodes
without selecting them, so the Tests tab stays open. On a phone it closes
the sheet first. A second run marks what newly failed and what was fixed.

A problem is started explicitly, from a screen with a Start button: the route
only reads the attempt (`null` when there is none), because a link preloads
its loader on hover and must never create anything.
An attempt behind its problem's latest version shows that version's brief
(`pinnedVersion`) and a notice in the Task tab offering to move on, which
asks first, since it cannot be undone.

A table is drawn by `TableNodeCard` (`table-node`), one row per column with
its type and key marks, and a target and a source handle on both sides of
every row, named `<column>:<in|out>:<left|right>` (`columnHandle`). `toFlow`
joins a relation on the sides that face each other in the saved layout and
puts its derived cardinality in the edge's data, which `CanvasEdgePath`
draws as `N` or `1` at each end; a one-to-one also gets an arrow at its
start, since it reads both ways. Connecting two rows sends both handles:
`orientRelation` points the relation at whichever end is a key, so it does
not matter which way it was drawn, and a connection that names no column is
refused. Grid placement leaves room under a tall table (`nodeHeight`). A new
table starts with a `bigint` primary key `id`.

`DesignCanvas` with `readOnly` draws a graph nobody may change, such as
another solver's solution: no dragging, connecting, deleting or dropping,
and it fits the whole graph however small that makes it.

Regions, VPCs and subnets are groups in the graph, not React Flow nodes.
`GroupLayer` draws each as a box around its nodes' live positions and the
boxes of the groups inside it, within `ViewportPortal`, behind nodes and
edges (`.design-canvas .react-flow__viewport-portal` in `globals.css`), so
a group follows a drag without owning any position of its own; only its
label is clickable. A node joins or leaves one from the inspector: the
*Region* field outside DevOps problems, the *Subnet* field outside system
design ones, and both in a sandbox. A new subnet goes into the design's
VPC, which is created with the first one. `placementOps` (`designs/utils`)
keeps groups non-empty: the batch that moves or deletes a group's last
node removes the group with it, and a VPC once its last subnet goes.
Removing a group from its inspector removes the groups inside it and
keeps every node.

`features/interview` renders `DesignWorkspace` with an interview
`transport`, so edits and layout saves go through `/interviews/:id` and
reach the interviewer. `useInterviewEvents` opens one `EventSource` from
`since=0`: durable events rebuild the timeline and refetch the interview,
`message-delta` builds the reply as it streams, and `turn` shows that the
interviewer is thinking. `InterviewBridge`, mounted in the top bar so it
lives as long as the page, reports `design-settled` four seconds after the
candidate's last edit, focuses highlighted nodes and resyncs the canvas
after the interviewer's own edits. The design writer treats only
`DESIGN_REVISION_CONFLICT` as a conflict to replay; any other refusal,
such as a locked design, is an error.

`features/reviews` renders `/interviews/:id/review`, under `_shell` because
it is reading, not working. It polls the interview every three seconds
while its status is `reviewing`, fetches the review once it is
`reviewed`, and offers *Try again* on `review_failed`. An ended interview's
top bar links to it, and so does its card in the list. Home shows
`features/skills`: *Next up* from `GET /skills/me`, and one bar per skill.

`features/progress` renders `/progress`: the totals, a tile per practised
skill with a sparkline of its running weighted average after each review
(the same arithmetic as `/skills/me`, in `skillTrends`), a table view of
the same points, recent activity and the challenge table. A sparkline's
axis fits its points with a span of at least 20, since its value is
printed beside it, and it answers hover and the arrow keys.

`features/leaderboard` renders `/leaderboard`: the caller's standing with
the form to choose a handle and whether to be shown, the period and track
filters (kept in the URL as `?period=week&track=…`, the default left out),
and the table, where the caller's row is marked.

`features/simulation` runs `evaluateLoad` in the browser while the Run tab
is open, on a deferred graph so typing stays smooth, and turns a step into
the canvas overlay (`overlayAt`); the canvas only draws it. A saved run posts
the same scenario to `POST /designs/:id/simulations`, which the server
evaluates again: the preview never has to be trusted.

Checks are `defineLint` rules in `packages/design/src/lints/rules/`, one per
file, registered in `lints.ts`; `runLints(graph)` runs them all and names the
nodes and edges each hit is about. The web only renders the hits: a new rule
needs no UI code. A rule's message uses the nodes' labels, never their ids. The
query cache only ever receives confirmed revisions.
 `toFlow` is the one place a
`DesignGraph` and its layout turn into React Flow nodes and edges; a node
without a saved position is placed on a grid, so a graph written by the API
or the interviewer still renders.

### Narrow screens

Every screen works from 320px wide, and the page never scrolls sideways.

- A row with text and an action beside it gives the text column `min-w-0`,
  truncates or wraps the long part (`truncate`, or `break-all` for an email
  that must stay whole), and gives the action `shrink-0`. Without `min-w-0` a
  flex child refuses to shrink below its content, and a long email pushes the
  button out of its card.
- Page padding is smaller on phones: `px-4 py-6 sm:p-10`, cards `p-4 sm:p-6`.
- Check a layout change at 375px and 320px in the browser before calling it
  done.

## Naming

| What | File | Example |
|---|---|---|
| Component, view, layout | `PascalCase.tsx` | `DesignCanvas.tsx`, `SignInView.tsx` |
| A component's own pieces | `ComponentName.<role>.ts` | `DesignCanvas.hooks.ts` |
| Hook | `useCamelCase.ts` | `useCurrentUser.ts` |
| Store | `<name>.store.ts` | `sidebar.store.ts` |
| Query options and mutations | `<feature>.queries.ts`, `<feature>.mutations.ts` | `designs.queries.ts` |
| Feature constants, utils, types | `<feature>.<role>.ts` or a descriptive name | `designs.constants.ts`, `formatUnit.ts` |

The roles are the API's own: `.typedefs.ts`, `.constants.ts`, `.helpers.ts`.

## Imports

- `@/` is `src/`.
- Across features, import from the feature's `index.ts`
  (`@/features/auth`), never from a file inside another feature.
- Inside a feature, import another folder through its barrel by absolute
  path (`@/features/shell/store`, `@/features/auth/ui/components`), never
  with `../`. Only a sibling in the same folder is imported by relative path
  (`./UserMenu`): going through its own folder's barrel would make that
  barrel import itself, and a constant read during that cycle is still
  undefined.
- Every folder of a feature has an `index.ts` that re-exports everything in
  it, and the feature's `index.ts` re-exports its folders, so anything a
  feature has (views, layouts, components, queries, mutations, hooks,
  constants, types, utils) imports from `@/features/<feature>`. The barrels
  are generated: run `bun run barrels` after adding, renaming or removing a
  file under `features/`, and commit what it writes. Never edit one by hand.
- `routes/` imports from features; features never import from `routes/`.
- Never import `@repo/design/library`. It holds the official problems with
  their reference solutions, hidden drills and hint texts, and everything
  the web imports ships to the browser. The API serves what a solver may
  see. `@repo/design` is `"sideEffects": false`, so the rest of the package
  tree-shakes.
- `package.json` declares `"sideEffects": ["*.css"]`. Route options that
  are not code-split (`beforeLoad`, `validateSearch`) import a feature's
  barrel, and without the declaration the bundler keeps every module behind
  that barrel in the main chunk, because a top-level `cva()`, zustand
  `create()` or zod schema might have side effects. A module that must run
  for its side effect alone, other than a stylesheet, has to be added to that
  list.

## Data

- Server state is TanStack Query. A query is declared once with
  `queryOptions` in the feature's `api/` folder and used by the route's
  `loader` (`ensureQueryData`) and the view (`useQuery`/`useSuspenseQuery`)
  alike, so both read one cache entry.
- A mutation is declared once with `mutationOptions` in `api/`, and its own
  callbacks keep the cache right (refetch the current user, clear on sign-out).
  A component adds its reaction through `mutate(variables, { onSuccess })`,
  which runs after them. Never `useMutation({ ...someMutation, onSuccess })`:
  the spread replaces the declared callback instead of adding to it, and the
  cache silently stops being updated.
- Client state that outlives a component, such as whether the sidebar is
  collapsed, is a zustand store in the feature's `store/` folder:
  `sidebar.store.ts` exporting `useSidebarStore`. A store that must survive
  a reload uses `persist` with a `kaboom:<name>` key. Server data never goes
  into a store; it stays in TanStack Query.
- Calls go through `api` from `@/lib/api`, which targets `/api` on the same
  origin; the Vite dev server proxies it to the API, so the session cookie and
  CSRF stay same-origin.
