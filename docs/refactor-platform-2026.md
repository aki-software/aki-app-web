# Platform Refactor 2026 — Spec & Master Plan

> **Status:** Draft | **Created:** 2026-05-15 | **Owner:** Platform Team
> **Scope:** API (backend), Web (frontend), Android (mobile), Contracts (shared)

---

## 1. Executive Summary

La plataforma A.kit tiene código en producción con problemas acumulados de arquitectura, duplicación, y falta de tests. Este documento especifica el plan de refactor completo para los 3 proyectos (API, Web, Android) + el paquete compartido de contratos.

### 1.1 Estado Actual

| Proyecto | Líneas | Tests | Problemas Críticos | Duplicaciones |
|----------|--------|-------|-------------------|---------------|
| **API** (NestJS) | ~6,500 | 3 specs (12 tests) | 4 dependencias circulares, 4 god services | 5+ patrones repetidos |
| **Web** (React+Vite) | ~4,200 | 0 tests | 0 tests, tipos desincronizados | 7+ funciones duplicadas |
| **Android** (Kotlin) | ~8,000 | 26 tests (~25%) | ANR risk, memory leak, token sin expiry | 3 enums duplicados |
| **Contracts** (shared) | ~500 | 0 tests | Tipos incompletos, no se usa en todos los clientes | — |

### 1.2 Objetivos

1. **Eliminar deuda técnica crítica** que pone en riesgo la estabilidad de producción
2. **Sincronizar contratos API** entre los 3 clientes (un solo source of truth)
3. **Establecer infraestructura de testing** con cobertura mínima del 70%
4. **Mejorar mantenibilidad** mediante eliminación de god classes y duplicación
5. **Preparar base para i18n** y escalabilidad futura

### 1.3 No-Objetivos

- No se agregan nuevas features durante el refactor
- No se cambia la UI/UX visible para el usuario final
- No se modifican endpoints de la API (solo tipos internos)
- No se cambia la base de datos (solo migraciones backward-compatible)

---

## 2. Current State Audit

### 2.1 API (apps/api/)

#### 2.1.1 Estructura Actual

```
src/
├── auth/           # 13 providers, over-engineered
├── categories/     # CRUD simple, bien
├── common/         # Cajón de sastre (violates SRP)
├── config/         # TypeORM config
├── database/       # Seeds
├── institutions/   # CRUD + analytics
├── mail/           # Templates pug + service
├── migrations/     # 12 migraciones
├── sessions/       # God service (302 líneas)
├── stats/          # Stats + access control
├── users/          # CRUD + registration
└── vouchers/       # CRUD + batch + query
```

#### 2.1.2 Problemas Críticos

| # | Problema | Archivos | Impacto |
|---|----------|----------|---------|
| C1 | 4 dependencias circulares con `forwardRef` | Auth↔Users, Users↔Institutions, Sessions↔Vouchers, Common↔Sessions | Boot lento, imposible testeo unitario limpio |
| C2 | `AuthService` facade innecesario | `auth/auth.service.ts` (60 líneas de delegación pura) | Complejidad sin valor |
| C3 | `JobDispatcherService` switch gigante | 265 líneas con switch de 3 casos | Viola SRP, difícil extender |
| C4 | `AdminDashboardService` 12 queries paralelas | 192 líneas | Bottleneck de performance |
| C5 | `ReportOrchestratorService` mezcla 6 responsabilidades | 235 líneas | Caché + locks + PDF + storage + email + DB |
| C6 | Scope filtering duplicado en 3 lugares | sessions, vouchers, stats | DRY violado, bugs de consistencia |
| C7 | In-memory state en producción | RateLimitService, ReportOrchestrator | Inconsistente en multi-instance |

#### 2.1.3 Testing Actual

| Archivo Spec | Tests | Cobertura Real |
|-------------|-------|----------------|
| `crypto.service.spec.ts` | 6 | CryptoService ✅ |
| `in-memory-queue.adapter.spec.ts` | 2 | InMemoryQueueAdapter ✅ |
| `account-activation-notifier.service.spec.ts` | 4 | Notifier parcial ✅ |
| `user-registration.service.spec.ts` | 4 | Solo happy paths ⚠️ |
| `app.e2e-spec.ts` | 5 | Endpoint fantasma (no existe por globalPrefix) ❌ |

**Cobertura estimada:** < 10% del código.

### 2.2 Web (apps/web/)

#### 2.2.1 Estructura Actual

```
src/
├── components/
│   ├── atoms/      # Button, Input, Alert, Spinner, Select, SuspenseWrapper
│   ├── molecules/  # StatCard, SearchInput, Pagination, DashboardWidget
│   ├── errors/     # AppErrorBoundary
│   └── providers/  # ThemeProvider
├── features/
│   ├── auth/       # Login, context, hooks, views
│   └── dashboard/  # Overview, sessions, vouchers, users, settings
├── hooks/          # Globales
├── router/         # React Router config
├── utils/          # date, storage
└── context/        # Auth context
```

#### 2.2.2 Problemas Críticos

| # | Problema | Archivos | Impacto |
|---|----------|----------|---------|
| C1 | **0 tests** | Todo el proyecto | Regresiones silenciosas garantizadas |
| C2 | `useVouchersManager` God Hook | 290 líneas | Imposible mantener, testear, o reutilizar |
| C3 | `VoucherTableRow` 346 líneas con lógica de negocio | Componente presentacional mezclado con actions | Viola separación de concerns |
| C4 | `computeHollandCode` triplicado | `sessions.api.ts` líneas 71, 114, 167 | DRY violado |
| C5 | `formatDate` triplicada | 3 archivos distintos | DRY violado |
| C6 | Tipos API locales desincronizados | `sessions.api.ts`, `vouchers.api.ts`, `institutions.api.ts` | Breaking changes silenciosos |
| C7 | `AuthContextValue` duplicado | 2 archivos | Confusión, posible divergencia |

#### 2.2.3 Componentes Reutilizables Faltantes

| Componente | Dónde se repite | Ahorro |
|-----------|-----------------|--------|
| `<Modal>` genérico | 3 modales re-implementan backdrop + overlay + ESC | 3 archivos → 1 |
| `<EmptyState>` genérico | 5 archivos con patrón "icon + texto" | 5 archivos → 1 |
| `<PeriodSelector>` | 2 selects hardcodeados idénticos | 2 → 1 |
| `<DataTable>` genérico | 4 tablas con estructura similar | Config-driven |
| `<EventIcon>` | 2 funciones `getIcon` idénticas | 2 → 1 |

### 2.3 Android (CotejoApp/)

#### 2.3.1 Estructura Actual

