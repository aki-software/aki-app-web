---
name: akit-git-worktree
description: >
  Git Worktree protocol for parallel agent work in the akit-platform monorepo.
  Trigger: When an orchestrator is launching parallel agents, when an agent worker
  receives a worktree path as context, or when any agent needs to understand
  isolation and branching rules in this repository.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- An orchestrator is spawning one or more worker agents simultaneously
- A worker agent receives a filesystem path (not the base repo) as its workspace
- Any agent needs to create a branch and work without disturbing other in-progress work

---

## Critical Patterns

### Two-Layer Protocol

Responsibility is strictly divided. Never mix these roles:

| Role | Creates worktree | Works in worktree | Removes worktree |
|---|---|---|---|
| **Orchestrator** | ✅ Yes | ❌ No | ✅ Yes |
| **Worker Agent** | ❌ Never | ✅ Yes | ❌ Never |

The worker agent must never run `git worktree add` or `git worktree remove`. It receives a path and a branch name as context and operates exclusively within that directory.

### Folder Convention

```
C:\Dev\Personal\A.kit\
  akit-platform\              ← base repo (orchestrator / human)
  akit-worktrees\
    <task-slug>\              ← one directory per active agent/task
```

**Naming:** `task-slug` must be short, lowercase, hyphenated, and describe the task scope:
- `feat-api-auth`
- `feat-site-landing`
- `fix-web-billing`
- `chore-contracts-v2`

### Lockfile Rule (CRITICAL)

`pnpm-lock.yaml` lives at the monorepo root and is shared across all worktrees via the shared `.git` object store.

- **Do NOT** modify `pnpm-lock.yaml` manually — ever.
- **Do NOT** run `pnpm add` / `pnpm install <package>` unless the task explicitly requires a new dependency.
- If a new dependency is required: notify the orchestrator before running `pnpm add`, so it can coordinate with other active worktrees to prevent lockfile merge conflicts.
- Running `pnpm install --frozen-lockfile` at worktree setup is always safe and required.

### Ownership by Agent Type

| Agent type | Primary paths | Must not touch |
|---|---|---|
| UX / Site agent | `apps/site/**` | `apps/api/**`, `packages/contracts/**` |
| UI / Web agent | `apps/web/**`, `packages/design-tokens/**` | `apps/api/**`, `packages/contracts/**` |
| Code / API agent | `apps/api/**`, `packages/contracts/**` | `apps/site/**`, `apps/web/**` |
| Full-stack agent | Any path relevant to the task | Paths outside the defined task scope |

Any change to `packages/contracts` must be coordinated with the orchestrator, as it affects all apps simultaneously.

---

## Orchestrator: Worktree Lifecycle

### Creating a worktree for a worker agent

```bash
# From the base repo directory (akit-platform)
git worktree add ..\akit-worktrees\<task-slug> <branch-name>
```

If the branch does not exist yet, create it from the current `dev` or `main`:

```bash
git worktree add -b feat/<task-slug> ..\akit-worktrees\<task-slug> dev
```

Then pass the worktree path and branch name to the worker agent's prompt as context.

### Removing a worktree after merge

```bash
# After the branch has been merged and the agent is done
git worktree remove ..\akit-worktrees\<task-slug>

# If the remove fails due to uncommitted changes, force it:
git worktree remove --force ..\akit-worktrees\<task-slug>

# Prune stale worktree metadata if needed
git worktree prune
```

### Checking active worktrees

```bash
git worktree list
```

---

## Worker Agent: Operating in an Assigned Worktree

### Setup (run once at start of task)

```bash
# Navigate to the assigned worktree path (provided by orchestrator)
cd <worktree-path>

# Install dependencies using the frozen lockfile — never update it
pnpm install --frozen-lockfile
```

### Development cycle

```bash
# Work, edit files, run dev servers as needed
pnpm --filter <app-name> dev

# Build to verify before committing
pnpm --filter <app-name> build
```

### Committing and pushing

```bash
# Stage only files within your ownership scope
git add <files>

# Conventional commits only
git commit -m "feat(api): add JWT refresh endpoint"

# Push — the branch already exists (orchestrator created it)
git push origin <branch-name>
```

### Notifying the orchestrator

When the task is complete:
1. Ensure all changes are committed and pushed
2. Do NOT open the PR yourself unless explicitly instructed
3. Notify the orchestrator with: branch name, summary of changes, and any files that may conflict with other active worktrees (especially `pnpm-lock.yaml` or `packages/contracts/**`)

---

## Commands Reference

```bash
# Orchestrator: create worktree on existing branch
git worktree add ..\akit-worktrees\<task-slug> <branch>

# Orchestrator: create worktree with new branch from dev
git worktree add -b feat/<task-slug> ..\akit-worktrees\<task-slug> dev

# Orchestrator: list all worktrees
git worktree list

# Orchestrator: remove worktree after merge
git worktree remove ..\akit-worktrees\<task-slug>

# Orchestrator: prune stale metadata
git worktree prune

# Worker: safe install (never updates lockfile)
pnpm install --frozen-lockfile

# Worker: build a specific app
pnpm --filter api build
pnpm --filter web build
pnpm --filter @akit/site build

# Worker: run tests for a specific app
pnpm --filter api test
pnpm --filter web test
```

---

## Anti-patterns (Never Do)

| Anti-pattern | Why |
|---|---|
| `git checkout <branch>` inside any worktree | Changes the branch of THAT worktree, potentially destroying uncommitted work |
| `git worktree add` from a worker agent | The worker never controls its own lifecycle |
| `pnpm add <package>` without notifying orchestrator | Creates lockfile conflict with other active worktrees |
| Editing files outside your ownership scope | Creates cross-agent merge conflicts |
| Opening a PR from inside the worktree without orchestrator approval | Bypasses coordination |
