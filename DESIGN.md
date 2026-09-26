# Design

## Source of truth

Status: Active

Date: 2026-09-27

Product surfaces: web authentication, email-link outcomes, and account security settings. The authenticated application shell, header, future sidebar, design canvas, and interview flows are outside this revision.

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
- `/settings/security`: page introduction followed by password, email, connected accounts, sessions, and account deletion.
- The existing app header remains the only current application navigation. No page-local sidebar or tabs are added.

## Design principles

1. One obvious task per auth screen.
2. Group sensitive settings by purpose and explain consequences before actions.
3. Use decoration to establish depth and brand, never to carry meaning.
4. Keep layouts independent of the future app shell.
5. Preserve familiar browser and form behavior.

## Visual language

Color: neutral white and zinc surfaces with the existing semantic colors; indigo is a restrained brand accent for ambient backgrounds and small identity details. Destructive red is reserved for account deletion and errors.

Typography: Geist remains the single family. Page titles use compact tracking and strong weight; body text stays short and muted.

Spacing: auth panels use 24px mobile and 32px desktop padding. Security sections use 16px mobile and 24px desktop padding with 24px between groups.

Shape and elevation: 16-24px outer radii, hairline borders, and soft low-contrast shadows. Controls remain 10-12px radii. Avoid stacked heavy shadows.

Motion: existing control transitions only. Respect reduced-motion browser settings and do not add ambient animation.

Imagery and iconography: Lucide line icons support section recognition. Abstract background shapes may establish atmosphere but remain `aria-hidden`.

## Components

- `AuthLayout`: owns auth-page background, brand mark, heading, elevated content panel, and footer.
- `SettingsSection`: owns the responsive section card, icon treatment, heading, description, tone, and content column.
- Existing `Button`, `Input`, `Field`, `Badge`, and captcha components remain the control primitives.
- Auth and security sizing is scoped through surface classes; shared primitives are not globally restyled by this work.

## Accessibility

Target WCAG 2.2 AA. Keep semantic headings, labels, native form submission, `role="alert"` errors, visible focus rings, sufficient contrast, and 44px primary auth targets. Decorative elements are hidden from assistive technology. Content order remains logical when security cards collapse to one column.

## Responsive behavior

The minimum supported width is 320px. Auth pages use 16px viewport padding on small phones and a single panel capped at 440px. Security cards stack their heading and content on small screens and switch to a two-column information layout at `md`. Long email addresses wrap; actions never force horizontal scrolling.

## Interaction states

Pending actions disable their trigger and retain the existing progress copy. Errors remain adjacent to the relevant form and use alert semantics. Success messages replace or follow the completed interaction. Captcha challenges stay inside the form flow. Empty provider/session states use the existing truthful labels. Slow route-level loading and offline recovery remain open work because the router currently has no product-specific pending or error surface.

## Content voice

Use plain, reassuring English. Name the action and its consequence. Avoid security jargon, jokes during destructive actions, and generic claims such as “military-grade.” Keep “Kaboom” as the current product name until configurable client-side identity is introduced.

## Implementation constraints

Use React 19, TanStack Router and Query, Tailwind 4, Base UI, the existing shadcn-derived primitives, and Lucide icons. Do not add dependencies or create a parallel token system. Preserve file-route boundaries and feature imports. Validate lint, types, unit tests, production build, 320/375px behavior, desktop layout, and keyboard focus. Visual verification requires a running local API because route guards fetch the current user.

## Open questions

- [ ] Product owner: confirm the long-term brand color and identity before canvas work; impact is limited to accent tokens and the brand mark.
- [ ] Product owner: define the future app-shell navigation and sidebar; impact is intentionally excluded from these screens.
- [ ] Engineering: add product-specific route pending, error, and offline recovery states; impact is graceful failure during API outages.
