# project-infinity

A project tracking app for multi-step personal projects (e.g., a home remodel) — sitting between a simple todo app and a full project management tool. See `REQUIREMENTS.md` for what it does, `ROADMAP.md` for build order, and `TECH-STACK.md` for the full architecture.

This file is a living setup guide — update it as the project evolves rather than letting it drift.

## Prerequisites

- **Node.js 24** (current Active LTS as of writing) — confirmed to work on Netlify's build environment; supported via EAS Build's `eas.json` `node` override field, though not explicitly documented on an official EAS-supported-versions list, so worth a quick sanity check the first time you run `eas build:configure`. Not Node 26 — it's the newest release but doesn't become LTS until October 2026.
- **pnpm** — the package manager for this monorepo, paired with Turborepo. Chosen over Yarn specifically because Yarn Berry's default mode is incompatible with Expo/React Native; see `TECH-STACK.md` § Package Manager for the full reasoning.
- **Docker** (Docker Desktop, OrbStack, or Colima all work) — required to run the local Supabase stack (`supabase start`) per `TECH-STACK.md` §5a. Must be installed and running before local database/migration work.
- Accounts, all free tier for now:
  - GitHub (repo hosting, Actions)
  - Netlify (web hosting/previews)
  - Supabase (database/auth)
  - Expo / EAS (expo.dev — mobile builds/updates)
- **Apple Developer Program** ($99/year) — the one non-free cost in this stack, but **not needed immediately**. Two free options cover early development:
  - **iOS Simulator** (Mac + Xcode): fully free, no Apple account at all. Fine for most day-to-day development and testing.
  - **Your own physical iPhone via a free Apple ID** ("Personal Team," no paid enrollment): also free, but the provisioning profile expires every 7 days, requiring a rebuild/reinstall roughly weekly, and doesn't fit EAS's normal cloud-build flow well (needs a local build instead).
  - The paid account becomes worth it once you want smooth on-device testing without the weekly re-signing hassle, or when you're ready to distribute via TestFlight/App Store — EAS Build's fully-automated cloud credential management assumes a paid account.

## One-Time Setup

1. Clone the repo, run `pnpm install` from the root (this also installs the Supabase CLI as a workspace dev dependency — invoke it via `pnpm exec supabase <command>`, not a global `supabase` install).
2. The hosted Supabase project (`Project Infinity`) already exists — you don't need to create a new one. Run `pnpm exec supabase login` (opens a browser OAuth flow against your own Supabase account), then `pnpm exec supabase link --project-ref <project-ref>` to link this repo to it. Copy the project's URL and anon/public key from the dashboard (or via `mcp__supabase__get_project_url` / `get_publishable_keys` if using the Supabase MCP tools).
3. Set up local env files (see `TECH-STACK.md` § Environment/Secrets Management) — `.env.example` files show the required var names:
   - `apps/web/.env` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - `apps/mobile/.env` — `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
4. Run `pnpm exec supabase start` to boot the local Docker-based Postgres/Auth/PostgREST stack (requires Docker running — see Prerequisites above). `pnpm exec supabase status` prints local URLs/keys once it's up.
5. Create an Expo account and link the mobile app to EAS (`eas build:configure`), then mirror the same env values into EAS's Environment Variables dashboard so cloud builds and `eas env:pull` stay in sync with your local `.env`.
6. Connect the GitHub repo to Netlify, with the site's base directory set to `apps/web`, so Deploy Previews start working on PRs.

## Local Development

- **Web**: `pnpm dev:web` (runs `turbo run dev --filter=web`, starting Vite's dev server).
- **Mobile**: `pnpm dev:mobile` (runs `turbo run dev --filter=mobile`, starting `expo start`).

## Database Migrations

Full reasoning in `TECH-STACK.md` § Backend/Database/Auth and § Local Supabase & RLS Testing. This is the day-to-day command sequence for making a schema change.

1. Make sure the local Supabase stack is running: `pnpm exec supabase start` (starts a local Docker-based Postgres/Auth/PostgREST stack).
2. Create a new migration file: `pnpm exec supabase migration new <descriptive_name>` — scaffolds an empty, timestamped SQL file in `supabase/migrations/`. Write the SQL by hand (`CREATE TABLE`, `ALTER TABLE`, `CREATE POLICY`, etc.), or make the change through the local Studio UI and run `pnpm exec supabase db diff --local -f <descriptive_name>` to auto-generate the migration from what changed.
3. **Never edit an already-applied migration file.** If something needs to change from a prior migration, write a new migration that alters it — the folder is an append-only history.
4. Test that it applies cleanly from scratch: `pnpm exec supabase db reset` — drops the local database and replays every migration in order, including the new one. This confirms the migration works from a blank slate, not just against your already-partially-migrated local database.
5. Regenerate TypeScript types so `packages/shared` stays in sync with the real schema: `pnpm exec supabase gen types typescript --local > packages/shared/src/database.types.ts`. Commit the regenerated file alongside the migration — this is what keeps mock data and Supabase client usage compile-time-checked against the real schema (see `TECH-STACK.md` § Testing Strategy).
6. If the change touches RLS policies, run `rlsautotest` locally before opening the PR (in addition to the path-filtered CI job that runs it automatically for any PR touching `supabase/migrations/**`).
7. Commit the new migration file and the regenerated types file together in the same PR.
8. **Deploying to the real hosted Supabase project** — currently a manual step: run `pnpm exec supabase db push` against the hosted project once ready. Not yet automated as part of CI/CD; worth revisiting once deployment cadence picks up.
9. Supabase cannot be stopped via docker desktop. Run `pnpm exec supabase stop`.

## Build, Lint & Test

- **Typecheck**: `pnpm typecheck` (`turbo run typecheck`) — TypeScript compilation check across every package, no emit.
- **Lint**: `pnpm lint` (`turbo run lint`) — ESLint (code quality) plus Prettier in `--check` mode (formatting compliance), with `eslint-config-expo` layered on for `apps/mobile`.
- **Test**: `pnpm test` (`turbo run test`) — Vitest, covering unit tests (the pure derivation functions in `packages/shared`), component tests (React Testing Library / React Native Testing Library), and hook/data-layer tests (MSW-mocked network calls). This is the fast, everyday test loop — see `TECH-STACK.md` § Testing Strategy for the full tier breakdown.
- **Build**: `pnpm build` (`turbo run build`) — production builds for `apps/web` and `apps/mobile`.
- **E2E tests** (not part of the everyday loop — slower, run separately): Playwright (web), Maestro (mobile), covering a small number of golden-path flows only.
- **RLS tests**: not part of `yarn test`. `rlsautotest` runs automatically in CI, but only on PRs touching `supabase/migrations/**` (see `TECH-STACK.md` § Local Supabase & RLS Testing). Run it manually against the local Supabase stack (`supabase start`) if you want to check an RLS change before opening a PR.

## Deployment

- **Web**: automatic via Netlify on every PR (preview) and on merge to `main` (production).
- **Mobile**: EAS Update publishes a JS-only preview on every PR; a full EAS Build (iOS) runs on merge to `main` or manually. See `TECH-STACK.md` § CI/CD for the full breakdown.

