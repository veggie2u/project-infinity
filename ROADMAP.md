# project-infinity Build Roadmap

This is a working roadmap, not a fixed contract — steps are meant to be built one at a time, checked and tested, and adjusted as earlier steps reveal issues with the plan.

## Step 0: Scaffolding & Setup

Infrastructure/plumbing that has to exist before V1 step 1 (bare Project creation) can be built — no real features yet, just getting the monorepo, both apps, and Supabase running end-to-end. See `TECH-STACK.md` and `SETUP-NOTES.md` for the reasoning and gotchas behind each piece.

- [x] **0.1 Monorepo skeleton + `apps/web`** — pnpm workspaces, Turborepo, root configs (ESLint/Prettier/tsconfig), Vite + React + Tailwind v4 + HeroUI, running locally.
- [x] **0.2 `apps/mobile`** — Expo scaffolded, Tailwind/Uniwind + HeroUI Native wired up, Metro configured, confirmed running (web target verified directly; native iOS build confirmed working on-device by the user after an initial stall).
- [x] **0.3 `packages/shared` + `packages/ui`** — real package setup, Supabase client factory (no real data hooks yet — no schema exists), one representative `Button` wrapper proving the cross-platform (`@heroui/react`/`heroui-native`) and cross-bundler (Vite/Metro) resolution actually works. Both apps wired to consume it.
- [ ] **0.4 Supabase connected** — local `supabase init`, env vars pointing at the existing hosted project, a trivial connectivity check. **Next up.**
- [ ] **0.5 GitHub Actions CI** — typecheck/lint/test/build running via Turborepo on every PR.
- [x] **0.6 Netlify connected** — site created, base directory `apps/web`, build passing.
- [x] **0.7 EAS configured** — `eas init` linked to the project's EAS project ID, `app.json` slug/bundle identifier aligned.

## V1: Tasks Mode

Tasks mode (the Project > Subproject > Task hierarchy described in `REQUIREMENTS.md`) ships first. It's self-sufficient on its own and doesn't depend on Planning mode existing.

1. **Accounts + bare Project** — user signs up/logs in, creates a Project (name + description only). No subprojects or tasks yet.
2. **Subprojects (basic)** — create subprojects under a Project (name + description only), including auto-creating the default "Project Tasks" subproject (`isDefault: true`, non-deletable). List view of subprojects.
3. **Tasks (basic)** — create tasks under a subproject (name, description, 3-state status only). List view of tasks, manual status toggling.
4. **Task dates** — due date + completed date (auto-set when marked Done).
5. **Task costs** — estimated cost + actual cost fields.
6. **Subproject status & progress rollup** — derive subproject status (Not Started/In Progress/Finished) from task statuses; show tasks-done-vs-total, with the "No tasks yet" display nuance for empty subprojects.
7. **Subproject dates** — planned start/end (manual, optional) + actual start/end (derived automatically from status transitions).
8. **Subproject budget & cost rollup** — budget field, sum of task estimates, sum of task actuals, variance vs. budget.
9. **Project-level dashboard** — aggregate all subprojects' progress and cost into one summary; derive Project status from subproject statuses.
10. **Deletion** — task hard-delete with confirmation dialog; subproject/project soft-delete (`isDeleted`).

## V2: Planning Mode

Intentionally out of scope for this roadmap. Planning mode (the Idea concept described in `REQUIREMENTS.md` section 7) depends on Tasks mode existing — an Idea can be promoted into a Task, which requires Tasks mode to already be built. It gets its own roadmap once V1 is stable.
