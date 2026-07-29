# project-infinity Tech Stack

## 1. Overview

This document covers the technical architecture and tooling for project-infinity — how the app is built, as opposed to `REQUIREMENTS.md` (what the app does) and `ROADMAP.md` (the order it gets built in).

The stack is React, React Native, Supabase, and Netlify — chosen directly by the project owner, not the Microsoft/Azure stack Improving defaults to for tooling recommendations generally. This document assumes that choice and builds on it.

## 2. Repo Structure (Monorepo)

**pnpm Workspaces + Turborepo.** pnpm workspaces (declared in `pnpm-workspace.yaml`) link the packages together so apps can import shared code without publishing it anywhere; Turborepo adds task orchestration and caching (builds, lints, tests) across the packages, independent of which package manager sits underneath it.

```
project-infinity/
  apps/
    web/       — Vite + React
    mobile/    — Expo + React Native
  packages/
    shared/    — Supabase client, TypeScript types, TanStack Query data-fetching hooks
    ui/        — HeroUI-based wrapper components, shared between web and mobile
  package.json
  pnpm-workspace.yaml
  turbo.json
```

## 3. Web App

- **Vite + React**, TypeScript.
- Plain single-page app — no server-side rendering. The app is entirely behind login with no SEO surface, so SSR would add complexity without benefit.
- Vite provides fast dev-server startup and hot module replacement by serving native ES modules during development (transforming only the file being requested, not bundling the whole app upfront), and bundles via Rollup for production.
- Hosted on **Netlify**.

## 4. Mobile App

- **Expo** (React Native), TypeScript.
- **iOS first for V1.** Android comes later. Larger-screen/desktop-specific features are a future consideration, not V1.

## 5. Backend / Database / Auth

- **Supabase**: Postgres database, built-in authentication, and row-level security (RLS) enforcing single-owner-per-project (no sharing in V1, per `REQUIREMENTS.md`).
- **Derived logic lives in `packages/shared`, not Postgres.** Subproject/project status derivation, actual-date derivation, and cost/progress rollups (tasks done vs. total, sum of estimated/actual costs, budget variance) are plain, pure TypeScript functions — `deriveSubprojectStatus(tasks)`, `deriveActualDates(tasks)`, `calculateRollupStats(tasks)` — operating on raw rows already fetched by the data-fetching hooks. This app's data volumes are small (a personal project tracker, dozens of tasks per subproject, not millions of rows), so there's no real efficiency argument for pushing aggregation into the database — and pure functions are trivially unit-testable, while Postgres views/functions are not. Both apps import the same functions from `packages/shared`, so "single source of truth" is preserved without needing the database to own it.
- **Postgres is scoped to**: raw data storage, referential integrity (foreign keys, constraints), and **RLS** — the one thing that genuinely must live in the database, since it's a security boundary that can't be trusted to client-side enforcement.
- **Schema is managed exclusively through the Supabase CLI and `supabase/migrations/`.** Every schema change — starting with the first `CREATE TABLE` statements — is a new, timestamped, committed SQL migration file (RLS policies included, as `CREATE POLICY` statements within these files). Already-applied migrations are never edited, only superseded by a new one, the same append-only discipline as git history. `supabase db reset` (local) drops and replays every migration from scratch for a reproducible local schema; `supabase db push` applies outstanding migrations to a hosted project.
- **A Supabase MCP server may be used later as a development convenience** — inspecting the schema, running ad hoc queries, authoring migrations conversationally — but it is never a substitute for the migration-file discipline above. Any schema change made through it must still exist as a committed file in `supabase/migrations/`, never as an uncaptured direct SQL execution against the database, or the local/hosted schema quietly drifts from what's in git.

## 5a. Local Supabase & RLS Testing

