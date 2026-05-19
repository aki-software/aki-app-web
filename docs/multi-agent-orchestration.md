# Multi-Agent Orchestration Plan — Platform Refactor 2026

> **Purpose:** Coordinate parallel work across 3 specialized agents without conflicts.
> **Created:** 2026-05-15 | **Status:** Active

---

## Agent Roles

| Agent | Skill | Domain | Branch Prefix |
|-------|-------|--------|---------------|
| **API Agent** | `akit-api-refactor` | `apps/api/src/` | `refactor/api-*` |
| **Web Agent** | `akit-web-refactor` | `apps/web/src/` | `refactor/web-*` |
| **Android Agent** | `akit-android-refactor` | `CotejoApp/app/src/` | `refactor/android-*` |

---

## Parallel Execution Matrix

### Week 1-2: Independent Work (NO conflicts possible)

| Agent | Phase | Branch | Files Modified | Conflicts |
|-------|-------|--------|----------------|-----------|
| API Agent | Phase 2 (Quick Wins) | `refactor/api-quick-wins` | `apps/api/src/app.*`, `common/adapters/`, `common/utils/`, `common/services/`, `users/dto/` | None |
| Web Agent | Phase 5 (Hooks) | `refactor/web-hooks` | `apps/web/src/features/dashboard/hooks/`, `apps/web/src/hooks/` | None |
| Android Agent | Phase 3 (Quick Wins) | `refactor/android-quick-wins` | `CotejoApp/app/src/main/java/com/akit/app/util/`, `domain/model/`, `data/remote/` | None |

### Week 2-3: Contracts Sync (coordination needed)

| Agent | Phase | Branch | Files Modified | Conflicts |
|-------|-------|--------|----------------|-----------|
| API Agent | Phase 1 (Contracts) | `refactor/contracts-package` | `packages/contracts/src/`, `apps/api/src/auth/`, `apps/api/src/sessions/` | ⚠️ Shared |
| Web Agent | Phase 1 (Contracts) | `refactor/contracts-package` | `packages/contracts/src/`, `apps/web/src/features/` | ⚠️ Shared |
| Android Agent | Phase 1 (Contracts) | `refactor/contracts-package` | `packages/contracts/src/`, `CotejoApp/contracts/` | ⚠️ Shared |

**Coordination rule:** API Agent leads Phase 1. Web y Android agents consumen los contracts una vez mergeados.

### Week 3-4: Independent Work (NO conflicts possible)

| Agent | Phase | Branch | Files Modified | Conflicts |
|-------|-------|--------|----------------|-----------|
| API Agent | Phase 8 (Circular Deps) | `refactor/api-circular-deps` | `apps/api/src/common/`, `apps/api/src/vouchers/`, `apps/api/src/sessions/` | None |
| Web Agent | Phase 6 (Components) | `refactor/web-components` | `apps/web/src/components/`, `apps/web/src/features/dashboard/components/` | None |
| Android Agent | Phase 4 (Critical Fixes) | `refactor/android-critical-fixes` | `CotejoApp/app/src/main/java/com/akit/app/data/remote/`, `domain/flow/`, `data/auth/` | None |

### Week 4-6: Independent Work (NO conflicts possible)

| Agent | Phase | Branch | Files Modified | Conflicts |
|-------|-------|--------|----------------|-----------|
| API Agent | Phase 9 (God Services) | `refactor/api-god-services` | `apps/api/src/common/jobs/`, `apps/api/src/sessions/services/` | None |
| Web Agent | Phase 10 (Testing) | `refactor/web-testing` | `apps/web/src/**/*.test.ts`, `vitest.config.ts` | None |
| Android Agent | Phase 7 (God Classes) | `refactor/android-god-classes` | `CotejoApp/app/src/main/java/com/akit/app/ui/`, `domain/usecase/` | None |

---

## Conflict Prevention Rules

### Rule 1: File Ownership

Cada agente SOLO modifica archivos en su dominio:

- API Agent: `apps/api/` + `packages/contracts/` (solo types de API)
- Web Agent: `apps/web/` + `packages/contracts/` (solo types de Web)
- Android Agent: `CotejoApp/` + `packages/contracts/` (solo types de Android)

### Rule 2: Contracts Package Protocol

