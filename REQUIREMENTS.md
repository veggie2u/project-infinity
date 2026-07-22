# project-infinity Requirements

## 1. Overview

Existing todo apps (Reminders, Things) are too simple for multi-step projects — they have no concept of subprojects, no cost tracking, and no sense of planned vs. actual progress. Trello gets closer with its board/card model, but doesn't natively support dates, budgets, or a simple list view. Jira is built for software teams and carries far more complexity than a personal or household project needs.

project-infinity sits between these: a project tracking app built around a fixed three-level hierarchy (Project > Subproject > Task), with built-in cost tracking (estimated vs. actual) and date tracking (planned vs. actual), rendered through multiple views depending on device and preference — starting with a simple list view, with richer views (Kanban board, spreadsheet/table) added later.

It will ship as both a web app and a mobile app, so the same data needs to work across different screen sizes and view types. No tech stack decisions have been made yet — this document is product requirements only.

## 2. Core Concepts / Data Model

### User
- Has an account and owns Projects.
- No sharing or collaboration in V1 — every project is private to its owner. Multi-user support (inviting others, shared projects) is a later addition, not V1.

### Project
Example: "Home Remodel"

- Name, description.
- Contains one or more Subprojects.
- Always has at least one default subproject, **"Project Tasks"**, auto-created when the Project is created. This gives every project a place to put tasks that don't warrant their own subproject.
  - The default subproject is visible and renamable, just like any user-created subproject.
  - It is flagged `isDefault: true` and visually pinned/marked in the UI (e.g., listed first with a small "default" indicator).
  - Subprojects with `isDefault: true` cannot be deleted, guaranteeing every Project always has somewhere to add a task.
- Status: derived, not manually set. Not Started / In Progress / Finished, computed by rolling up subproject statuses using the same rule subprojects use for their tasks (see below).
- Rollup dashboard: aggregates all subprojects' progress (tasks done vs. total) and cost (budget vs. planned vs. actual) into a single project-level summary.
- Soft delete: flagged `isDeleted`, hidden from view by default. Recoverable in a future version — V1 does not need to build a recovery/restore UI, just avoid permanently destroying the data.

### Subproject
Examples: "Bathroom", "New Shed", "Project Tasks"

- Name, description.
- Planned start date (optional), planned end date (optional).
- Actual start date — derived automatically, set the first time the subproject's status leaves Not Started.
- Actual end date — derived automatically, set when the subproject's status becomes Finished.
- Budget: an optional target dollar figure, separate from and comparable against the sum of its tasks' estimated costs. This gives three numbers to compare: budget, planned (sum of task estimates), and actual (sum of task actual costs).
- Contains one or more Tasks.
- Status — derived automatically from its tasks, not manually set:
  - **Not Started**: zero tasks, or all tasks are Not Started.
  - **In Progress**: at least one task is In Progress or Done, but not all tasks are Done.
  - **Finished**: at least one task exists and all tasks are Done.
  - Display nuance: a subproject with zero tasks shows "No tasks yet" instead of the literal "Not Started" label. This is cosmetic only — the underlying status value is the same, and the rule applies uniformly to every subproject, including the default one. No special-casing is needed for the default subproject's empty state.
- Rollup stats (computed, not stored): tasks done vs. total (a straight, unweighted count — no task carries more weight than another), sum of task actual costs, sum of task estimated costs, budget vs. actual variance.
- Soft delete: flagged `isDeleted`, same pattern as Project. Does not apply to the default subproject, since it can never be deleted.

### Task

- Name, description (optional).
- Status: Not Started / In Progress / Done. Set directly by the user — a task is the leaf node of the hierarchy, so nothing below it to derive status from.
- Due date (optional, planned).
- Completed date — set automatically when the task is marked Done.
- Estimated cost (optional).
- Actual cost (optional) — entered as the cost is incurred.
- Belongs to exactly one Subproject. A task is never shared across subprojects, and is never attached directly to a Project without going through the default "Project Tasks" subproject.
- Hard delete: a task can be permanently deleted, even if it has dates or costs recorded, after an "are you sure" confirmation dialog. Unlike subprojects and projects, there is no soft-delete or recovery for tasks — sometimes a task was created by mistake or the plan changed, and it should just go away.

## 3. V1 Scope

- Single-user ownership per project. No sharing, invites, or task assignment.
- Fixed three-level hierarchy (Project > Subproject > Task). No further nesting in either direction — tasks cannot have subtasks, and subprojects cannot contain other subprojects.
- Every Project always has at least the default "Project Tasks" subproject.
- Tasks have a 3-state status, a due date, a completed date, and estimated/actual cost.
- Subprojects have planned dates, derived actual dates, a budget field, and a description.
- Status and actual dates are fully derived from the tasks/subprojects beneath them — no manual override in V1.
- A single, unspecified currency. No multi-currency support, no currency selector.
- A project-level rollup dashboard aggregating all subprojects' progress and cost.
- List view only for V1. Other fields (dates, costs, description) are reached by navigating into a task or subproject's detail screen, rather than shown inline in the list.
- Deletion: tasks are hard-deleted with a confirmation dialog; subprojects and projects are soft-deleted (`isDeleted`), hidden from normal views but not yet recoverable through any UI (recovery UI is a post-V1 feature).

## 4. Explicitly Deferred (Post-V1)

- Sharing projects, inviting collaborators, or assigning tasks to other people.
- Task dependencies (one task blocking another). Wanted eventually, but when built, dependencies must be optional — never a required part of using the app.
- Kanban board view (Not Started / In Progress / Finished columns).
- Spreadsheet/table view (web only).
- Cost categories (materials, labor, permits, etc.).
- Receipt/photo attachments on cost entries.
- Recovery/restore UI for soft-deleted subprojects and projects.
- Manual override of subproject/project status or actual dates.

## 5. Out of scope (Not doing)

- Templates or reusable subprojects.
- Offline mobile support.

## 6. Not Yet Discussed

- **Planning/research phase**: before or alongside doing the work, a user may want to research and decide what a subproject actually involves — comparing materials, researching costs, collecting visual references or inspiration (e.g., deciding on a faucet style before "Buy faucet" becomes a task with a real estimated cost). How this fits into the model — notes on the subproject, a distinct pre-task research item, something else entirely — has not been discussed yet and needs its own conversation before it's added to these requirements.