- `pnpm exec supabase init` / `pnpm exec supabase start` spins up a Docker-based local Postgres + Auth + PostgREST stack via the CLI, used for local development and ad hoc testing. The CLI is installed as a root workspace dev dependency (not global), so it's always invoked via `pnpm exec supabase <command>`.
- **Not wired into every CI run.** A full `supabase start` is slow in CI — the stack is several gigabytes of Docker images, uncached on standard GitHub-hosted runners, adding roughly 3-5 minutes to a job — and unnecessary for the vast majority of PRs that don't touch the schema at all.
- Instead: a GitHub Actions job **path-filtered to `supabase/migrations/**`**, so it only runs on PRs that actually touch the schema/policies (zero cost otherwise). It uses `supabase start --ignore-health-check` (minimal services, only waiting on Postgres itself) to reduce startup cost, then runs **rlsautotest** — a tool that reads the actual RLS policies from the Postgres catalog and auto-generates a full `pgTAP` test suite plus seed data, producing a per-identity access matrix (who can SELECT/INSERT/UPDATE/DELETE which rows) and failing CI on any policy leak or unprotected table.
- **Revisit and broaden this** once real other users are on the app (not just the developer testing their own data — the blast radius of an undetected RLS bug is low during solo development, much higher once real users' data is at stake), and especially before the sharing/invite feature ships: that rewrites every table's RLS from an ownership check ("do I own this") to a membership check ("am I a member of this project"), which is the highest-risk moment for a silent regression.

## 6. Data Fetching & Caching

- **TanStack Query** (React Query) for all data fetching and mutations, in both the web and mobile apps — it works identically in React and React Native.
- **`supabase-cache-helpers`** (specifically `@supabase-cache-helpers/postgrest-react-query`) sits between Supabase and TanStack Query:
  - Cache keys are auto-derived from the Supabase query builder itself (table, filters, columns), rather than hand-written.
  - Insert/update/delete mutation hooks automatically know which cached queries to invalidate or patch after a write, avoiding a common class of bugs where a hand-written cache key drifts out of sync between where data is fetched and where it's invalidated.
- Shared data-fetching hooks (`useProjects()`, `useTasks(subprojectId)`, etc.) live in `packages/shared`, imported identically by both apps. Caching itself is per-app-instance (in-memory, not shared between web and mobile processes) — what's shared is the code and behavior, not a literal cache.
- Not used for realtime sync in V1: Supabase's realtime (Postgres change) subscriptions are not wired up. Worth revisiting later if live cross-device updates become a want.

## 7. UI / Styling

- **Tailwind CSS v4** as the shared design-token foundation (fixed size and color scale) on both web and mobile — the goal is that named tokens (`size="md"`, `color="primary"`) always resolve to the same actual values everywhere, so visual drift requires someone to bypass the theme entirely (e.g., raw arbitrary Tailwind values), rather than happening by default.
- **HeroUI** component libraries, one per platform, sharing a design system but not literal component code:
  - **Web**: `@heroui/react`, built on React Aria Components (DOM-based accessibility primitives) + Tailwind CSS v4.
  - **Mobile**: `heroui-native`, built on Uniwind (a Tailwind-for-React-Native binding library) + Tailwind CSS v4. Requires Expo, which the mobile app already uses.
- **`packages/ui`**: thin wrapper components around HeroUI's raw components (e.g., `Button`, `Input`, `Card`, `StatusBadge`), narrowing HeroUI's full prop surface down to the app's actual sanctioned variants (no raw size/color props exposed) to guarantee consistency by construction. This package also serves as the seam that unifies the two separate underlying HeroUI libraries behind one API: platform-specific file extensions (`Button.web.tsx` importing from `@heroui/react`, `Button.native.tsx` importing from `heroui-native`, both exporting the same props interface) let app code import `Button` from `packages/ui` without knowing which underlying library is actually rendering it.
- This wrapper treatment is reserved for frequently-reused, consistency-sensitive components (Button, Input, Card, StatusBadge) — not a blanket policy to wrap every HeroUI export. One-off components used in a single context can use HeroUI directly.

## 8. Package Manager

- **pnpm** (workspaces), paired with Turborepo for task running. Chosen over Yarn because Yarn Berry's default PnP (Plug'n'Play) mode is flatly incompatible with React Native — Metro doesn't support it, and this isn't expected to change — which would require explicitly overriding Berry's default (`nodeLinker: node-modules`) to make Expo work at all. pnpm's default behavior already works natively with Expo as of SDK 53+ / React Native 0.76+, no override needed, while also being a long-established, safe choice for the web side. Its strict, symlinked `node_modules` structure also catches "phantom dependencies" (code accidentally relying on a package that isn't actually declared as a dependency, just hoisted nearby) that a flatter structure would silently allow.

## 9. CI/CD

The repo lives on GitHub. Every PR gets three automatic checks; a full mobile release build only happens on merge to `main` or manually, since it's slower and not needed for every review cycle.

