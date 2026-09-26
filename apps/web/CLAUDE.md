# apps/web

React 19 + Vite, TanStack Router (file routes) and TanStack Query, shadcn/ui on
Base UI with Tailwind 4, React Flow for the canvas. It talks to the API only
through `@repo/api-client` and reads the design model from `@repo/design`.

## Layout

```
src/
  routes/                 TanStack file routes: config and a thin component, no markup
  features/<feature>/     everything one product feature owns
    ui/
      views/              one per screen a route renders
      layouts/            shells several views share
      components/         the feature's building blocks
    api/                  query options and mutations over @repo/api-client
    hooks/                hooks the feature's views and components share
    constants/
    utils/
    typedefs/
    index.ts              what other features and routes may import
  components/             app-wide components that belong to no feature
  components/ui/          shadcn components, added with `bun run ui:add`
  lib/                    the API client, the query client, cn
  styles/
```

A feature has only the folders it needs; there are no empty ones.

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
- A shadcn component is ours once added: it is linted like any other file and
  edited in place when it needs to be. Re-adding with `--overwrite` replaces
  such edits, so review the diff when updating one.

## Naming

| What | File | Example |
|---|---|---|
| Component, view, layout | `PascalCase.tsx` | `DesignCanvas.tsx`, `SignInView.tsx` |
| A component's own pieces | `ComponentName.<role>.ts` | `DesignCanvas.hooks.ts` |
| Hook | `useCamelCase.ts` | `useCurrentUser.ts` |
| Query options and mutations | `<feature>.queries.ts`, `<feature>.mutations.ts` | `designs.queries.ts` |
| Feature constants, utils, types | `<feature>.<role>.ts` or a descriptive name | `designs.constants.ts`, `formatUnit.ts` |

The roles are the API's own: `.typedefs.ts`, `.constants.ts`, `.helpers.ts`.

## Imports

- `@/` is `src/`.
- Across features, import from the feature's `index.ts`
  (`@/features/auth`), never from a file inside another feature.
- Inside a feature, import by relative path.
- Every folder of a feature has an `index.ts` that re-exports everything in
  it, and the feature's `index.ts` re-exports its folders, so anything a
  feature has (views, layouts, components, queries, mutations, hooks,
  constants, types, utils) imports from `@/features/<feature>`. The barrels
  are generated: run `bun run barrels` after adding, renaming or removing a
  file under `features/`, and commit what it writes. Never edit one by hand.
- `routes/` imports from features; features never import from `routes/`.

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
- Calls go through `api` from `@/lib/api`, which targets `/api` on the same
  origin; the Vite dev server proxies it to the API, so the session cookie and
  CSRF stay same-origin.