```
app/src/main/java/com/akit/app/
├── data/
│   ├── local/      # Room entities, DAOs, database
│   └── remote/     # Retrofit APIs, interceptors, DTOs
├── di/             # Hilt modules
├── domain/
│   ├── model/      # Domain entities
│   ├── repository/ # Repository interfaces
│   ├── usecase/    # Use cases
│   └── validation/ # Name validation (5 archivos)
├── navigation/     # NavGraph
└── ui/
    ├── screens/    # Compose screens
    ├── components/ # Akit design system
    └── theme/      # Colors, typography, dimensions
```

#### 2.3.2 Problemas Críticos

| # | Problema | Archivos | Impacto |
|---|----------|----------|---------|
| C1 | `runBlocking` en AuthInterceptor | `AuthInterceptor.kt:17` | **Riesgo de ANR** en producción |
| C2 | `IdentityFlow` CoroutineScope sin cancelación | `IdentityFlow.kt:22` | **Memory leak** |
| C3 | `TokenCache` sin expiry | `TokenCache.kt` | Requests fallan después de 1h |
| C4 | `FirebaseAuthSessionProvider` ignora DI | `FirebaseAuthSessionProvider.kt:11` | Imposible testear auth |
| C5 | `ResultsViewModel` 330 líneas | `ResultsViewModel.kt` | God class, viola SRP |
| C6 | `VocationalViewModel` 13 dependencias | `VocationalViewModel.kt` | Demasiadas responsabilidades |
| C7 | `BackendApiClient` God Object | 125 líneas | Hace de todo: users, sessions, vouchers, material |

#### 2.3.3 Duplicaciones

| Duplicación | Archivos |
|-------------|----------|
| `Resource<T>` sellado (código muerto) | `util/Resource.kt` — no se usa |
| `ApiResult` idéntico | `domain/model/ApiResult.kt` + `data/remote/ApiResult.kt` |
| `SessionSyncResult` enum | `domain/model/SessionSync.kt` + `data/remote/BackendApiClient.kt` |
| `ReportUnlockState` enum | `domain/model/ReportFlowState.kt` + `data/local/entity/SessionEntity.kt` |
| Use cases pass-through | `GetCardsUseCase`, `ClearProgressUseCase`, `GetAccessibilitySettingsUseCase` |

#### 2.3.4 Testing Actual

**26 archivos de test** (~25% coverage):

- ViewModels: 3 tests
- UseCases: 10 tests
- Mappers: 3 tests
- API: 2 tests
- Validation: 1 test
- Repository: 1 test
- Security: 1 test
- E2E: 2 tests

**Sin tests (35+ archivos críticos):**

- Repositories: 8 archivos
- Workers: 2 archivos
- Services: 3 archivos
- ViewModels: 3 archivos
- UseCases: 5 archivos
- UI Composables: 0 tests

### 2.4 Contracts (packages/contracts/)

#### 2.4.1 Estado Actual

- Tipos de dashboard definidos y usados correctamente en web
- Tipos de auth, sessions, institutions, vouchers **NO están en contracts**
- Cada cliente define sus propios tipos localmente
- Android genera `VoucherContracts.kt` manualmente (no por tool)

---

## 3. Target Architecture

### 3.1 API Target

```
src/
├── auth/                    # Simplified: 6 providers (was 13)
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   ├── services/
│   │   ├── auth-login.service.ts
│   │   ├── auth-password-flow.service.ts
│   │   └── firebase-jwt.service.ts        # Consolidated (was 3 services)
│   ├── guards/
│   ├── strategies/
│   └── utils/                              # Pure functions (was factories)
│       ├── response.utils.ts
│       └── token-expiry.utils.ts
├── categories/             # Unchanged (already clean)
├── common/
│   ├── services/
│   │   ├── scope-filter.service.ts        # NEW: unified scope filtering
│   │   ├── base-repository.service.ts     # NEW: generic CRUD
│   │   ├── url-builder.service.ts         # NEW: URL construction
│   │   └── voucher-redemption.service.ts  # NEW: breaks circular dep
│   ├── errors/                            # NEW: domain error classes
│   │   └── domain-errors.ts
│   ├── interceptors/                      # NEW: pagination, cache
│   │   ├── pagination.interceptor.ts
│   │   └── http-cache.interceptor.ts
│   ├── adapters/                           # Cleaned up
│   ├── jobs/                               # Strategy pattern (was switch)
│   │   ├── job-handler.interface.ts
│   │   ├── send-email.handler.ts
│   │   ├── generate-pdf.handler.ts
│   │   ├── send-report.handler.ts
│   │   └── job-dispatcher.service.ts      # ~20 lines (was 265)
│   └── utils/
├── institutions/           # Extends BaseRepositoryService
├── mail/                   # Unchanged
├── stats/                  # Uses ScopeFilterService
├── sessions/
│   ├── services/
│   │   ├── sessions.service.ts            # Cleaned (scope via service)
│   │   ├── admin-dashboard-queries.service.ts   # NEW: queries only
│   │   ├── admin-dashboard-formatter.service.ts # NEW: format only
│   │   ├── report-cache.service.ts        # NEW
│   │   ├── report-generator.service.ts    # NEW
│   │   └── report-delivery.service.ts     # NEW
│   └── ...
├── tres-areas/             # NEW: extracted from common
├── users/                  # Uses UrlBuilderService
└── vouchers/               # Uses VoucherRedemptionService (no circular dep)
```

### 3.2 Web Target

```
src/
├── components/
│   ├── atoms/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx           # NEW
│   │   ├── EmptyState.tsx      # NEW
│   │   ├── StatusBadge.tsx     # NEW (extracted from InstitutionCard)
│   │   └── EventIcon.tsx       # NEW
│   ├── molecules/
│   │   ├── StatCard.tsx
│   │   ├── DataTable.tsx       # NEW
│   │   ├── PeriodSelector.tsx  # NEW
│   │   └── SearchInput.tsx
│   └── providers/
├── features/
│   ├── auth/
│   │   ├── api/
│   │   │   └── auth.api.ts     # Uses @akit/contracts types
│   │   ├── hooks/
│   │   └── views/
│   └── dashboard/
│       ├── api/
│       │   ├── sessions.api.ts # Uses @akit/contracts types
│       │   ├── vouchers.api.ts # Uses @akit/contracts types
│       │   └── institutions.api.ts # Uses @akit/contracts types
│       ├── hooks/
│       │   ├── useVoucherList.ts       # Split from useVouchersManager
│       │   ├── useVoucherBatches.ts    # Split from useVouchersManager
│       │   ├── useVoucherForm.ts       # Split from useVouchersManager
│       │   ├── useVoucherFilters.ts    # Split from useVouchersManager
│       │   ├── useVoucherActions.ts    # NEW: extracted from VoucherTableRow
│       │   ├── useAdminDashboardStats.ts # NEW
│       │   └── useLocalStorage.ts      # NEW
│       ├── components/
│       └── views/
├── utils/
│   ├── date.ts
│   ├── holland.ts          # NEW: computeHollandCode
│   └── download.ts         # NEW: downloadSessionPdf
└── config/
    └── feature-flags.ts    # NEW
```

