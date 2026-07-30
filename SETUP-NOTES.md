# Setup Notes

## How to use this document

If you're reusing this tech stack (React, React Native/Expo, Supabase, Tailwind, HeroUI, Turborepo, pnpm) for a **different** project, don't start from `TECH-STACK.md` prose alone. Copy this repo's actual working root-level config files as your literal starting point:

- `tsconfig.base.json`
- `eslint.config.mjs` + `.prettierrc.json` + `.prettierignore`
- `turbo.json`
- `pnpm-workspace.yaml`
- The scaffolding patterns in `apps/web` and `apps/mobile` (Vite config, Metro config, `packages/ui`'s platform-file split)

Then **re-verify everything empirically** — install, typecheck, lint, build, actually run it — before assuming any of it still works as-is. Dependency versions will have moved on since this was built, and this document deliberately does not list exact version pins (the `react-native-worklets` version required here, the ESLint major version that worked, HeroUI's exact current setup steps) because those are near-certain to be wrong by the time you read this. Trusting an old pin (or a search result) without checking is exactly what caused a real bug during this project's setup — don't repeat it.

What follows are the structural lessons that are likely to still hold regardless of exact versions, because they're about how these tools fundamentally interact, not about which version of what is current.

## Durable structural lessons

**ESLint's flat config doesn't cascade across nested directories.** The old `.eslintrc` format merged config from every parent directory up to the root; flat config (`eslint.config.js`/`.mjs`) uses only the *nearest* config file to the file being linted, full stop. A scaffolded app whose `tsconfig.json`/`eslint.config` extends a framework's own base config (e.g. `expo/tsconfig.base`) will not automatically also get your shared root config — you have to explicitly re-compose it in that app's own config file. Watch for plugin key collisions when doing this: if your root config and a framework's bundled config (e.g. `eslint-config-expo`) both register `eslint-plugin-import` under the same `import` key, ESLint throws a hard "cannot redefine plugin" error. The fix is to build the app-specific config on top of the framework's bundled config (which already includes its own working plugin registrations) and layer only the *additional rules* you want, rather than spreading both full configs together.

**TypeScript and web bundlers don't understand React Native's platform-file convention automatically.** Metro resolves `Button.web.tsx` / `Button.native.tsx` out of the box. Nothing else does:
- Vite needs `resolve.extensions` configured to try `.web.tsx`/`.web.ts` etc. before the plain extensions.
- TypeScript needs `moduleSuffixes: [".web", ".native", ""]` set, or `tsc` can't resolve an extensionless import to either platform file at all.
- TypeScript configs don't cascade the same way flat ESLint doesn't — every app that transitively resolves a shared package using this pattern needs `moduleSuffixes` in its own tsconfig, not just the shared package's. If an app's tsconfig extends a framework base instead of your own, use TypeScript's multi-target `extends` array (`"extends": ["expo/tsconfig.base", "../../tsconfig.base.json"]`) to get both.

**Prettier's ignore file doesn't behave like `.gitignore`.** `--ignore-path` only looks at the exact file path given — it doesn't walk up parent directories the way ESLint's flat config resolution does, and it doesn't inherit `.gitignore`'s patterns automatically. Any generated or native-build output needs to be explicitly listed:
- Expo's regenerated `ios`/`android` folders (from `expo prebuild` / `expo run:ios`) contain hundreds of thousands of files (CocoaPods, xcframeworks, debug symbols) — without an explicit exclude, a formatting check will silently churn for minutes scanning them.
- Auto-generated type declaration files (Uniwind's `uniwind-types.d.ts`, Expo's `expo-env.d.ts`) will keep getting flagged on every regeneration if not excluded, since their formatting is out of your control.

**pnpm's build-script approval gate trips on legitimate dependencies, not just suspicious ones.** Expect `[ERR_PNPM_IGNORED_BUILDS]` prompts for things like native resolver binaries or polyfill libraries pulled in transitively by packages you deliberately chose (e.g. a TypeScript-aware import resolver, or a `core-js` polyfill several layers deep in a caching library's dependency tree). Run `pnpm why <package>` to confirm the chain before approving — but a real, traceable chain back to something you actually installed is normal, not a red flag.

**EAS project linking requires exact slug agreement.** `eas init --id <project-id>` fails outright if the local `app.json`'s `slug` doesn't match the slug already registered for that project ID on EAS's side. Align `app.json` first rather than force-overwriting the server-side project.

**The iOS bundle identifier is only cheap to change before the first real Apple registration.** Simulator builds never touch Apple's systems at all — no App ID gets registered. The moment a real-device build, TestFlight submission, or App Store submission happens, the bundle identifier becomes expensive to change (a new App ID, no continuity with anything already shipped). If you're going to rename it to match your own domain instead of an auto-generated default, do it before that first real build.

**Claude Code's project-scoped `.mcp.json` must live at the actual session's project root.** Not in any subdirectory of a monorepo — Claude Code doesn't recursively search for nested `.mcp.json` files. It also isn't hot-reloaded; adding or moving one requires restarting the session before `/mcp` will show it.

**`packages/shared`'s deliberately scoped `lib: ["ES2022"]` (no DOM, no Node types) means `console` doesn't type-check there.** This is intentional — the package is meant to stay environment-agnostic between the browser (web) and React Native (mobile), and adding `dom` or `@types/node` to get `console` typed would loosen that boundary for every future addition, not just the one that needed it. Any shared function that wants to log or touch another DOM/Node-only global should return a plain result instead and let the calling app (which does have the right lib/globals) handle the side effect. Ran into this immediately when adding a Supabase connectivity check that originally called `console.log` directly inside `packages/shared`.

**First `supabase start` prints many `Error response from daemon: toomanyrequests: Rate exceeded` lines while pulling images — this is Docker Hub/ECR registry throttling on individual layers, not a real failure.** Docker retries automatically and the pull still completes; the run only actually fails if the final `supabase status` JSON doesn't print. Don't kill the process on these lines, and expect the first run to take a while (several GB across ~15 images) regardless.

**`expo/expo-github-action`'s `token` input fails silently if the underlying secret's value is blank.** Setting an empty/whitespace-only `EXPO_TOKEN` GitHub secret doesn't error at secret-creation time or at the action's "with:" step — the setup step just logs `Skipped authentication: 'token' not provided.` and continues (looking like a successful step), and the actual failure only surfaces later, in a downstream step like `expo-github-action/preview`, as `An Expo user account is required to proceed.` The tell in the logs: a genuinely-populated secret input prints as `token: ***` (masked) in the step's `with:` block; a blank one doesn't print the key at all. Re-running `gh secret set EXPO_TOKEN` with a careful paste (no stray newline/whitespace) fixed it.

**A brand-new Expo SDK can outpace Expo Go's own app-store release, and the resulting error looks exactly like an EAS Update misconfiguration.** Scanning an EAS Update preview QR code (or even a plain `expo start` dev-server QR code) in Expo Go said "no app to see" / prompted to update Expo Go, even though Expo Go was already on its latest app-store version. Spent real effort chasing this as a `runtimeVersion`/`updates.url` config problem (app.json really was missing both — that was a real, separate, legitimately-needed fix via `eas update:configure` — see the commit adding `expo-updates` + `runtimeVersion`/`updates.url`/channels). But the actual blocker was simpler: Expo Go's Settings/Profile tab shows a "Supported SDK" version, and at the time this project was scaffolded (SDK 57), the published Expo Go app only supported up to SDK 54 — a real lag between an SDK's release and Expo Go's own binary catching up, entirely outside this repo's control. **Check Expo Go's reported Supported SDK against the project's actual SDK version first**, before assuming any `app.json`/`eas.json` config is wrong. If they don't match, your options are: wait for Expo Go's next app-store update, use a custom development build instead (works around Expo Go's version entirely — free for Android via a plain installable APK, but for iOS needs a paid Apple Developer account for a real device, or Simulator-only if free), or just use Simulator/Emulator for local dev in the meantime (unaffected, since it never goes through the separate Expo Go app at all).

## What's deliberately not here

A separate genericized template/boilerplate repo. That's worth building once there's an actual second project providing real signal on what needs to be parameterized (naming, bundle IDs, package scopes) versus what can stay fixed — not speculatively, for one hypothetical future project.