1. API Agent crea los types en `packages/contracts/src/`
2. API Agent mergea a `develop`
3. Web Agent y Android Agent pull de `develop` y consumen los types
4. NO editar contracts simultáneamente

### Rule 3: Branch Sync

Cada agente debe hacer `git merge develop` en su rama al menos cada 2 días para evitar drift.

### Rule 4: PR Size

- Máximo 400 líneas por PR
- Si un cambio es más grande, split en múltiples PRs
- Cada PR debe ser reviewable en < 15 minutos

### Rule 5: Test Requirement

Cada PR debe incluir tests para el código nuevo o modificado.

- API Agent: Jest tests en `apps/api/src/**/*.spec.ts`
- Web Agent: Vitest tests en `apps/web/src/**/*.test.ts`
- Android Agent: JUnit tests en `CotejoApp/app/src/test/`

---

## Agent Invocation Protocol

### Starting a Phase

```
1. User dice: "Empezar Fase X con [agent]"
2. Agent loads its skill
3. Agent creates branch from develop
4. Agent implements the phase tasks
5. Agent creates PR
6. Agent waits for review
```

### Switching Between Phases

```
1. User dice: "Siguiente fase para [agent]"
2. Agent checks current branch status
3. Agent merges develop into current branch
4. Agent creates new branch for next phase
5. Agent implements next phase tasks
```

### Parallel Execution

```
1. User dice: "Ejecutar en paralelo: Fase 2 (API), Fase 5 (Web), Fase 3 (Android)"
2. Launch 3 sub-agents with their respective skills
3. Each agent works on its own branch
4. Each agent creates its own PR
5. User reviews and merges each PR independently
```

---

## CI/CD per Agent

### API Agent CI

```yaml
test-api:
  runs-on: ubuntu-latest
  steps:
    - pnpm install
    - pnpm turbo run test --filter=api
    - pnpm turbo run lint --filter=api
    - pnpm turbo run build --filter=api
```

### Web Agent CI

```yaml
test-web:
  runs-on: ubuntu-latest
  steps:
    - pnpm install
    - pnpm turbo run test --filter=web
    - pnpm turbo run lint --filter=web
    - pnpm turbo run build --filter=web
```

### Android Agent CI

```yaml
test-android:
  runs-on: ubuntu-latest
  steps:
    - ./gradlew test --project-dir CotejoApp
    - ./gradlew lint --project-dir CotejoApp
    - ./gradlew assembleDebug --project-dir CotejoApp
```

---

## Merge Order

```
develop
  │
  ├── [1] refactor/contracts-package          ← API Agent leads
  │
  ├── [2] refactor/api-quick-wins             ← API Agent
  ├── [2] refactor/web-hooks                  ← Web Agent (parallel)
  ├── [2] refactor/android-quick-wins         ← Android Agent (parallel)
  │
  ├── [3] refactor/api-circular-deps          ← API Agent
  ├── [3] refactor/web-components             ← Web Agent (parallel)
  ├── [3] refactor/android-critical-fixes     ← Android Agent (parallel)
  │
  ├── [4] refactor/api-god-services           ← API Agent
  ├── [4] refactor/web-testing                ← Web Agent (parallel)
  └── [4] refactor/android-god-classes        ← Android Agent (parallel)
```

Numbers indicate merge order within each wave. Items with the same number can merge in any order (no conflicts).

---

## Communication Protocol

### Agent-to-Agent (via user)

Los agentes NO se comunican directamente. El usuario es el orchestrator:

- User relays contract changes from API Agent to Web/Android Agents
- User coordinates merge order
- User resolves conflicts if any arise

### Status Updates

Cada agente debe reportar al finalizar cada task:

```
✅ Completed: [task description]
📁 Files modified: [list]
🧪 Tests added: [count]
📝 Next: [next task]
```

### Blocking Issues

Si un agente encuentra un blocking issue:

```
🚫 BLOCKED: [description]
📋 Needs: [what's needed to unblock]
⏸️ Waiting for: [which agent/phase]
```

---

## Rollback Plan

Si un merge rompe producción:

1. **API:** Revert Docker image al tag anterior
2. **Web:** Revert CDN deploy al commit anterior
3. **Android:** Publicar hotfix patch (no hay rollback en Play Store)

Cada agente debe tener su rollback documentado en el PR.