### 3.3 Android Target

```
app/src/main/java/com/akit/app/
├── data/
│   ├── local/
│   │   ├── dao/
│   │   ├── entity/
│   │   │   ├── SessionEntity.kt        # ReportUnlockState removed
│   │   │   └── ...
│   │   └── database/
│   └── remote/
│       ├── api/
│       │   ├── UsersApi.kt
│       │   ├── SessionsApi.kt
│       │   ├── VouchersApi.kt
│       │   └── MaterialApi.kt          # NEW: extracted from BackendApiClient
│       ├── client/
│       │   ├── UsersApiClient.kt       # NEW
│       │   ├── SessionsApiClient.kt    # NEW
│       │   ├── VouchersApiClient.kt    # NEW
│       │   └── MaterialApiClient.kt    # NEW
│       ├── interceptor/
│       │   └── AuthInterceptor.kt      # Fixed: no runBlocking
│       └── cache/
│           └── TokenCache.kt           # Fixed: with TTL
├── di/
├── domain/
│   ├── model/
│   │   ├── ApiResult.kt                # Single source (was 2)
│   │   ├── SessionSync.kt              # Single enum (was 2)
│   │   └── ...
│   ├── repository/
│   ├── usecase/
│   │   ├── GetCardsUseCase.kt          # REMOVED (pass-through)
│   │   ├── ClearProgressUseCase.kt     # REMOVED (pass-through)
│   │   └── ...
│   └── validation/
│       └── NameValidator.kt            # Simplified: 1 file (was 5)
├── navigation/
│   ├── NavGraph.kt                     # Simplified
│   └── AppNavigator.kt                 # NEW
└── ui/
    ├── screens/
    │   ├── results/
    │   │   ├── ResultsScreen.kt
    │   │   ├── ShareViewModel.kt       # NEW: split from ResultsViewModel
    │   │   ├── ReportViewModel.kt      # NEW: split from ResultsViewModel
    │   │   └── VoucherViewModel.kt     # NEW: split from ResultsViewModel
    │   └── vocational/
    │       ├── VocationalScreen.kt
    │       └── VocationalViewModel.kt  # Reduced deps (was 13)
    └── components/
        └── akit/                       # Used consistently
```

---

## 4. Refactor Phases

### Phase 1: Contracts Package (5-7 days)

**Branch:** `refactor/contracts-package` from `develop`

#### 1.1 Move Auth Types to Contracts

**Files:** `packages/contracts/src/`, `apps/api/src/auth/`, `apps/web/src/features/auth/`

**Tasks:**

- [ ] Create `packages/contracts/src/auth.ts` with:
  - `AuthUser` type
  - `AuthLoginResponse` type
  - `AuthTokenResolutionResponse` type
  - `AuthOkResponse` type
  - `AuthInfoResponse` type
  - `AuthUserSummary` type
  - `AuthAccessTokenPayload` type
  - `JwtPayload` type
  - `FirebaseJwtPayload` type
- [ ] Update API to export from contracts instead of local types
- [ ] Update Web to import from `@akit/contracts` instead of local `auth.types.ts`
- [ ] Delete `apps/web/src/features/auth/types/auth.types.ts`
- [ ] Delete `apps/api/src/auth/auth.types.ts` (keep only `AuthenticatedRequest`)

**Tests:**

- [ ] Type compatibility test: ensure contracts match API response shape

#### 1.2 Move Session Types to Contracts

**Files:** `packages/contracts/src/`, `apps/api/src/sessions/`, `apps/web/src/features/dashboard/`

**Tasks:**

- [ ] Create `packages/contracts/src/sessions.ts` with:
  - `SessionData` type
  - `SessionResult` type
  - `SessionSwipe` type
  - `SessionMetrics` type
  - `SessionPaymentStatus` enum
  - `CreateSessionDto` type
  - `CompleteSessionDto` type
  - `SessionScope` type
  - `DashboardStatsResponse` type (already exists, verify)
  - `AdminAlert` type (already exists, verify)
  - `AdminActivityEvent` type (already exists, verify)
  - `SessionActivityData` type (already exists, verify)
  - `CategoryDistributionData` type (already exists, verify)
- [ ] Update API to export from contracts
- [ ] Update Web to import from `@akit/contracts`
- [ ] Delete local type definitions

**Tests:**

- [ ] Type compatibility test

#### 1.3 Move Voucher Types to Contracts

**Files:** `packages/contracts/src/`, `apps/api/src/vouchers/`, `apps/web/src/features/dashboard/`

**Tasks:**

- [ ] Create `packages/contracts/src/vouchers.ts` with:
  - `VoucherData` type
  - `VoucherBatch` type
  - `VoucherStatus` enum
  - `VoucherOwnerType` enum
  - `CreateVoucherDto` type
  - `ListVouchersDto` type
  - `ListVoucherBatchesDto` type
  - `RedeemVoucherDto` type
  - `ResolveVoucherDto` type
  - `VoucherScope` type
  - `VoucherStats` type
- [ ] Update API to export from contracts
- [ ] Update Web to import from `@akit/contracts`
- [ ] Delete local type definitions

**Tests:**

- [ ] Type compatibility test

#### 1.4 Move Institution Types to Contracts

**Files:** `packages/contracts/src/`, `apps/api/src/institutions/`, `apps/web/src/features/dashboard/`

**Tasks:**

- [ ] Create `packages/contracts/src/institutions.ts` with:
  - `InstitutionData` type
  - `InstitutionCreateResponse` type
  - `InstitutionStatusResponse` type
  - `InstitutionsListResponse` type
  - `InstitutionOverviewResponse` type
  - `InstitutionOverviewQueryDto` type
  - `CreateInstitutionDto` type
  - `UpdateInstitutionDto` type
  - `CreateOperationalAccountDto` type
- [ ] Update API to export from contracts
- [ ] Update Web to import from `@akit/contracts`
- [ ] Delete local type definitions

**Tests:**

- [ ] Type compatibility test

#### 1.5 Generate Android DTOs from Contracts

**Files:** `CotejoApp/app/src/main/java/com/akit/app/contracts/`

**Tasks:**

- [ ] Create script to generate Kotlin data classes from TypeScript contracts
  - Option A: Use OpenAPI Generator with JSON Schema export
  - Option B: Write custom TypeScript → Kotlin generator
  - Option C: Manual generation (one-time, then maintain sync)
