---
name: akit-android-refactor
description: A.kit Android (Kotlin+Compose) refactor specialist. Use when implementing, reviewing, or planning Android refactoring phases. Covers critical fixes (ANR, memory leaks), god class decomposition, testing, and API contract sync.
version: "1.0.0"
scope: CotejoApp/
---

# A.kit Android Refactor Specialist

You are the senior Android architect responsible for refactoring the CotejoApp (A.kit Android).

## Project Context

- **Path:** `CotejoApp/` (sibling directory to `akit-platform/`)
- **Stack:** Kotlin + Jetpack Compose + Hilt + Room (SQLCipher) + WorkManager + Retrofit
- **Current state:** ~8,000 lines, 26 tests (~25% coverage), ANR risk, memory leaks
- **Master plan:** `docs/refactor-platform-2026.md`

## Critical Production Risks (Fix FIRST)

### 🔴 C1: `runBlocking` en AuthInterceptor
```kotlin
// AuthInterceptor.kt:17
val token = tokenCache.get() ?: kotlinx.coroutines.runBlocking { tokenCache.refresh() }
```
**Riesgo:** ANR — bloquea thread de red de OkHttp. Si Firebase tarda, la app se congela.

### 🔴 C2: `IdentityFlow` CoroutineScope sin cancelación
```kotlin
// IdentityFlow.kt:22
private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
```
**Riesgo:** Memory leak — @Singleton con scope que nunca se cancela.

### 🔴 C3: `TokenCache` sin expiry
**Riesgo:** Tokens Firebase expiran en ~1h. Cache nunca expira → requests fallan silenciosamente.

### 🔴 C4: `FirebaseAuthSessionProvider` ignora DI
```kotlin
// FirebaseAuthSessionProvider.kt:11
override fun currentUserId(): String? = FirebaseAuth.getInstance().currentUser?.uid
```
**Riesgo:** Imposible mockear para tests.

## God Classes

### `ResultsViewModel` — 330 líneas
Maneja: share text, email report, voucher redeem, payment unlock, report flow, online status, category previews, user name.

**Target:** Split en `ShareViewModel`, `ReportViewModel`, `VoucherViewModel`.

### `VocationalViewModel` — 13 dependencias
```kotlin
class VocationalViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val getCardsUseCase: GetCardsUseCase,
    private val saveSwipeUseCase: SaveSwipeUseCase,
    private val clearProgressUseCase: ClearProgressUseCase,
    private val finalizeVocationalTestUseCase: FinalizeVocationalTestUseCase,
    private val finalizeVocationalTestLocalUseCase: FinalizeVocationalTestLocalUseCase,
    private val enqueueSyncSessionUseCase: EnqueueSyncSessionUseCase,
    private val currentSessionRepository: CurrentSessionRepository,
    private val ttsService: ITtsService,
    private val getAccessibilitySettingsUseCase: GetAccessibilitySettingsUseCase,
    private val hapticService: IHapticService,
    private val motivationalService: IMotivationalService,
    private val analyticsHelper: AnalyticsHelper
)
```

**Target:** Crear `InteractionCoordinator` que agrupe TTS + Haptic + Motivational + Analytics.

### `BackendApiClient` — God Object (125 líneas)
Hace: registro, completar sesiones, enviar reportes, fetch material, canjear vouchers, cache de userId.

**Target:** Separar en `UsersApiClient`, `SessionsApiClient`, `VouchersApiClient`, `MaterialApiClient`.

### `NavGraph` — God Composable (224 líneas)
Crea ViewModels, maneja drawer state, LaunchedEffect para sign-out, dialogs, animaciones.

### `DrawerContent` — 335 líneas
Hero header + appearance + navigation + help + account sections.

## Duplicaciones

| Duplicación | Archivos |
|-------------|----------|
| `Resource<T>` sellado (código muerto) | `util/Resource.kt` — no se usa |
| `ApiResult` idéntico | `domain/model/ApiResult.kt` + `data/remote/ApiResult.kt` |
| `SessionSyncResult` enum | `domain/model/SessionSync.kt` + `data/remote/BackendApiClient.kt` |
| `ReportUnlockState` enum | `domain/model/ReportFlowState.kt` + `data/local/entity/SessionEntity.kt` |
| Use cases pass-through | `GetCardsUseCase`, `ClearProgressUseCase`, `GetAccessibilitySettingsUseCase` |

## Sobre-ingeniería

### Validación de nombre — 5 archivos para validar un string
```
NameValidator.kt       → orquestador
ValidationResult.kt    → data class
NameValidationRule.kt  → interfaz
NotBlankNameRule.kt    → regla 1
MinLengthNameRule.kt   → regla 2
```

**Target:** 1 función `validateName(name: String): ValidationResult?`

### `FinalizeVocationalTestLocalUseCase` — orchestrator disfrazado
Calcula resultados, Holland code, recomendaciones, formatea fecha, genera UUID, obtiene datos del usuario, construye nombre, guarda sesión.

## Your Phases

### Phase 3: Android Quick Wins
- [ ] Eliminar `util/Resource.kt` (código muerto)
- [ ] Unificar `ApiResult` domain/data (eliminar duplicado)
- [ ] Eliminar enum duplicado `SessionSyncResult`
- [ ] Eliminar enum duplicado `ReportUnlockState`
- [ ] Eliminar use cases pass-through (3 archivos)
- [ ] Corregir naming `Vocationalresult.kt` → `VocationalResult.kt`
- [ ] Corregir `Spacing` en `Dimensions.kt` (Int → Dp)

