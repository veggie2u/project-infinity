# project-infinity Requirements

## 1. Overview

Existing todo apps (Reminders, Things) are too simple for multi-step projects — they have no concept of subprojects, no cost tracking, and no sense of planned vs. actual progress. Trello gets closer with its board/card model, but doesn't natively support dates, budgets, or a simple list view. Jira is built for software teams and carries far more complexity than a personal or household project needs.

project-infinity sits between these: a project tracking app built around a fixed three-level hierarchy (Project > Subproject > Task), with built-in cost tracking (estimated vs. actual) and date tracking (planned vs. actual), rendered through multiple views depending on device and preference — starting with a simple list view, with richer views (Kanban board, spreadsheet/table) added later.

It will ship as both a web app and a mobile app, so the same data needs to work across different screen sizes and view types. No tech stack decisions have been made yet — this document is product requirements only.

**Release phases**: the app has two top-level modes — **Tasks mode** (Project > Subproject > Task, sections 2-5 below) and **Planning mode** (the pre-task research/idea-collection phase, section 7 below). Tasks mode ships as **V1**; Planning mode ships as **V2**. Tasks mode is self-sufficient on its own, while Planning mode's central feature — promoting an Idea into a Task — requires Tasks mode to exist first, so it can't come before it.

## 2. Core Concepts / Data Model

### User
- Has an account and owns Projects.
- No sharing or collaboration in V1 — every project is private to its owner. Multi-user support (inviting others, shared projects) is a later addition, not V1.

### Project
Example: "Home Remodel"

- Name, description.
- Contains one or more Subprojects.
- Always has at least one default subproject, **"Project Tasks"**, auto-created when the Project is created. This gives every project a place to put tasks that don't warrant their own subproject.
  - The default subproject is visible and can be renamed, just like any user-created subproject.
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

(none currently — see section 7 for the previously-open planning/research question, now resolved into a full design)

## 7. Planning Mode (V2)

Before someone gets to the point of creating tasks and buying materials, they need to figure out what they want — comparing options, researching costs, collecting links, Amazon items, articles, and images. This happens for the project as a whole at first (e.g., "Home Remodel"), before subprojects are even decided, and some of it later moves under a specific subproject once it's clear where it belongs.

This is a genuinely different kind of data than a Task: a Task is "work to be done" with a status and a cost, while a planning-stage item is "an option being considered" that may never turn into work at all (some inspiration images just inform the vibe of the project and never become a purchase).

### Concept: two modes

The app has two top-level modes the user switches between:
- **Tasks mode** — the existing Project > Subproject > Task hierarchy (sections 2-5). Functional, quick to use.
- **Planning mode** — built around a new concept, the **Idea**. More visual in nature (the content itself — images, link previews — is inherently visual), though it starts with a simple list view for the same incremental-view reasons Tasks mode does (see "Views" below).

### The Idea entity

- Title.
- Optional URL, optional image, optional notes, optional price.
- One Idea per option under consideration — no bundling multiple links/images into a single Idea. Comparing three faucet options means three separate Ideas, not one Idea with three links attached.
- Parent: a **Project** directly, or a **Subproject** — not the default "Project Tasks" subproject, since Ideas are a planning-stage concept independent of the task-organization hierarchy. An Idea can be created directly under a Project (before any subproject structure exists) and later **moved** to a new or existing Subproject once it's clear where it belongs.
- Status:
  - **Considering** — the default state for a new Idea.
  - **Chosen** — a distinct, manual milestone marking that this option has been decided on, independent of whether a Task has been created for it yet.
  - **Rejected** — an off-ramp available at any point. Rejected Ideas stay visible in Planning mode, visually distinguished (e.g., grayed out or struck through) rather than hidden or deleted, so the comparison history remains visible.
  - **Task Created** — set once at least one Task has been created from this Idea.
- Idea → Task: an Idea can produce **more than one Task** (e.g., a "Kohler faucet" Idea can spawn both a "Buy faucet" task and an "Install faucet" task). Creating a Task from an Idea does not consume or remove the Idea — the Idea persists, linked to the Task(s) it produced, so the original reference (link, photo) stays reachable even after the Task is Done.
- Assumption to revisit: Ideas soft-delete (`isDeleted`) like Subprojects/Projects rather than hard-delete like Tasks, consistent with keeping Rejected Ideas around as a decision record rather than discarding them. Not yet explicitly confirmed.

### Views

Planning mode's richer visual/gallery view (moodboard-style, image and link-preview forward) is not required on day one of building it out. Whichever version Planning mode ships in, it starts with a simple list of Ideas first (title, status, small thumbnail), with the richer gallery view added later — the same incremental-view philosophy already applied to Tasks mode's views.