- [ ] Generate initial Kotlin DTOs
- [ ] Update Android API layer to use generated DTOs
- [ ] Delete manual `VoucherContracts.kt`

**Tests:**

- [ ] Verify generated DTOs match API responses

#### 1.6 Create Generic API Client with Interceptors (Web)

**Files:** `apps/web/src/api/`

**Tasks:**

- [ ] Create `apps/web/src/api/client.ts` with:
  - Base URL configuration
  - Auth token interceptor (auto-attach Bearer token)
  - Error response normalizer
  - Request/response logging (dev only)
- [ ] Create `apps/web/src/api/types.ts` with:
  - `ApiResponse<T>` wrapper
  - `ApiError` class
- [ ] Update all API functions to use the new client
- [ ] Remove direct `fetch()` calls

**Tests:**

- [ ] Test interceptor attaches token
- [ ] Test error normalization
- [ ] Test request/response flow

#### 1.7 Remove Silent Normalization (Web)

**Files:** `apps/web/src/features/dashboard/api/vouchers.api.ts`

**Tasks:**

- [ ] Remove `normalizeVoucherStatus()` fallback to defaults
- [ ] Remove `normalizeVoucherOwnerType()` fallback to defaults
- [ ] Replace with explicit error when unexpected value received
- [ ] Add TypeScript `never` check for exhaustiveness

**Tests:**

- [ ] Test that unexpected values throw errors

---

### Phase 2: API Quick Wins (2-3 days)

**Branch:** `refactor/api-quick-wins` from `develop`

#### 2.1 Remove `app.controller.ts` + `app.service.ts`

**Files:** `apps/api/src/app.controller.ts`, `apps/api/src/app.service.ts`, `apps/api/test/app.e2e-spec.ts`

**Tasks:**

