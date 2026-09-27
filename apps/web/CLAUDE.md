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
      index.tsx, designs/index.tsx, settings/profile.tsx, settings/security.tsx
    (workspace)/          full-screen work surfaces, each view renders WorkspaceLayout
      designs/$designId.tsx
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

The canvas itself lives in `features/canvas`. `toFlow` is the one place a
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
