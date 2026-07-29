# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read these first

This project is documented in depth already — read the relevant one before assuming you need to re-derive something:

- **`REQUIREMENTS.md`** — the product: data model (Project > Subproject > Task), V1/V2 scope.
- **`ROADMAP.md`** — build order, including a **Step 0 checklist tracking current scaffolding status**. Check this before starting new work — it's the source of truth for what's actually done versus what's next.
- **`TECH-STACK.md`** — architecture decisions and why (including why this project uses React/React Native/Supabase/Netlify rather than Improving's Microsoft/Azure default — that was an explicit, deliberate override, not an oversight).
- **`SETUP-NOTES.md`** — durable structural gotchas in this tool combination (ESLint flat config, TypeScript/Vite platform-file resolution, Prettier ignore behavior, pnpm build approvals, EAS linking). Read before fighting one of these tools for a while — it's likely already been debugged once.
- **`README.md`** — day-to-day setup and dev workflow.

## Keep documentation in sync

When a change in a session affects something already documented — a new or changed tech-stack decision, a requirements/scope change, a newly-discovered durable gotcha, a completed or added build step — update the relevant doc in the **same session**, not as a follow-up:

- Tech/architecture decision changed or added → `TECH-STACK.md`
- Product requirement or data model changed → `REQUIREMENTS.md`
- Build step completed, added, or reordered → `ROADMAP.md`'s checklist
- A real, durable setup gotcha found while building → `SETUP-NOTES.md`

Docs and code silently drifting apart is worse than a doc not existing at all — it actively misleads. If you're not sure whether a change is significant enough to document, ask rather than skip it.

## Commands

- `pnpm install` — install everything (pnpm workspaces + Turborepo monorepo).
- `pnpm dev:web` / `pnpm dev:mobile` — run the web (Vite) or mobile (Expo) app locally.
- `pnpm typecheck` / `pnpm lint` / `pnpm test` / `pnpm build` — run across every package via Turborepo; scope to one with `--filter=<name>` (e.g. `pnpm --filter web lint`).

## Architecture notes that span multiple files

**Cross-platform shared components (`packages/ui`) require a specific pattern.** A component like `Button` is split into `Button.web.tsx` (wraps `@heroui/react`) and `Button.native.tsx` (wraps `heroui-native`), sharing one props interface. Metro resolves this platform-file convention automatically for `apps/mobile`, but nothing else does by default: `apps/web`'s `vite.config.ts` has an explicit `resolve.extensions` prioritizing `.web.*`, and the root `tsconfig.base.json` sets `moduleSuffixes` so `tsc` can resolve it too. Adding a new shared component means following this same three-piece pattern — skipping the Vite/TypeScript config means it'll work in `apps/mobile` and silently fail to resolve everywhere else.

**Derived logic lives in `packages/shared`, not Postgres.** Subproject/project status, actual dates, and cost/progress rollups are plain, pure TypeScript functions operating on already-fetched rows — not database views or functions. This was a deliberate choice (see `TECH-STACK.md` § Backend/Database/Auth) specifically for testability; Postgres is scoped to raw storage, constraints, and RLS. Don't move this logic into the database "to be more efficient" — that tradeoff was already considered and rejected at this project's scale.

**Schema changes always go through `supabase/migrations/`**, never a direct/uncaptured SQL execution — see `README.md` § Database Migrations for the exact command sequence.