- [ ] Delete `app.controller.ts`
- [ ] Delete `app.service.ts`
- [ ] Remove imports from `app.module.ts`
- [ ] Fix or remove e2e test that tests `/` endpoint (doesn't exist due to globalPrefix)

#### 2.2 Extract Shared `applyDefaults` from Queue Adapters

**Files:** `apps/api/src/common/adapters/`

**Tasks:**

- [ ] Create `apps/api/src/common/adapters/queue-defaults.ts`
- [ ] Move `applyDefaults` logic to pure function
- [ ] Update `BullMQQueueAdapter` to use shared function
- [ ] Update `InMemoryQueueAdapter` to use shared function

**Tests:**

- [ ] Test defaults apply for known job names
- [ ] Test options pass-through for unknown job names
- [ ] Test explicit options override defaults

#### 2.3 Create `wrapDomainError()` Helper

**Files:** `apps/api/src/common/utils/domain-error.ts`

**Tasks:**

- [ ] Create `wrapDomainError(fn, fallbackMessage)` function
- [ ] Replace 6+ try/catch blocks in `vouchers.service.ts`
- [ ] Replace 2+ try/catch blocks in `auth-password-flow.service.ts`

**Tests:**

- [ ] Test successful execution passes through
- [ ] Test Error message is preserved
- [ ] Test fallback message for non-Error throws

#### 2.4 Create `UrlBuilderService`

**Files:** `apps/api/src/common/services/url-builder.service.ts`

**Tasks:**

- [ ] Create `UrlBuilderService` with `build()`, `passwordSetupLink()`, `passwordResetLink()`
- [ ] Update `UsersService` to use `UrlBuilderService`
- [ ] Remove duplicate `buildPasswordSetupLink` and `buildPasswordResetLink` from `UsersService`

**Tests:**

- [ ] Test URL with trailing slash
- [ ] Test URL without trailing slash
- [ ] Test custom WEB_APP_URL from env

#### 2.5 Replace Inline Types with DTOs (Users Controller)

**Files:** `apps/api/src/users/dto/create-user.dto.ts`

**Tasks:**

- [ ] Create `CreateUserDto` with class-validator decorators
- [ ] Update `UsersController.create()` to use DTO
- [ ] Update `UsersController.register()` to use DTO

**Tests:**

- [ ] Test validation rejects invalid email
- [ ] Test validation rejects invalid role
- [ ] Test validation accepts valid payload

#### 2.6 Remove `any` Types

**Files:** `apps/api/src/sessions/services/report-orchestrator.service.ts`

**Tasks:**

- [ ] Replace `let where: any = {}` with `FindOptionsWhere<Session>`
- [ ] Add proper typing throughout

---

### Phase 3: Android Quick Wins (1-2 days)

**Branch:** `refactor/android-quick-wins` from `develop`

#### 3.1 Remove Dead Code

**Files:** `CotejoApp/app/src/main/java/com/akit/app/util/Resource.kt`

**Tasks:**

- [ ] Delete `util/Resource.kt` (not used anywhere)

#### 3.2 Unify `ApiResult` Domain/Data

**Files:** `domain/model/ApiResult.kt`, `data/remote/ApiResult.kt`, `data/remote/mapper/ApiResultMapper.kt`

**Tasks:**

- [ ] Keep only `domain/model/ApiResult.kt`
- [ ] Delete `data/remote/ApiResult.kt`
- [ ] Delete `ApiResultMapper.kt`
- [ ] Update data layer to return domain `ApiResult` directly

#### 3.3 Remove Duplicate Enums

**Files:** `domain/model/SessionSync.kt`, `data/remote/BackendApiClient.kt`, `domain/model/ReportFlowState.kt`, `data/local/entity/SessionEntity.kt`

**Tasks:**

- [ ] Remove `SessionSyncResult` enum from `BackendApiClient.kt`
- [ ] Update `BackendApiClient` to return domain `SessionSyncResult`
- [ ] Remove `ReportUnlockState` enum from `SessionEntity.kt`
- [ ] Update entity to use domain `ReportUnlockState` (or store as string)

#### 3.4 Remove Pass-Through Use Cases

**Files:** `GetCardsUseCase.kt`, `ClearProgressUseCase.kt`, `GetAccessibilitySettingsUseCase.kt`

**Tasks:**

- [ ] Delete `GetCardsUseCase.kt` — inject repository directly in ViewModel
- [ ] Delete `ClearProgressUseCase.kt` — inject repository directly in ViewModel
- [ ] Delete `GetAccessibilitySettingsUseCase.kt` — inject repository directly in ViewModel
- [ ] Update DI modules to remove bindings
- [ ] Update ViewModels to use repositories directly

#### 3.5 Fix Naming Conventions

**Files:** `Vocationalresult.kt`, `Dimensions.kt`

**Tasks:**

- [ ] Rename `Vocationalresult.kt` → `VocationalResult.kt`
- [ ] Fix `Spacing` in `Dimensions.kt` from `Int` to `Dp`

---

### Phase 4: Android Critical Fixes (2-3 days)

**Branch:** `refactor/android-critical-fixes` from `develop`

> ⚠️ **HIGH PRIORITY** — These fixes address production risks.

#### 4.1 Remove `runBlocking` from AuthInterceptor

**File:** `CotejoApp/app/src/main/java/com/akit/app/data/remote/interceptor/AuthInterceptor.kt`

**Current:**

```kotlin
val token = tokenCache.get() ?: kotlinx.coroutines.runBlocking { tokenCache.refresh() }
```

**Target:**

```kotlin
// Use suspend function with OkHttp's interceptor chain
// Option 1: Use runBlocking with timeout (temporary)
// Option 2: Refactor to use synchronous token fetch
// Option 3: Cache token proactively (refresh before expiry)
```

**Tasks:**

- [ ] Implement proactive token refresh (refresh at 50min, before 60min expiry)
- [ ] Replace `runBlocking` with synchronous fallback or cached token
- [ ] Add timeout to prevent ANR

**Tests:**

- [ ] Test interceptor with valid cached token
- [ ] Test interceptor with expired token (triggers refresh)
- [ ] Test interceptor with no network (returns cached or fails gracefully)

#### 4.2 Add TTL to TokenCache

**File:** `CotejoApp/app/src/main/java/com/akit/app/data/remote/cache/TokenCache.kt`

**Tasks:**

- [ ] Add `cachedAt: Long` timestamp to cache entry
- [ ] Add `isExpired(): Boolean` check (TTL = 50 minutes)
- [ ] Update `get()` to check expiry before returning
- [ ] Update `refresh()` to update timestamp

**Tests:**

- [ ] Test token returns when not expired
- [ ] Test token returns null when expired
- [ ] Test refresh updates timestamp

#### 4.3 Fix IdentityFlow CoroutineScope Leak

**File:** `CotejoApp/app/src/main/java/com/akit/app/domain/flow/IdentityFlow.kt`

**Current:**

```kotlin
private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
```

**Target:**

```kotlin
// Option 1: Inject CoroutineScope from DI (with proper lifecycle)
// Option 2: Use MainScope() and implement Closeable
// Option 3: Make lifecycle-aware
```

**Tasks:**

- [ ] Inject `CoroutineScope` via Hilt (use `@Singleton` scope with `SupervisorJob`)
- [ ] Implement `Closeable` or `LifecycleObserver` to cancel scope
- [ ] Update DI module to provide the scope

**Tests:**

- [ ] Test scope is cancelled on app shutdown

#### 4.4 Fix FirebaseAuthSessionProvider to Use DI

**File:** `CotejoApp/app/src/main/java/com/akit/app/data/auth/FirebaseAuthSessionProvider.kt`

**Current:**

```kotlin
override fun currentUserId(): String? = FirebaseAuth.getInstance().currentUser?.uid
```

**Target:**

```kotlin
class FirebaseAuthSessionProvider @Inject constructor(
    private val firebaseAuth: FirebaseAuth
) : AuthSessionProvider {
    override fun currentUserId(): String? = firebaseAuth.currentUser?.uid
}
```

**Tasks:**

- [ ] Inject `FirebaseAuth` instance via constructor
- [ ] Update DI module to provide `FirebaseAuth`
- [ ] Update all usages

**Tests:**

- [ ] Test with mocked FirebaseAuth

#### 4.5 Split BackendApiClient into Specific Clients

**File:** `CotejoApp/app/src/main/java/com/akit/app/data/remote/BackendApiClient.kt`

**Tasks:**

- [ ] Create `UsersApiClient` (registration, user management)
- [ ] Create `SessionsApiClient` (complete session, send report)
- [ ] Create `VouchersApiClient` (redeem voucher)
- [ ] Create `MaterialApiClient` (fetch theoretical material)
- [ ] Delete `BackendApiClient.kt`
- [ ] Update DI modules
- [ ] Update repositories to use specific clients

**Tests:**

- [ ] Test each client independently
- [ ] Test error handling per client

---

### Phase 5: Web Hooks Extraction (3-5 days)

**Branch:** `refactor/web-hooks` from `develop`

#### 5.1 Extract `useVoucherActions` from VoucherTableRow

**File:** `apps/web/src/features/dashboard/hooks/useVoucherActions.ts`

**Tasks:**

- [ ] Create hook with: `sendEmail()`, `resendEmail()`, `revoke()`, `shareWhatsApp()`, `copyCode()`
- [ ] Update `VoucherTableRow` to use hook (becomes presentational)
- [ ] Remove all business logic from component

**Tests:**

- [ ] Test sendEmail calls API
- [ ] Test revoke calls API with confirmation
- [ ] Test shareWhatsApp opens correct URL
- [ ] Test copyCode copies to clipboard

#### 5.2 Split `useVouchersManager` into 4 Hooks

**Files:**

- `useVoucherList.ts` — fetch, pagination, loading
- `useVoucherBatches.ts` — batch queries, batch detail
- `useVoucherForm.ts` — create/edit form state
- `useVoucherFilters.ts` — filter state (status, expiration, search)

**Tasks:**

- [ ] Create each hook with single responsibility
- [ ] Update `VouchersView` to compose the 4 hooks
- [ ] Remove `useVouchersManager.ts`

**Tests:**

- [ ] Test each hook independently
- [ ] Test composition in view

#### 5.3 Create `useAdminDashboardStats`

**File:** `apps/web/src/features/dashboard/hooks/useAdminDashboardStats.ts`

**Tasks:**

- [ ] Extract `useEffect` + `useState` from `DashboardOverview`
- [ ] Hook returns: `stats`, `loading`, `error`, `refetch`
- [ ] Update `DashboardOverview` to use hook

#### 5.4 Create `useLocalStorage` Hook

**File:** `apps/web/src/hooks/useLocalStorage.ts`

**Tasks:**

- [ ] Create generic hook: `useLocalStorage<T>(key, initialValue)`
- [ ] Update `useInstitutionOverviewManager` to use it
- [ ] Remove hardcoded localStorage key

**Tests:**

- [ ] Test set/get
- [ ] Test JSON serialization
- [ ] Test default value

#### 5.5 Create `usePeriodSelector` Hook

**File:** `apps/web/src/hooks/usePeriodSelector.ts`

**Tasks:**

- [ ] Create hook with period options (7, 15, 30, 90, 365 days)
- [ ] Update `DashboardOverview` and `InstitutionDashboardOverview` to use it

---

### Phase 6: Web Reusable Components (3-4 days)

**Branch:** `refactor/web-components` from `develop`

#### 6.1 Create `<Modal>` Component

**File:** `apps/web/src/components/atoms/Modal.tsx`

**Tasks:**

- [ ] Create Modal with: backdrop, overlay, ESC close, focus trap
- [ ] Update `CategoryEditModal` to use `<Modal>`
- [ ] Update `InstitutionEditModal` to use `<Modal>`
- [ ] Update `BatchDetailDrawer` to use `<Modal>` (or create `<Drawer>`)

**Tests:**

- [ ] Test opens/closes
- [ ] Test ESC key closes
- [ ] Test backdrop click closes
- [ ] Test focus trap

#### 6.2 Create `<EmptyState>` Component

**File:** `apps/web/src/components/atoms/EmptyState.tsx`

**Tasks:**

- [ ] Create EmptyState with: icon, title, description, optional action
- [ ] Replace 5 instances across the app

#### 6.3 Create `<PeriodSelector>` Component

**File:** `apps/web/src/components/molecules/PeriodSelector.tsx`

**Tasks:**

- [ ] Create PeriodSelector with preset options
- [ ] Replace 2 hardcoded selects

#### 6.4 Create `<EventIcon>` Component

**File:** `apps/web/src/components/atoms/EventIcon.tsx`

**Tasks:**

- [ ] Create EventIcon that maps event type to icon
- [ ] Replace 2 duplicate `getIcon` functions

#### 6.5 Create `<StatusBadge>` Component

**File:** `apps/web/src/components/atoms/StatusBadge.tsx`

**Tasks:**

- [ ] Extract from `InstitutionCard`
- [ ] Update `TherapistCard` to import from new location
- [ ] Remove cross-component coupling

#### 6.6 Refactor `VoucherStatsCards`

**File:** `apps/web/src/features/dashboard/components/overview/VoucherStatsCards.tsx`

**Tasks:**

- [ ] Create `StatCardVariant` component with config props
- [ ] Reduce from 196 lines to ~40 lines

---

### Phase 7: Android God Class Decomposition (3-4 weeks)

**Branch:** `refactor/android-god-classes` from `develop`

#### 7.1 Split ResultsViewModel

**Current:** `ResultsViewModel.kt` — 330 lines

**Target:**

- `ShareViewModel.kt` — share text state
- `ReportViewModel.kt` — email report, payment unlock, report flow
- `VoucherViewModel.kt` — voucher redeem, payment unlock

**Tasks:**

- [ ] Create `ShareViewModel` with share text state
- [ ] Create `ReportViewModel` with email report, payment unlock, report flow state
- [ ] Create `VoucherViewModel` with voucher redeem state
- [ ] Update `ResultsScreen` to compose the 3 ViewModels
- [ ] Delete original `ResultsViewModel`

**Tests:**

- [ ] Test each ViewModel independently
- [ ] Test composition in screen

#### 7.2 Reduce VocationalViewModel Dependencies

**Current:** 13 dependencies

**Target:** 8 dependencies (via `InteractionCoordinator`)

**Tasks:**

- [ ] Create `InteractionCoordinator` that wraps:
  - `ITtsService`
  - `IHapticService`
  - `IMotivationalService`
  - `AnalyticsHelper`
- [ ] Update `VocationalViewModel` to inject `InteractionCoordinator` instead of 4 separate services
- [ ] Update DI module

**Tests:**

- [ ] Test InteractionCoordinator delegates correctly

#### 7.3 Refactor FinalizeVocationalTestLocalUseCase

**Current:** Does calculation, Holland code, recommendations, date formatting, UUID generation, user data, patient name, session save

**Target:** Split into:

- `CalculateResultsUseCase` — calculates results from swipes
- `CalculateHollandCodeUseCase` — calculates Holland code (already exists, use it)
- `BuildSessionSummaryUseCase` — builds summary object
- `SaveSessionUseCase` — saves to Room

**Tasks:**

- [ ] Use existing `CalculateResultsUseCase` and `CalculateHollandCodeUseCase`
- [ ] Create `BuildSessionSummaryUseCase`
- [ ] Update `FinalizeVocationalTestLocalUseCase` to orchestrate the above
- [ ] Or further simplify by moving orchestration to ViewModel

#### 7.4 Simplify Name Validation

**Current:** 5 files (NameValidator, ValidationResult, NameValidationRule, NotBlankNameRule, MinLengthNameRule)

**Target:** 1 file

**Tasks:**

- [ ] Create single `validateName(name: String): ValidationResult?` function
- [ ] Delete 5 validation files
- [ ] Update DI module (remove `@IntoSet` bindings)
- [ ] Update usages

**Tests:**

- [ ] Test valid names
- [ ] Test empty name
- [ ] Test short name (< 2 chars)
- [ ] Test whitespace-only name

#### 7.5 Simplify NavGraph

**Current:** 224 lines — creates ViewModels, manages drawer state, LaunchedEffect for sign-out, dialogs, animations

**Target:** ~80 lines — only defines routes and delegates

**Tasks:**

- [ ] Move drawer state management to dedicated composable
- [ ] Move sign-out navigation logic to ViewModel
- [ ] Move dialog state to dedicated composables
- [ ] Keep only route definitions in NavGraph

#### 7.6 Split DrawerContent

**Current:** 335 lines

**Target:** 5 sub-components

**Tasks:**

- [ ] Create `DrawerHeader` component
- [ ] Create `DrawerAppearanceSection` component
- [ ] Create `DrawerNavigationSection` component
- [ ] Create `DrawerHelpSection` component
- [ ] Create `DrawerAccountSection` component
- [ ] Update `DrawerContent` to compose the 5 sub-components

---

### Phase 8: API Circular Dependencies (3-4 days)

**Branch:** `refactor/api-circular-deps` from `develop`

#### 8.1 Extract VoucherRedemptionService

**File:** `apps/api/src/common/services/voucher-redemption.service.ts`

**Tasks:**

- [ ] Create `VoucherRedemptionService` that:
  - Receives voucher code + sessionId
  - Validates voucher (uses VoucherAccessService)
  - Redeems voucher (uses Voucher entity domain method)
  - Updates session (uses SessionRepository)
- [ ] Does NOT import SessionsModule or VouchersModule
- [ ] Create `VoucherRedemptionModule`
- [ ] Update `VouchersController` to use `VoucherRedemptionService` instead of `SessionsService`
- [ ] Update `SessionsService` to use `VoucherRedemptionService` for attach
- [ ] Remove `forwardRef` between VouchersModule and SessionsModule

**Tests:**

- [ ] Test redemption flow end-to-end
- [ ] Test already-redeemed scenario
- [ ] Test invalid code scenario

#### 8.2 Move TresAreas to Own Module

**Files:** `apps/api/src/tres-areas/`

**Tasks:**

- [ ] Create `tres-areas/` module with:
  - `tres-areas.module.ts`
  - `tres-areas.service.ts`
  - `entities/tres-areas-combination.entity.ts`
- [ ] Move files from `common/`
- [ ] Update `CommonModule` to import `TresAreasModule` instead of defining locally
- [ ] Remove `forwardRef` between CommonModule and SessionsModule

#### 8.3 Break Users ↔ Institutions Circular Dependency

**Current:**

```
UsersModule → forwardRef(InstitutionsModule)
InstitutionsModule → forwardRef(UsersModule)
```

**Target:** Use events or direct repository injection

**Option A (Events):**

- [ ] Install `@nestjs/event-emitter`
- [ ] `UserRegistrationService` emits `user.therapist-created` event
- [ ] `InstitutionsModule` listens and creates institution

**Option B (Direct Repository — simpler):**

- [ ] Inject `Repository<Institution>` directly in `UserRegistrationService`
- [ ] Remove `InstitutionsModule` import from `UsersModule`
- [ ] Remove `UsersModule` import from `InstitutionsModule`

**Recommendation:** Option B (simpler, no new dependency)

#### 8.4 Remove VouchersController → SessionsService Direct Reference

**File:** `apps/api/src/vouchers/vouchers.controller.ts`

**Tasks:**

- [ ] Update `redeem` endpoint to use `VoucherRedemptionService` (from 8.1)
- [ ] Remove `@Inject(forwardRef(() => SessionsService))`
- [ ] Remove `SessionsService` import from VouchersModule

---

### Phase 9: API God Service Decomposition (3-4 days)

**Branch:** `refactor/api-god-services` from `develop`

#### 9.1 Refactor JobDispatcherService to Strategy Pattern

**Files:** `apps/api/src/common/jobs/`

**Tasks:**

- [ ] Create `JobHandler` interface
- [ ] Create `SendEmailHandler`
- [ ] Create `GeneratePdfHandler`
- [ ] Create `SendReportHandler`
- [ ] Create `JobRegistry` to register handlers
- [ ] Refactor `JobDispatcherService` to ~20 lines (delegates to handlers)
- [ ] Update `CommonModule` to register handlers

**Tests:**

- [ ] Test each handler independently
- [ ] Test dispatcher routes to correct handler
- [ ] Test unknown job throws error

#### 9.2 Split AdminDashboardService

**Files:** `apps/api/src/sessions/services/`

**Tasks:**

- [ ] Create `AdminDashboardQueriesService` — 12 query methods
- [ ] Create `AdminDashboardFormatterService` — formatting and calculations
- [ ] Refactor `AdminDashboardService` to ~30 lines (orchestrator)

**Tests:**

- [ ] Test queries return correct data
- [ ] Test formatter produces correct output
- [ ] Test orchestrator combines correctly

#### 9.3 Split ReportOrchestratorService

**Files:** `apps/api/src/sessions/services/`

**Tasks:**

- [ ] Create `ReportCacheService` — in-memory cache + locks
- [ ] Create `ReportGeneratorService` — HTML → PDF → storage
- [ ] Create `ReportDeliveryService` — email with PDF or URL
- [ ] Refactor `ReportOrchestratorService` to ~30 lines (orchestrator)

**Tests:**

- [ ] Test cache hit/miss
- [ ] Test lock prevents duplicate generation
- [ ] Test generator produces PDF
- [ ] Test delivery sends email

#### 9.4 Split SessionCompleteMapperService

**Files:** `apps/api/src/sessions/services/`

**Tasks:**

- [ ] Create `SessionPayloadMapperService` — DTO → DTO mapping
- [ ] Create `SessionOwnerResolverService` — resolves therapist/institution/owner
- [ ] Create `SessionSyncKeyService` — buildSyncKey
- [ ] Refactor `SessionCompleteMapperService` to orchestrate

---

### Phase 10: Testing Infrastructure (ongoing per phase)

> Testing is NOT a separate phase — each phase MUST include tests for the code it touches.

#### 10.1 API Testing Setup

**Tasks:**

- [ ] Configure SQLite in-memory for tests
- [ ] Create test factory helpers (`createUserFactory`, `createSessionFactory`, etc.)
- [ ] Create test database setup utility

#### 10.2 Web Testing Setup

**Tasks:**

- [ ] Install Vitest + Testing Library
- [ ] Configure test setup file
- [ ] Create mock API client for tests

#### 10.3 Android Testing Setup

**Tasks:**

- [ ] Configure test database (Room in-memory)
- [ ] Create test factories for entities
- [ ] Set up mock WebServer for API tests

---

## 5. Git Flow Strategy

### 5.1 Branch Structure

```
main ────────────────────────────────────────────────► (PRODUCTION)
  │
  ├── releases/v1.x.x ──────────────────────────────► (STAGING → PROD)
  │
develop ────────────────────────────────────────────► (INTEGRATION)
  │
  ├── refactor/contracts-package ───────────────────► (Phase 1)
  ├── refactor/api-quick-wins ──────────────────────► (Phase 2)
  ├── refactor/android-quick-wins ──────────────────► (Phase 3)
  ├── refactor/android-critical-fixes ──────────────► (Phase 4)
  ├── refactor/web-hooks ───────────────────────────► (Phase 5)
  ├── refactor/web-components ──────────────────────► (Phase 6)
  ├── refactor/android-god-classes ─────────────────► (Phase 7)
  ├── refactor/api-circular-deps ───────────────────► (Phase 8)
  └── refactor/api-god-services ────────────────────► (Phase 9)
```

### 5.2 Branch Rules

| Rule | Description |
|------|-------------|
| `main` is sacred | Only receives merges from `releases/v*` |
| Every commit on `main` is deployable | No broken builds |
| Semantic tags | `api/v1.2.0`, `web/v1.3.0`, `android/v1.4.0` |
| `develop` is integration | All refactor branches merge here first |
| Feature branches are short-lived | Max 2-3 days |
| PRs are small | < 400 lines ideally |
| CI runs on every PR | Tests + lint + build |

### 5.3 Merge Process

```bash
# 1. Create phase branch from develop
git checkout develop && git pull origin develop
git checkout -b refactor/contracts-package

# 2. Create feature branch for sub-task
git checkout -b feat/contracts-auth-types refactor/contracts-package

# 3. Work, commit, push
git add . && git commit -m "feat(contracts): add auth types"
git push origin feat/contracts-auth-types

# 4. Create PR → merge to refactor/contracts-package

# 5. When all sub-tasks done, merge phase to develop
git checkout develop
git merge refactor/contracts-package --no-ff
git push origin develop

# 6. After staging validation, merge to main via release
git checkout -b releases/v1.2.0 develop
git push origin releases/v1.2.0
# After staging approval:
git checkout main
git merge releases/v1.2.0 --no-ff
git tag api/v1.2.0 web/v1.3.0
git push origin main --tags
```

### 5.4 Deploy Strategy

| Project | Deploy Method | Rollback |
|---------|--------------|----------|
| API | Docker image versioned | Revert to previous image |
| Web | CDN deploy | Instant revert to previous commit |
| Android | Play Store gradual rollout | No rollback — hotfix patch |

### 5.5 Feature Flags

**Web:**

```typescript
// config/feature-flags.ts
export const FEATURE_FLAGS = {
  useNewVoucherTable: false,
  useReactQuery: false,
  useNewModal: false,
} as const;
```

**Android:**

```kotlin
// Firebase Remote Config
val useNewResultsScreen = firebaseRemoteConfig.getBoolean("use_new_results_screen")
```

---

## 6. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking API contract during refactor | Medium | High | Phase 1 first (contracts), type checks in CI |
| Android ANR from runBlocking | High | Critical | Phase 4 first (critical fixes) |
| Memory leak from IdentityFlow | Medium | High | Phase 4 first |
| Token expiry causing silent failures | High | High | Phase 4 first |
| Test coverage insufficient | High | Medium | Require tests in every PR |
| Merge conflicts between phases | Medium | Medium | Regular sync with develop, clear file ownership |
| Regression in production | Medium | High | Staging validation, feature flags, gradual rollout |
| Refactor takes longer than estimated | High | Medium | Prioritize critical fixes, defer nice-to-haves |

---

## 7. Timeline & Parallelization Strategy

| Phase | Duration | Dependencies | Priority | Parallelizable? |
|-------|----------|-------------|----------|-----------------|
| **1. Contracts Package** | 5-7 days | None | 🔴 Critical | No (Blocking) |
| **2. API Quick Wins** | 2-3 days | Phase 1 | 🟡 High | Yes (Lane A) |
| **3. Android Quick Wins** | 1-2 days | Phase 1 | 🟡 High | Yes (Lane C) |
| **4. Android Critical Fixes** | 2-3 days | Phase 3 | 🔴 Critical | Yes (Lane C) |
| **5. Web Hooks Extraction** | 3-5 days | Phase 1 | 🟡 High | Yes (Lane B) |
| **6. Web Components** | 3-4 days | Phase 5 | 🟢 Medium | Yes (Lane B) |
| **7. Android God Classes** | 3-4 weeks | Phase 4 | 🔴 Critical | Yes (Lane C) |
| **8. API Circular Deps** | 3-4 days | Phase 1 | 🟡 High | Yes (Lane A) |
| **9. API God Services** | 3-4 days | Phase 8 | 🟡 High | Yes (Lane A) |
| **10. Testing** | Ongoing | All phases | 🔴 Critical | Yes (Across all) |

### Parallel Lanes post-Phase 1:
- **Lane A (Backend):** Phases 2, 8, 9
- **Lane B (Web):** Phases 5, 6
- **Lane C (Android):** Phases 3, 4, 7

Executing these lanes in parallel can reduce the total time by approximately 40-50%.

---

## 8. Success Criteria

| Metric | Current | Target |
|--------|---------|--------|
| API test coverage | < 10% | > 70% |
| Web test coverage | 0% | > 70% |
| Android test coverage | ~25% | > 70% |
| Circular dependencies (API) | 4 | 0 |
| God classes (> 200 lines) | 8 | 0 |
| Duplicated code blocks | 15+ | 0 |
| API types in contracts | ~30% | 100% |
| ANR risk (Android) | Yes | No |
| Memory leaks (Android) | Yes | No |
| Token expiry handling | No | Yes |

---

## 9. Pre-Merge Checklist

For EACH phase, before merging to `main`:

```
[ ] All tests pass (CI green)
[ ] Code review approved by at least 1 person
[ ] Tested in staging environment
[ ] DB migrations are backward-compatible
[ ] Feature flags configured (if applicable)
[ ] Changelog updated
[ ] Version bump applied
[ ] No console.log/debug in production
[ ] Bundle size didn't grow > 10% (web)
[ ] APK size didn't grow > 5% (android)
[ ] No new circular dependencies (API)
[ ] All TODO/FIXME comments resolved or tracked
```

---

## 10. Appendix

### 10.1 File Inventory — API

| Module | Files | Lines | Tests |
|--------|-------|-------|-------|
| auth/ | 13 | ~600 | 0 |
| categories/ | 5 | ~150 | 0 |
| common/ | 25 | ~1,200 | 3 specs |
| config/ | 1 | ~30 | 0 |
| database/ | 5 | ~200 | 0 |
| institutions/ | 10 | ~400 | 0 |
| mail/ | 8 | ~450 | 0 |
| migrations/ | 12 | ~800 | 0 |
| sessions/ | 18 | ~1,500 | 0 |
| stats/ | 5 | ~200 | 0 |
| users/ | 6 | ~350 | 1 spec |
| vouchers/ | 12 | ~700 | 0 |
| **Total** | **120** | **~6,500** | **4 specs** |

### 10.2 File Inventory — Web

| Module | Files | Lines | Tests |
|--------|-------|-------|-------|
| components/ | 12 | ~600 | 0 |
| features/auth/ | 15 | ~800 | 0 |
| features/dashboard/ | 35 | ~2,500 | 0 |
| hooks/ | 8 | ~500 | 0 |
| router/ | 2 | ~100 | 0 |
| utils/ | 3 | ~150 | 0 |
| context/ | 2 | ~100 | 0 |
| **Total** | **77** | **~4,750** | **0** |

### 10.3 File Inventory — Android

| Module | Files | Lines | Tests |
|--------|-------|-------|-------|
| data/ | 30 | ~2,500 | 5 tests |
| di/ | 10 | ~400 | 0 |
| domain/ | 40 | ~2,000 | 15 tests |
| navigation/ | 2 | ~250 | 0 |
| ui/ | 25 | ~2,500 | 2 tests |
| util/ | 5 | ~200 | 4 tests |
| **Total** | **112** | **~7,850** | **26 tests** |

### 10.4 Contracts Package — Current Types

```typescript
// packages/contracts/src/index.ts
export * from './dashboard.js';    // DashboardStatsResponse, AdminAlert, etc.
```

### 10.5 Contracts Package — Target Types

```typescript
// packages/contracts/src/index.ts
export * from './auth.js';         // AuthUser, AuthLoginResponse, etc.
export * from './sessions.js';     // SessionData, SessionResult, etc.
export * from './vouchers.js';     // VoucherData, VoucherBatch, etc.
export * from './institutions.js'; // InstitutionData, etc.
export * from './categories.js';   // CategoryData, etc.
export * from './dashboard.js';    // DashboardStatsResponse, etc. (existing)
export * from './common.js';       // Pagination, ApiError, etc.
```
