# Architecture Rules

## Agent Workflow (read this first)

Before starting any task, read:
- [**akit-git-worktree**](.agents/skills/akit-git-worktree/SKILL.md) — mandatory if working in parallel with other agents

### Repository Isolation Rules

- **Never** run `git checkout` inside the base repo `akit-platform` if other agents are active. Use a worktree.
- **Never** modify `pnpm-lock.yaml` manually. It is only updated by `pnpm install` after adding/removing a dependency.
- **Never** add a new dependency without notifying the orchestrator first.
- The orchestrator creates and removes worktrees. Worker agents only operate within an assigned path.

### Ownership by Agent Type

| Agent | Primary ownership | Must not touch |
|---|---|---|
| UX / Site | `apps/site/**` | `apps/api/**`, `packages/contracts/**` |
| UI / Web | `apps/web/**`, `packages/design-tokens/**` | `apps/api/**`, `packages/contracts/**` |
| Code / API | `apps/api/**`, `packages/contracts/**` | `apps/site/**`, `apps/web/**` |

Any change to `packages/contracts` must be coordinated with the orchestrator — it affects all apps.

---

## Frontend

- Atomic design
- Feature-first structure
- Tailwind + shadcn
- No business logic in UI

## Backend

- Hexagonal architecture
- CQRS where needed
- DTO validation mandatory
- Repository pattern

## Commits

- Conventional commits only
- Small, scoped commits
- No "Co-Authored-By" or AI attribution