### Phase 4: Android Critical Fixes
- [ ] Eliminar `runBlocking` de `AuthInterceptor`
- [ ] Agregar TTL a `TokenCache` (50 min)
- [ ] Corregir `IdentityFlow` CoroutineScope leak
- [ ] `FirebaseAuthSessionProvider` usar instancia inyectada de DI
- [ ] Separar `BackendApiClient` en 4 clientes específicos

### Phase 7: Android God Class Decomposition
- [ ] Split `ResultsViewModel` en 3 ViewModels
- [ ] Reducir `VocationalViewModel` a 8 deps (crear `InteractionCoordinator`)
- [ ] Refactorizar `FinalizeVocationalTestLocalUseCase`
- [ ] Simplificar validación de nombre (5 → 1 archivo)
- [ ] Simplificar `NavGraph` (224 → ~80 líneas)
- [ ] Dividir `DrawerContent` en 5 sub-componentes

### Phase 1 (partial): API Contract Sync (Android side)
- [ ] Generar Kotlin DTOs desde TypeScript contracts
- [ ] Actualizar API layer para usar DTOs generados
- [ ] Eliminar `VoucherContracts.kt` manual

### Phase 10: Testing (Android portion)
- [ ] Tests para repositorios (8 archivos) — ~40 tests
- [ ] Tests para workers (2 archivos) — ~10 tests
- [ ] Tests para servicios (3 archivos) — ~8 tests
- [ ] Tests para ViewModels faltantes (3 archivos) — ~20 tests
- [ ] Tests para UseCases faltantes (5 archivos) — ~15 tests
- [ ] Compose UI tests — ~12 tests
- [ ] Tests de integración (sync flow) — ~5 tests

## Architecture Rules

### Clean Architecture
- 3 capas: data → domain → presentation
- Domain NO depende de data ni presentation
- Data implementa interfaces de domain
- Presentation depende de domain

### Compose
- State hoisting: estado en ViewModel, UI es función del estado
- NO side effects en composición — usar `LaunchedEffect`, `DisposableEffect`
- `remember` para estado local de UI
- `derivedStateOf` para cálculos derivados
- Recomposition: evitar crear objetos en el body del composable

### ViewModel
- Single responsibility — si maneja 3+ dominios, split
- Máximo 150 líneas (ideal < 100)
- StateFlow para estado, NO MutableStateFlow expuesto
- `viewModelScope` para coroutines, NO crear scopes propios

### Coroutines
- NO `runBlocking` — usar suspend functions
- Structured concurrency: siempre usar un scope con lifecycle
- `CoroutineScope` inyectado o lifecycle-aware
- `SupervisorJob` para parallel work que no debe cancelarse mutuamente

### Dependency Injection (Hilt)
- `@Singleton` solo para servicios sin estado
- `@ViewModelScoped` para ViewModels (automático con `@HiltViewModel`)
- NO todo singleton — repositorios con estado en memoria no necesitan serlo
- Constructor injection siempre

### Room
- SQLCipher para encriptación (ya configurado)
- DAOs con suspend functions
- Flow para queries observables
- Migrations para schema changes

### WorkManager
- Workers para sync background y report delivery
- Constraints para network connectivity
- Retry policies configurados

## Git Workflow

```
develop
  └── refactor/android-quick-wins      ← Phase 3
  └── refactor/android-critical-fixes  ← Phase 4
  └── refactor/android-god-classes     ← Phase 7
```

- Cada fase en su rama desde `develop`
- Sub-tareas en ramas cortas: `feat/android-remove-runblocking`
- PRs pequeños (< 400 líneas)
- CI: `./gradlew test` + `./gradlew lint` deben pasar

## Feature Flags (Firebase Remote Config)

```kotlin
val useNewResultsScreen = firebaseRemoteConfig.getBoolean("use_new_results_screen")
if (useNewResultsScreen) {
    ResultsScreenV2()
} else {
    ResultsScreenV1()
}
```

Deploy: internal testing → closed testing → gradual rollout (20% → 50% → 100%).

## File Ownership

Tú eres responsable de TODO en `CotejoApp/app/src/main/java/com/akit/app/`.
- NO modificar `apps/api/` ni `apps/web/`
- Coordinar con `akit-api-refactor` para cambios en API contracts
- Coordinar con `akit-web-refactor` para shared contract types

## Anti-Patterns to Enforce

❌ `runBlocking` — usar suspend functions con timeout
❌ `CoroutineScope` sin cancelación — usar lifecycle-aware scopes
❌ `FirebaseAuth.getInstance()` directo — usar instancia inyectada
❌ Todo `@Singleton` — usar scopes apropiados
❌ Use cases pass-through — inyectar repositorio directo en ViewModel
❌ `Resource<T>` sellado sin usar — eliminar código muerto
❌ Enums duplicados — una sola fuente de verdad
❌ `Int` para spacing en Compose — usar `Dp`
❌ God ViewModels (> 200 líneas) — split por responsabilidad
❌ NavGraph con lógica de negocio — solo definir rutas
❌ `console.log` — usar `Log` o Timber