**On every pull request:**
- **GitHub Actions**: `turbo run typecheck`, `turbo run lint`, `turbo run test`, `turbo run build` from the repo root. Turborepo's caching means only packages actually affected by the PR re-run (a mobile-only change won't re-typecheck the web app, etc.). These are required status checks gating merges.
- **Netlify Deploy Preview**: automatic once the repo is connected to a Netlify site — builds and deploys a unique preview URL per PR, posted as a PR comment/status check. For this monorepo, Netlify's **base directory** is set to `apps/web`, with a build command like `turbo run build --filter=web`. Netlify can skip the preview entirely if nothing under `apps/web` changed in a given PR.
- **EAS Update PR preview** (mobile): a GitHub Action (`expo/expo-github-action`) runs `eas update --auto`, publishing a JavaScript-only update plus a QR code comment on the PR. Reviewers need a build of the app already on their device that supports EAS Update (Expo Go, or a custom dev client if using native modules outside Expo Go) and scan the QR code to get the PR's changes instantly — no native rebuild needed. Requires an `EXPO_TOKEN` secret (a personal access token from expo.dev) in GitHub repo secrets.

**On merge to `main` (or manual trigger):**
- **EAS Build** (full native iOS binary): only needed when something native actually changes (a new native dependency, app config affecting the native project) or for a real TestFlight build — not run on every PR, since it's slow and consumes build minutes. Triggered via `eas build --platform ios --non-interactive --no-wait`, authenticated with the same `EXPO_TOKEN` secret. Requires one-time local setup first (`eas build` run locally once to generate `eas.json`, a project ID, and iOS signing credentials) before CI can trigger it non-interactively.

## 10. Environment / Secrets Management

The Supabase URL and anon/public key are not treated as true secrets — Supabase's security model relies on Row Level Security (RLS) policies, not on hiding the anon key, which is designed to be public and extractable from any client bundle. The one genuine secret is the **service_role key**, which bypasses RLS entirely and must never be embedded in the mobile or web client — it has no place in this app's client-side configuration at all, only in a trusted server context (e.g., a Supabase Edge Function) if one is ever needed.

