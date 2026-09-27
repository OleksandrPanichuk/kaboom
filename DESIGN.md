# Design

## Source of truth

Status: Active

Date: 2026-09-27

Product surfaces: web authentication, email-link outcomes, account security settings, and the signed-in app shell with its route states. The design canvas and interview flows are outside this revision.

Evidence reviewed: `apps/web/CLAUDE.md`, all current web routes, auth and security views/components, shared UI primitives, global theme tokens, and responsive guidance. No product mockups, brand assets, screenshots, Storybook stories, or browser-test baselines exist in the repository.

## Brand

Kaboom should feel focused, capable, and quietly technical. Trust comes from clear language, predictable actions, restrained color, strong hierarchy, and visible status. Avoid loud gradients, glass-heavy decoration, playful explosions, dashboard chrome on auth pages, and visual treatment that suggests a finished app shell before navigation is designed.

## Product goals

- Make account entry feel intentional and polished without competing with the form.
- Make security settings easy to scan, understand, and operate safely.
- Preserve the existing auth, captcha, OAuth, email, session, and deletion behavior.
- Keep the surfaces ready to sit inside a future sidebar-based application shell.

Non-goals: redesigning the app header, choosing the future navigation model, designing the system canvas, changing flows or API behavior, or introducing a new component library.

Success signals: a clear first action at phone and desktop widths, no horizontal overflow at 320px, obvious destructive boundaries, keyboard-visible focus, and consistent loading/error/success states.

## Personas and jobs

The primary user is an individual practising system design. They need to create or recover an account quickly, understand which sign-in methods are active, review sessions, and make sensitive account changes with confidence. Authentication often happens under interruption; security settings require deliberate review and should favor clarity over density.

## Information architecture

- Guest routes: sign in, sign up, and forgot password share one focused auth layout.
- Email-link routes: reset password, verify email, and confirm email change reuse the same layout and outcome language.
- `/designs`: the designs a user owns as cards, newest first, twenty at a time with *Load more*. Each card opens the design and has a menu to rename or delete it; deleting asks first. With no designs, the page is an empty state with *Create your first design*. *New design* asks for a name in a dialog and opens the new design.
- `/designs/$designId`: the design's name and revision above a placeholder until the canvas lands. An unknown or malformed id is the not-found page.
- `/settings/profile`: page introduction followed by the name.
- `/settings/security`: page introduction followed by password, email, connected accounts, sessions, and account deletion.
- Signed-in routes sit inside the app shell (below). Its sidebar is the only application navigation; pages add no local sidebar or tabs.

## Design principles

1. One obvious task per auth screen.
2. Group sensitive settings by purpose and explain consequences before actions.
3. Use decoration to establish depth and brand, never to carry meaning.
4. Views own their content, never the chrome: the app shell provides navigation, the page landmark and the verification banner.
5. Preserve familiar browser and form behavior.

## App shell

The signed-in app is a sidebar beside the page. The sidebar is the navigation, the page keeps the full height, and nothing sits above the page but a 48px header.

- **Sidebar, desktop (from 768px):** 256px wide with labels, or a 48px rail of icons with a tooltip for each. The header's toggle, `⌘B`/`Ctrl+B` and the sidebar's edge rail switch between them. The choice is remembered per browser, so a canvas user who collapses it once keeps the room.
- **Sidebar, phone (below 768px):** a 288px drawer from the left, opened from the header's toggle. Choosing a destination closes it.
- **Brand:** the Kaboom mark and name lead the sidebar and link home; collapsed, the mark stays alone.
- **Destinations:** *Practice* holds Home, Designs, Interviews and Progress. Account pages are not in the sidebar; they are reached from the account menu. A destination that is not built yet is listed, muted, with a *Soon* pill, and is not a link: the reader sees where the product is going without landing on an empty page. It becomes a link in the pull request that builds it.
- **Active destination:** the matching item carries the accent surface and `aria-current="page"`, and its name repeats in the header, which is the only page title the chrome adds.
- **Account:** the sidebar's foot shows the initials, name and email, truncated. It opens a menu with the name and email in full, *Profile*, *Security* and *Sign out*. Sign-out returns to sign-in.
- **Verification banner:** below the header, above the page, on every signed-in page until the email is confirmed.
- **Landmarks:** the shell owns `<main>`; views render a plain container inside it.

### Workspace

A design, and later a problem or an interview, opens full screen without the sidebar, so the whole window is for the work. `WorkspaceLayout` gives each of them the same frame, and the page fills its slots.

