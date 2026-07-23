# project-infinity

A project tracking app for multi-step personal projects (e.g., a home remodel) — sitting between a simple todo app and a full project management tool. See `REQUIREMENTS.md` for what it does, `ROADMAP.md` for build order, and `TECH-STACK.md` for the full architecture.

This file is a living setup guide. Parts of it are placeholders (marked **TBD**) until the repo is actually scaffolded and a few remaining tech decisions (testing, linting) are made — update it as those land rather than letting it drift.

## Prerequisites

- **Node.js** — TBD exact version once the repo is scaffolded (likely current LTS).
- **Yarn** — TBD whether Classic (v1) or Berry (v2+); not yet explicitly decided, just that Yarn Workspaces + Turborepo is the monorepo approach (see `TECH-STACK.md`).
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

1. Clone the repo, run `yarn install` from the root.
2. Create a Supabase project. Copy its project URL and anon/public key.
3. Set up local env files (see `TECH-STACK.md` § Environment/Secrets Management):
   - `apps/web/.env` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - `apps/mobile/.env` — `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
4. Create an Expo account and link the mobile app to EAS (`eas build:configure`), then mirror the same env values into EAS's Environment Variables dashboard so cloud builds and `eas env:pull` stay in sync with your local `.env`.
5. Connect the GitHub repo to Netlify, with the site's base directory set to `apps/web`, so Deploy Previews start working on PRs.

## Local Development

- **Web**: TBD exact script name (likely `yarn workspace web dev`, running Vite's dev server).
- **Mobile**: TBD exact script name (likely `yarn workspace mobile start`, running `expo start`).

## Database Migrations

Full reasoning in `TECH-STACK.md` § Backend/Database/Auth and § Local Supabase & RLS Testing. This is the day-to-day command sequence for making a schema change.

1. Make sure the local Supabase stack is running: `supabase start` (starts a local Docker-based Postgres/Auth/PostgREST stack).
2. Create a new migration file: `supabase migration new <descriptive_name>` — scaffolds an empty, timestamped SQL file in `supabase/migrations/`. Write the SQL by hand (`CREATE TABLE`, `ALTER TABLE`, `CREATE POLICY`, etc.), or make the change through the local Studio UI and run `supabase db diff --local -f <descriptive_name>` to auto-generate the migration from what changed.
3. **Never edit an already-applied migration file.** If something needs to change from a prior migration, write a new migration that alters it — the folder is an append-only history.
4. Test that it applies cleanly from scratch: `supabase db reset` — drops the local database and replays every migration in order, including the new one. This confirms the migration works from a blank slate, not just against your already-partially-migrated local database.
5. Regenerate TypeScript types so `packages/shared` stays in sync with the real schema: `supabase gen types typescript --local > packages/shared/src/database.types.ts` (exact path TBD once the repo is scaffolded). Commit the regenerated file alongside the migration — this is what keeps mock data and Supabase client usage compile-time-checked against the real schema (see `TECH-STACK.md` § Testing Strategy).
6. If the change touches RLS policies, run `rlsautotest` locally before opening the PR (in addition to the path-filtered CI job that runs it automatically for any PR touching `supabase/migrations/**`).
7. Commit the new migration file and the regenerated types file together in the same PR.
8. **Deploying to the real hosted Supabase project** — currently a manual step: run `supabase db push` against the hosted project once ready. Not yet automated as part of CI/CD; worth revisiting once deployment cadence picks up.

## Build, Lint & Test

TBD — testing framework and linting/formatting conventions haven't been decided yet (see `TECH-STACK.md` § Not Yet Decided). Fill in real commands here once those are settled and the monorepo's `turbo.json` pipeline is in place.

## Deployment

- **Web**: automatic via Netlify on every PR (preview) and on merge to `main` (production).
- **Mobile**: EAS Update publishes a JS-only preview on every PR; a full EAS Build (iOS) runs on merge to `main` or manually. See `TECH-STACK.md` § CI/CD for the full breakdown.