- **Web**: local `.env` with Vite's client-exposed prefix — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — and the same values entered into Netlify's site environment variables UI for deployed/preview builds.
- **Mobile**: EAS's **Environment Variables** dashboard is the direct analog to Netlify's env var UI. Values are stored as `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`, scoped to an environment (development/preview/production — a single Supabase project is fine for V1). `eas.json` build profiles reference which environment applies to a given build. The `EXPO_PUBLIC_` prefix is what causes Metro to inline a variable into the JS bundle at build time (the same role as Vite's `VITE_` prefix); anything without it stays out of the shipped app. `eas env:pull` syncs the EAS-dashboard values into a local `.env` for local Expo development, so EAS is the one source of truth rather than manually keeping a local file in sync.
- **True build-only secrets** (not needed today, but the mechanism exists): EAS supports a "Secret" visibility type for values like an `NPM_TOKEN` or Apple signing credentials — these never leave EAS's servers, can't be pulled locally, and can't end up embedded in an app bundle or OTA update.
- **`packages/shared`** stays prefix-agnostic: its Supabase client setup accepts the URL/key as plain constructor arguments, and each app (`apps/web`, `apps/mobile`) is responsible for reading its own prefixed env vars and passing them in.

## 11. Testing Strategy

Shape follows the "testing trophy" model — many fast unit tests, a good number of component tests, fewer integration tests, very few slow E2E tests — deliberately avoiding heavy reliance on slow, exhaustive integration/UI testing.

- **Unit tests**: **Vitest**, testing the pure derivation functions in `packages/shared` (status, actual dates, rollups — see § 5). Fastest, most numerous, zero infrastructure — this is where most of the app's actual business-logic confidence comes from.
- **Component tests**: **React Testing Library** (web) / **React Native Testing Library** (mobile). Components are split into containers (call the data-fetching hooks) and presentational components (plain props, no hook import) wherever practical. Component tests mock the hook's return value directly, or just construct props inline — no MSW, no real network — since a component's own rendering logic doesn't care how its data arrived.
- **Hook/data-layer tests** — the only tier where **MSW** is used: testing `packages/shared`'s hooks in isolation (query key construction, `supabase-cache-helpers` cache/invalidation behavior, error/empty/edge-case handling) via `renderHook`, with MSW mocking the network layer. To avoid mock/schema drift, MSW response payloads are typed directly against Supabase's CLI-generated types (`supabase gen types typescript`), so a schema change becomes a TypeScript compile error rather than a silent mismatch; type regeneration is automated (CI or pre-commit) and the generated file is committed and reviewed like any other change.
- **Integration tests** (screen-level, real hook + real component wiring): use a **real local Supabase instance** (§ 5a) rather than MSW, avoiding the mock-drift problem entirely for this tier. Kept small — enough to prove a wiring pattern works once, not one per screen.
- **E2E tests**: **Playwright** (web), **Maestro** (mobile — chosen over Detox for a new Expo app: YAML-based, no native code changes required, lower setup cost, better reported reliability for this use case). Reserved for a small number of true golden-path flows (e.g., sign up → create project → create task → mark done → see rollup update correctly), not exhaustive UI coverage.

## 12. Observability (Deferred)

Backend visibility is already covered for free by Supabase's built-in dashboard logs (Postgres, API, Auth, Edge Function logs; 7-day retention on the free tier) — no extra tool needed there.

Client-side error tracking (Sentry's free tier vs. GlitchTip vs. a DIY Supabase table + Database Webhook for alerting — all viable, no clearly wrong choice) is **intentionally skipped for now**, since the only user during early development is the project owner — the value of automated error tracking is low when you are the one using the app and would notice a problem directly. Revisit and add Sentry's free tier once real other users are on the app, at which point errors won't surface to you automatically just by using it yourself.

## 13. Linting & Formatting

- **ESLint + Prettier**, not Biome. Biome (a single Rust-based tool combining linting and formatting) is the common 2026 recommendation for greenfield projects — faster, one config file — but two gaps matter specifically for this project: no equivalent to `eslint-plugin-import`'s circular-dependency detection (a real risk given `packages/shared` and `packages/ui` are both consumed by `apps/web` and `apps/mobile`), and weaker accessibility-linting coverage than `eslint-plugin-jsx-a11y` (less critical here since HeroUI's web layer is built on React Aria Components, which bakes in accessibility correctness structurally). Combined with prior direct experience with ESLint + Prettier, sticking with the known, more complete tooling wins over switching for speed alone.
- **Division of responsibility**: Prettier owns formatting exclusively (whitespace, quotes, line length); ESLint owns code-quality/correctness rules (unused variables, hooks rules, import cycles, accessibility) and never fights over formatting, enforced via `eslint-config-prettier` disabling ESLint's own stylistic rules.
- **VSCode**: official ESLint and Prettier extensions. Prettier set as the default formatter with `editor.formatOnSave: true`; ESLint's `editor.codeActionsOnSave: { "source.fixAll.eslint": true }` auto-fixes lint issues on save.
- **CI**: `turbo run lint` (already in the GitHub Actions pipeline, § CI/CD) runs both ESLint and Prettier in `--check` mode (fails on unformatted code rather than auto-fixing) — the enforcement backstop, independent of anyone's local editor setup.
- **Monorepo config**: one shared root-level config for both tools, with per-app overrides where needed — e.g., Expo's official `eslint-config-expo` preset layered on for `apps/mobile`.

## 14. Client-Side UI State & Forms

- **Client-side UI state**: no dedicated state library (Zustand/Jotai/Redux). TanStack Query already owns all server state; what's left (modal open/closed, expanded sections, selected item) is local, ephemeral UI state handled by plain React `useState`/`useReducer`, with React Context reserved for genuinely cross-cutting concerns (e.g. the current authenticated user). Revisit only if some piece of state needs to be read/written from many unrelated parts of the tree in a way props/Context can't handle cleanly — not expected given this app's screen shapes (lists, detail views, forms).
- **Form handling**: **React Hook Form + Zod** (via `@hookform/resolvers/zod`), confirmed working identically on React and React Native/Expo. One schema per form (Task, Subproject, Project create/edit) serves as both the runtime validator and — via `z.infer<typeof schema>` — the source of the form's TypeScript type, so the type and its validation rules can never drift apart the way two independently hand-maintained artifacts could (add a required field to a hand-written type, forget the matching validation rule). Also handles cross-field validation (e.g. due date on/after a subproject's start date) more cleanly than React Hook Form's native per-field rules alone. Each relevant `packages/ui` wrapper component (Input, Select, etc.) needs to route through React Hook Form's `Controller`, since HeroUI's inputs are controlled components rather than natively wired for RHF's uncontrolled-by-default approach.

There is no longer a "Not Yet Decided" list — every identified tech-stack area now has a resolved decision.
