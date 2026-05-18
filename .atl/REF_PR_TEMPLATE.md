# Refactor Pull Request Template

## 1. Context
- **Phase:** [e.g., Phase 2: API Quick Wins]
- **Task:** [e.g., 2.1 Remove app.controller.ts]
- **Master Plan Reference:** `docs/refactor-platform-2026.md`

## 2. Changes
- [ ] List technical change 1
- [ ] List technical change 2
- [ ] Removed/Deprecated code

## 3. Architecture & Contracts
- **Contract Impact:** [Does this affect @akit/contracts? Yes/No]
- **Breaking Changes:** [List if any]
- **Dependency Changes:** [e.g., Removed forwardRef between X and Y]

## 4. Verification & Testing
- **Test Strategy:** [e.g., Unit tests for new service, E2E for critical flow]
- **New Tests:** [Path to new spec files]
- **Manual Verification:** [Describe manual checks performed]

## 5. Pre-Merge Checklist
- [ ] `pnpm build` successful in affected apps/packages
- [ ] `pnpm lint` successful
- [ ] Test coverage for refactored logic > 70%
- [ ] No new circular dependencies introduced
- [ ] Types synchronized with `@akit/contracts`
- [ ] No `console.log` or debug code