- **Top bar (48px):** a back link to the list the page came from, the title and a muted detail (the revision), the page's actions (Run, Submit, End interview), toggles for the two panels, and the account menu.
- **Tool panel, left:** what the user adds to the canvas; the node palette for a design. 240px by default, resizable from 200 to 360px.
- **Canvas, centre:** never narrower than 320px.
- **Inspector, right:** tabs chosen by the page. A design has *Node* (the selected node's properties, opened automatically when a node is selected) and *Run*; a problem adds *Task* and *Submissions*; an interview has *Interview* and *Task*. 360px by default, resizable from 300px to half the window.
- Both panels collapse to nothing from their toggle or by dragging past their minimum. Their sizes are remembered per browser.
- **Below 1024px** the canvas takes the whole window under the top bar. The tool panel opens as a sheet from the left and the inspector as a sheet from the bottom, 80 % of the height, from the same toggles.
- The verification banner is not shown in a workspace.

### Route states

- **Loading:** a route that takes longer than a second to load shows a centred spinner and "Loading…" in a live `status` region, inside the shell when the route is inside it. The spinner stops under reduced motion.
- **Failure:** a route that throws shows a centred alert. When the API cannot be reached (offline, a network error or a 502-504) it says *Kaboom can't be reached* and that work is kept on the server; otherwise *This page didn't load*. *Try again* reloads the route's data.
- **Not found:** an unknown address shows *There's nothing here* with a link home.

## Visual language

Color: neutral white and zinc surfaces with the existing semantic colors; indigo is a restrained brand accent for ambient backgrounds and small identity details. Destructive red is reserved for account deletion and errors.

Typography: Geist remains the single family. Page titles use compact tracking and strong weight; body text stays short and muted.

Spacing: auth panels use 24px mobile and 32px desktop padding. Settings sections use 16px mobile and 24px desktop padding with 24px between groups.

Shape and elevation: 16-24px outer radii, hairline borders, and soft low-contrast shadows. Controls remain 10-12px radii. Avoid stacked heavy shadows.

Motion: existing control transitions only. Respect reduced-motion browser settings and do not add ambient animation.

Imagery and iconography: Lucide line icons support section recognition. Abstract background shapes may establish atmosphere but remain `aria-hidden`.

## Components

- `AuthLayout`: owns auth-page background, brand mark, heading, elevated content panel, and footer.
- `AppShell`: owns the sidebar, header, verification banner and page landmark of the signed-in pages outside a workspace.
- `WorkspaceLayout`: owns the top bar, the resizable tool panel and inspector, their sheets on small screens, and the canvas landmark.
- `BrandMark`: the one drawing of the Kaboom mark, shared by the auth layout and the sidebar.
- `RouteError`, `RoutePending`, `NotFound`: the router's defaults for the route states above.
- `SettingsPageHeader`: owns a settings page's icon, eyebrow, title and description.
- `SettingsSection`: owns the responsive section card, icon treatment, heading, description, tone, and content column.
- Existing `Button`, `Input`, `Field`, `Badge`, and captcha components remain the control primitives.
- Auth and security sizing is scoped through surface classes; shared primitives are not globally restyled by this work.

## Accessibility

Target WCAG 2.2 AA. Keep semantic headings, labels, native form submission, `role="alert"` errors, visible focus rings, sufficient contrast, and 44px primary auth targets. Decorative elements are hidden from assistive technology. Content order remains logical when security cards collapse to one column.

## Responsive behavior

The minimum supported width is 320px. Auth pages use 16px viewport padding on small phones and a single panel capped at 440px. Security cards stack their heading and content on small screens and switch to a two-column information layout at `md`. Long email addresses wrap; actions never force horizontal scrolling.

## Interaction states

Pending actions disable their trigger and retain the existing progress copy. Errors remain adjacent to the relevant form and use alert semantics. Success messages replace or follow the completed interaction. Captcha challenges stay inside the form flow. Empty provider/session states use the existing truthful labels. Route-level loading, failure and not-found states are described under *App shell*.

## Content voice

Use plain, reassuring English. Name the action and its consequence. Avoid security jargon, jokes during destructive actions, and generic claims such as “military-grade.” Keep “Kaboom” as the current product name until configurable client-side identity is introduced.

## Implementation constraints

Use React 19, TanStack Router and Query, Tailwind 4, Base UI, the existing shadcn-derived primitives, and Lucide icons. Do not create a parallel token system. Add a dependency only with the product owner's agreement: zustand holds client state such as the sidebar's collapsed state. Preserve file-route boundaries and feature imports. Validate lint, types, unit tests, production build, 320/375px behavior, desktop layout, and keyboard focus. Visual verification requires a running local API because route guards fetch the current user.

## Open questions

- [ ] Product owner: confirm the long-term brand color and identity before canvas work; impact is limited to accent tokens and the brand mark.
- [x] Product owner: define the app-shell navigation and sidebar; see *App shell*.
- [x] Engineering: add product-specific route pending, error, and offline recovery states; see *Route states*.
